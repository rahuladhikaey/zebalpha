import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch {
    // Fallback to Bearer token
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }
  return null;
}

async function resolveSellerContext(user: { id: string; email?: string | null }) {
  let q = supabaseServer.from("sellers").select("*");
  if (user.email && user.email.trim()) {
    q = q.or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
  } else {
    q = q.or(`user_id.eq.${user.id},id.eq.${user.id}`);
  }
  const { data: seller } = await q.maybeSingle();
  const primarySellerId = String(seller?.id || user.id);
  const sellerIds = Array.from(
    new Set([seller?.id, seller?.user_id, user.id].filter(Boolean) as string[])
  );
  const storeName = String(
    seller?.business_name ||
      seller?.shop_name ||
      seller?.owner_name ||
      seller?.full_name ||
      (user.email ? user.email.split("@")[0] : "ZebAlpha Seller")
  );
  const phone = String(seller?.mobile_number || seller?.phone_number || "");
  const email = String(seller?.email || user.email || "");
  return { primarySellerId, sellerIds, storeName, phone, email };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const keyId = (
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      ""
    ).trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay is not configured on seller server yet. Add RAZORPAY_KEY_ID, NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in zebalpha-seller environment variables.",
        },
        { status: 503 }
      );
    }

    const ctx = await resolveSellerContext(user);
    const body = await req.json().catch(() => ({}));

    const enrollmentIds: string[] = Array.isArray(body.enrollmentIds)
      ? body.enrollmentIds.map((x: unknown) => String(x || "").trim()).filter(Boolean)
      : body.enrollmentId
      ? [String(body.enrollmentId).trim()]
      : [];

    const purpose: "new_shoot_150" | "upgrade_50" =
      body.purpose === "upgrade_50" ? "upgrade_50" : "new_shoot_150";
    const durationDays = Math.min(30, Math.max(7, Number(body.durationDays || 7)));
    const upgradeMode =
      body.upgradeMode === "upgrade_with_product_150" ? "upgrade_with_product_150" : "renew";

    if (enrollmentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one campaign enrollment ID is required." },
        { status: 400 }
      );
    }

    // Verify seller ownership of all requested campaigns
    const { data: ownedEnrollments, error: ownErr } = await supabaseServer
      .from("seller_influencer_enrollments")
      .select("id, product_name, payment_status, payment_due_at, plan_type")
      .in("id", enrollmentIds)
      .in("seller_id", ctx.sellerIds);

    if (ownErr || !Array.isArray(ownedEnrollments) || ownedEnrollments.length === 0) {
      return NextResponse.json(
        { success: false, error: "Matching campaign enrollment(s) not found for your store." },
        { status: 404 }
      );
    }

    const validIds = ownedEnrollments.map((e: Record<string, unknown>) => String(e.id));

    // Authoritative server-side amount calculation (never trusted from client!)
    // - New Apply (With Product Studio Shoot): ₹150 per catalog
    // - Upgrade / Reactivate Link: ₹50 flat per campaign
    const amountInr = purpose === "upgrade_50" ? 50 * validIds.length : 150 * validIds.length;
    const amountPaise = Math.round(amountInr * 100);
    const receipt = `inf_${purpose === "upgrade_50" ? "upg" : "new"}_${Date.now()}`.slice(0, 40);

    const authBasic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authBasic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: {
          seller_id: ctx.primarySellerId,
          store_name: ctx.storeName,
          purpose,
          enrollment_count: String(validIds.length),
          duration_days: String(durationDays),
        },
      }),
    });

    const rzpJson = await rzpRes.json().catch(() => ({}));
    if (!rzpRes.ok || !rzpJson?.id) {
      console.error("[Razorpay Marketing Create Order] API error:", rzpJson);
      return NextResponse.json(
        {
          success: false,
          error:
            rzpJson?.error?.description || "Unable to create Razorpay payment order right now.",
        },
        { status: 502 }
      );
    }

    const razorpayOrderId = String(rzpJson.id);
    const nowIso = new Date().toISOString();
    const defaultDueIso = new Date(Date.now() + 3 * 86_400_000).toISOString();

    // Persist authoritative payment transaction for signature verification & idempotency
    const { error: txErr } = await supabaseServer.from("influencer_payment_transactions").insert({
      seller_id: ctx.primarySellerId,
      enrollment_ids: validIds,
      purpose,
      amount_inr: amountInr,
      duration_days: durationDays,
      upgrade_mode: purpose === "upgrade_50" ? upgradeMode : null,
      razorpay_order_id: razorpayOrderId,
      status: "created",
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (txErr) {
      console.error("[Razorpay Marketing Create Order] DB transaction insert error:", txErr);
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment ledger table not initialized yet. Please run supabase/upgrade_alpha_media_razorpay_and_dualgate.sql in Supabase SQL Editor.",
        },
        { status: 503 }
      );
    }

    // Link razorpay_order_id and ensure 3-day payment deadline is saved if checkout is dismissed
    for (const enr of ownedEnrollments as Array<Record<string, unknown>>) {
      await supabaseServer
        .from("seller_influencer_enrollments")
        .update({
          payment_method: "razorpay",
          razorpay_order_id: razorpayOrderId,
          pending_payment_amount_inr: purpose === "upgrade_50" ? 50 : 150,
          pending_payment_purpose: purpose,
          pending_extension_days: durationDays,
          pending_upgrade_mode: purpose === "upgrade_50" ? upgradeMode : null,
          payment_due_at: enr.payment_due_at ? String(enr.payment_due_at) : defaultDueIso,
          updated_at: nowIso,
        })
        .eq("id", String(enr.id));
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrderId,
      amountPaise,
      amountInr,
      currency: "INR",
      keyId,
      purpose,
      description:
        purpose === "upgrade_50"
          ? `Alpha Media Link Reactivation / Upgrade (+${durationDays} Days)`
          : `Alpha Media Studio Shoot (${validIds.length} Catalog${validIds.length > 1 ? "s" : ""})`,
      seller: {
        name: ctx.storeName,
        email: ctx.email,
        phone: ctx.phone,
      },
    });
  } catch (err) {
    console.error("[API /seller/marketing/razorpay/create-order] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to initiate Razorpay checkout." },
      { status: 500 }
    );
  }
}

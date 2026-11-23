import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  try {
    const generated = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const genBuf = Buffer.from(generated, "utf-8");
    const sigBuf = Buffer.from(signature, "utf-8");
    if (genBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch {
    return false;
  }
}

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
  return { primarySellerId, sellerIds, storeName };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Razorpay secret key is not configured on server." },
        { status: 503 }
      );
    }

    const ctx = await resolveSellerContext(user);
    const body = await req.json().catch(() => ({}));
    const razorpay_order_id = String(body.razorpay_order_id || "").trim();
    const razorpay_payment_id = String(body.razorpay_payment_id || "").trim();
    const razorpay_signature = String(body.razorpay_signature || "").trim();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing Razorpay payment verification parameters." },
        { status: 400 }
      );
    }

    // 1. Strict constant-time HMAC-SHA256 verification
    const validSig = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );
    if (!validSig) {
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay payment signature." },
        { status: 400 }
      );
    }

    // 2. Fetch authoritative server-side transaction record
    const { data: tx, error: txErr } = await supabaseServer
      .from("influencer_payment_transactions")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (txErr || !tx) {
      return NextResponse.json(
        { success: false, error: "Payment order record not found." },
        { status: 404 }
      );
    }

    if (!ctx.sellerIds.includes(String(tx.seller_id))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized payment verification attempt." },
        { status: 403 }
      );
    }

    // Idempotency guard: already verified
    if (tx.status === "paid") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purpose: tx.purpose,
        message: "Payment already verified and applied!",
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    await supabaseServer
      .from("influencer_payment_transactions")
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: "paid",
        paid_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", tx.id);

    const enrollmentIds: string[] = Array.isArray(tx.enrollment_ids)
      ? tx.enrollment_ids.map((x: unknown) => String(x))
      : [];

    const { data: enrollments } = await supabaseServer
      .from("seller_influencer_enrollments")
      .select("*")
      .in("id", enrollmentIds);

    const rows = (Array.isArray(enrollments) ? enrollments : []) as Array<Record<string, unknown>>;
    const purpose = String(tx.purpose || "new_shoot_150");
    const durationDays = Math.min(30, Math.max(7, Number(tx.duration_days || 7)));
    const upgradeMode = String(tx.upgrade_mode || "renew");

    let reactivatedRefCode: string | null = null;

    for (const enr of rows) {
      const enrId = String(enr.id);

      if (purpose === "new_shoot_150") {
        // Gate 1 Complete! Check Gate 2 (Sample Delivery) to see if ready for Media Leader immediately
        const sampleReady = ["sample_received", "in_shoot", "shoot_completed", "kept_at_studio"].includes(
          String(enr.sample_status || "")
        );
        const nextWorkflow = sampleReady ? "accepted" : "awaiting_review";

        await supabaseServer
          .from("seller_influencer_enrollments")
          .update({
            payment_method: "razorpay",
            payment_status: "paid",
            payment_ref: razorpay_payment_id,
            razorpay_order_id,
            razorpay_payment_id,
            paid_at: nowIso,
            payment_due_at: null,
            pending_payment_amount_inr: 0,
            pending_payment_purpose: null,
            workflow_status: nextWorkflow,
            updated_at: nowIso,
          })
          .eq("id", enrId);

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enrId,
          seller_id: ctx.primarySellerId,
          product_id: String(enr.product_id || ""),
          product_name: String(enr.product_name || "Catalog"),
          event_type: "payment_verified",
          to_plan: String(enr.plan_type || "with_product_150"),
          fee_charged_inr: 150,
          duration_days: 7,
          actor_user_id: user.id,
          actor_role: "SELLER",
          actor_name: ctx.storeName,
          notes: sampleReady
            ? `₹150 paid via Razorpay (${razorpay_payment_id}) + Product already delivered — unlocked for Alpha Media shoot!`
            : `₹150 paid via Razorpay (${razorpay_payment_id}) — waiting for physical product delivery to Alpha Studio`,
          metadata: { razorpay_order_id, razorpay_payment_id, sample_ready: sampleReady },
        });
      } else {
        // purpose === "upgrade_50": Instant same-link reactivation / upgrade for ₹50!
        const isUpgradeToStudio = upgradeMode === "upgrade_with_product_150";
        const targetPlan = isUpgradeToStudio
          ? "with_product_150"
          : String(enr.plan_type || "without_product_1pct");
        const existingExpMs = enr.expires_at ? new Date(String(enr.expires_at)).getTime() : 0;
        const baseMs = existingExpMs > now.getTime() ? existingExpMs : now.getTime();
        const newExpiresAt = new Date(baseMs + durationDays * 86_400_000).toISOString();
        const nextRenewalCount = Number(enr.renewal_count || 0) + 1;

        const updateFields: Record<string, unknown> = {
          plan_type: targetPlan,
          commission_rate: targetPlan === "with_product_150" ? 0 : 1,
          fixed_fee_inr: Number(enr.fixed_fee_inr || 0) + 50,
          payment_method: "razorpay",
          payment_status: "paid",
          payment_ref: razorpay_payment_id,
          razorpay_order_id,
          razorpay_payment_id,
          paid_at: nowIso,
          payment_due_at: null,
          pending_payment_amount_inr: 0,
          pending_payment_purpose: null,
          status: "active",
          workflow_status: "live",
          starts_at: enr.starts_at ? String(enr.starts_at) : nowIso,
          expires_at: newExpiresAt,
          link_duration_days: durationDays,
          renewal_count: nextRenewalCount,
          updated_at: nowIso,
        };

        if (isUpgradeToStudio) {
          updateFields.sample_status =
            enr.sample_status === "kept_at_studio" || enr.sample_status === "sample_received"
              ? "sample_received"
              : "awaiting_sample";
          updateFields.auto_attach_video_proof = true;
        }

        await supabaseServer
          .from("seller_influencer_enrollments")
          .update(updateFields)
          .eq("id", enrId);

        const { data: links } = await supabaseServer
          .from("influencer_creator_links")
          .select("id, ref_code, renewal_count")
          .eq("enrollment_id", enrId);

        let firstLinkId: string | null = null;
        if (Array.isArray(links) && links.length > 0) {
          firstLinkId = String(links[0].id);
          reactivatedRefCode = String(links[0].ref_code);
          for (const l of links) {
            await supabaseServer
              .from("influencer_creator_links")
              .update({
                status: "active",
                plan_type: targetPlan,
                commission_rate: targetPlan === "with_product_150" ? 0 : 1,
                starts_at: enr.starts_at ? String(enr.starts_at) : nowIso,
                expires_at: newExpiresAt,
                renewal_count: Number(l.renewal_count || 0) + 1,
                last_reactivated_at: nowIso,
                updated_at: nowIso,
              })
              .eq("id", l.id);
          }
        }

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enrId,
          link_id: firstLinkId,
          seller_id: ctx.primarySellerId,
          product_id: String(enr.product_id || ""),
          product_name: String(enr.product_name || "Catalog"),
          event_type: isUpgradeToStudio ? "upgraded" : "renewed",
          from_plan: String(enr.plan_type || "without_product_1pct"),
          to_plan: targetPlan,
          fee_charged_inr: 50,
          duration_days: durationDays,
          actor_user_id: user.id,
          actor_role: "SELLER",
          actor_name: ctx.storeName,
          notes: `₹50 paid via Razorpay (${razorpay_payment_id}) — link ${
            reactivatedRefCode || ""
          } reactivated immediately for +${durationDays} days`,
          metadata: {
            razorpay_order_id,
            razorpay_payment_id,
            new_expires_at: newExpiresAt,
            ref_code: reactivatedRefCode,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      purpose,
      paymentId: razorpay_payment_id,
      refCode: reactivatedRefCode,
      message:
        purpose === "upgrade_50"
          ? `₹50 Razorpay payment verified! Link (${reactivatedRefCode || "INF"}) is ACTIVE immediately for +${durationDays} days.`
          : `₹150 Razorpay payment verified (${razorpay_payment_id})! Once your product sample is delivered to Alpha Studio, our Media Team will proceed immediately.`,
    });
  } catch (err) {
    console.error("[API /seller/marketing/razorpay/verify] Error:", err);
    return NextResponse.json(
      { success: false, error: "Payment verification failed on server." },
      { status: 500 }
    );
  }
}

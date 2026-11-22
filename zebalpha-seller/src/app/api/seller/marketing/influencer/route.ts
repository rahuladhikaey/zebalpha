import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const storeName =
    seller?.business_name ||
    seller?.shop_name ||
    seller?.owner_name ||
    seller?.full_name ||
    (user.email ? user.email.split("@")[0] : "Seller");
  const phone = String(seller?.mobile_number || seller?.phone_number || "");
  const hasUpi = Boolean(
    String(seller?.upi_id || seller?.phonepay_no || seller?.phonepay_number || "").trim()
  );
  const hasEnrolment = Boolean(String(seller?.gstin || "").trim());

  return { primarySellerId, sellerIds, storeName, phone, hasUpi, hasEnrolment };
}

function isMissingTableError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || "").toLowerCase();
  const code = String((err as { code?: string })?.code || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveSellerContext(user);

    const [prodRes, enrollRes, linksRes, callbackRes] = await Promise.all([
      supabaseServer
        .from("products")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseServer
        .from("seller_influencer_enrollments")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("updated_at", { ascending: false }),
      supabaseServer
        .from("influencer_creator_links")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("created_at", { ascending: false }),
      supabaseServer
        .from("seller_marketing_callbacks")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .eq("topic", "influencer_marketing")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const migrationRequired =
      isMissingTableError(enrollRes.error) ||
      isMissingTableError(linksRes.error) ||
      isMissingTableError(callbackRes.error);

    const products = (Array.isArray(prodRes.data) ? prodRes.data : [])
      .filter((p: Record<string, unknown>) => {
        const st = String(p.status || "").toUpperCase();
        return (
          p.is_active !== false &&
          !["DELETED", "BLOCKED", "ARCHIVED", "REJECTED", "DRAFT"].includes(st)
        );
      })
      .map((p: Record<string, unknown>) => ({
        id: String(p.id),
        name: String(p.name || "Untitled Catalog"),
        sku: String(p.sku || `CAT-${String(p.id).slice(0, 8).toUpperCase()}`),
        price: Number(p.price || 0),
        stock: Number(p.stock ?? p.stock_count ?? 10),
        image_url:
          (typeof p.image_url === "string" && p.image_url.trim()) ||
          (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : null),
      }));

    const enrollments: Array<Record<string, unknown>> =
      !enrollRes.error && Array.isArray(enrollRes.data)
        ? (enrollRes.data as Array<Record<string, unknown>>)
        : [];
    const creatorLinks: Array<Record<string, unknown>> =
      !linksRes.error && Array.isArray(linksRes.data)
        ? (linksRes.data as Array<Record<string, unknown>>)
        : [];
    const callbacks: Array<Record<string, unknown>> =
      !callbackRes.error && Array.isArray(callbackRes.data)
        ? (callbackRes.data as Array<Record<string, unknown>>)
        : [];

    const summary = {
      activeCatalogs: enrollments.filter((e) => e.status === "active").length,
      pausedCatalogs: enrollments.filter((e) => e.status === "paused").length,
      liveVideos: creatorLinks.filter((l) => l.status === "active" && Boolean(l.video_url)).length,
      totalClicks: enrollments.reduce((s: number, e) => s + Number(e.total_clicks || 0), 0),
      totalOrders: enrollments.reduce((s: number, e) => s + Number(e.total_orders || 0), 0),
      deliveredOrders: enrollments.reduce((s: number, e) => s + Number(e.delivered_orders || 0), 0),
      deliveredGmv: enrollments.reduce((s: number, e) => s + Number(e.delivered_gmv || 0), 0),
      commissionAccrued: enrollments.reduce((s: number, e) => s + Number(e.commission_accrued || 0), 0),
    };

    return NextResponse.json({
      success: true,
      migrationRequired,
      seller: {
        id: ctx.primarySellerId,
        storeName: ctx.storeName,
        phone: ctx.phone,
        hasUpi: ctx.hasUpi,
        hasEnrolment: ctx.hasEnrolment,
      },
      summary,
      products,
      enrollments,
      creatorLinks,
      callbacks,
    });
  } catch (err) {
    console.error("[API /seller/marketing/influencer GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load influencer marketing data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveSellerContext(user);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (action === "enroll_catalogs") {
      const productIds: string[] = Array.isArray(body.productIds)
        ? body.productIds.map((x: unknown) => String(x || "").trim()).filter(Boolean)
        : [];
      const commissionRate = Math.min(15, Math.max(0.5, Number(body.commissionRate ?? 0.5)));
      const maxBudgetCap =
        body.maxBudgetCap !== undefined && body.maxBudgetCap !== null && String(body.maxBudgetCap).trim() !== ""
          ? Math.max(100, Number(body.maxBudgetCap))
          : null;

      if (productIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "Please select at least 1 catalog to enroll." },
          { status: 400 }
        );
      }

      const { data: ownedProducts } = await supabaseServer
        .from("products")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .in("id", productIds);

      const validProducts = Array.isArray(ownedProducts) ? ownedProducts : [];
      if (validProducts.length === 0) {
        return NextResponse.json(
          { success: false, error: "No eligible catalogs found for your store." },
          { status: 404 }
        );
      }

      const rows = validProducts.map((p: Record<string, unknown>) => ({
        seller_id: ctx.primarySellerId,
        product_id: String(p.id),
        product_name: String(p.name || "Catalog"),
        product_image:
          (typeof p.image_url === "string" && p.image_url.trim()) ||
          (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : null),
        product_price: Number(p.price || 0),
        commission_rate: commissionRate,
        max_budget_cap: maxBudgetCap,
        status: "active",
        updated_at: new Date().toISOString(),
      }));

      const { data: upserted, error: upErr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .upsert(rows, { onConflict: "seller_id,product_id" })
        .select("*");

      if (upErr) {
        if (isMissingTableError(upErr)) {
          return NextResponse.json(
            {
              success: false,
              migrationRequired: true,
              error:
                "Marketing database tables are not initialized yet. Please run supabase/add_seller_marketing_and_branding_system.sql in Supabase SQL Editor.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
      }

      // Auto-create a default Alpha Media shareable creator link if none exists for this product
      const createdEnrollments = Array.isArray(upserted) ? upserted : [];
      for (const enr of createdEnrollments) {
        try {
          const { data: existingLink } = await supabaseServer
            .from("influencer_creator_links")
            .select("id")
            .eq("seller_id", ctx.primarySellerId)
            .eq("product_id", enr.product_id)
            .limit(1)
            .maybeSingle();

          if (!existingLink) {
            const refCode = `INF-${String(enr.product_id).slice(0, 4).toUpperCase()}-${Math.floor(
              1000 + Math.random() * 9000
            )}`;
            await supabaseServer.from("influencer_creator_links").insert({
              enrollment_id: enr.id,
              seller_id: ctx.primarySellerId,
              product_id: enr.product_id,
              creator_name: "Alpha Media Creator Pool",
              creator_handle: "@zebalpha_official",
              platform: "instagram",
              ref_code: refCode,
              commission_rate: commissionRate,
              status: "active",
            });
          }
        } catch {
          // Non-fatal
        }
      }

      return NextResponse.json({
        success: true,
        enrolledCount: createdEnrollments.length,
        message: `${createdEnrollments.length} catalog(s) enrolled in Influencer Marketing at ${commissionRate}% commission!`,
      });
    }

    if (action === "update_enrollment") {
      const enrollmentId = String(body.enrollmentId || "").trim();
      if (!enrollmentId) {
        return NextResponse.json({ success: false, error: "Enrollment ID required" }, { status: 400 });
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.status && ["active", "paused", "ended"].includes(String(body.status))) {
        updates.status = String(body.status);
      }
      if (body.commissionRate !== undefined) {
        updates.commission_rate = Math.min(15, Math.max(0.5, Number(body.commissionRate)));
      }

      const { error: updErr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .update(updates)
        .eq("id", enrollmentId)
        .in("seller_id", ctx.sellerIds);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Influencer campaign updated." });
    }

    if (action === "request_callback") {
      const phone = String(body.phone || ctx.phone || "").replace(/\D/g, "").slice(-10);
      const notes = String(body.notes || "").trim().slice(0, 400);
      if (phone.length < 10) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid 10-digit mobile number for callback." },
          { status: 400 }
        );
      }

      const { error: cbErr } = await supabaseServer.from("seller_marketing_callbacks").insert({
        seller_id: ctx.primarySellerId,
        seller_name: ctx.storeName,
        phone,
        topic: "influencer_marketing",
        notes: notes || "Seller requested Influencer Marketing callback",
        status: "pending",
      });

      if (cbErr) {
        if (isMissingTableError(cbErr)) {
          return NextResponse.json(
            {
              success: false,
              migrationRequired: true,
              error:
                "Marketing tables not initialized yet. Run supabase/add_seller_marketing_and_branding_system.sql first.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: cbErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Callback request sent! Our Alpha Media & Seller Support team will call you shortly.",
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported marketing action" }, { status: 400 });
  } catch (err) {
    console.error("[API /seller/marketing/influencer POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

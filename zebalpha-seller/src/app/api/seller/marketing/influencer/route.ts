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

function isMissingSchemaError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || "").toLowerCase();
  const code = String((err as { code?: string })?.code || "");
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the")
  );
}

function computeEffectiveState(row: Record<string, unknown>): Record<string, unknown> {
  const nowMs = Date.now();
  const rawStatus = String(row.status || "pending");
  const rawWorkflow = String(row.workflow_status || (rawStatus === "active" ? "live" : rawStatus));
  const expiresAt = row.expires_at ? String(row.expires_at) : null;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const isTimeExpired =
    expiresMs !== null && !Number.isNaN(expiresMs) && expiresMs <= nowMs;

  const isExpired =
    rawStatus === "expired" ||
    rawWorkflow === "expired" ||
    (rawStatus === "active" && isTimeExpired);

  const effectiveStatus = isExpired ? "expired" : rawStatus;
  const effectiveWorkflow = isExpired ? "expired" : rawWorkflow;

  const paymentStatus = String(row.payment_status || "not_required");
  const paymentDueAt = row.payment_due_at ? String(row.payment_due_at) : null;
  const paymentDueMs = paymentDueAt ? new Date(paymentDueAt).getTime() : null;
  const isPaymentPending = paymentStatus === "pending";
  const isPaymentOverdue =
    isPaymentPending && paymentDueMs !== null && !Number.isNaN(paymentDueMs) && paymentDueMs <= nowMs;

  const planType = String(row.plan_type || "without_product_1pct");
  const sampleStatus = String(row.sample_status || "not_required");
  const sampleDelivered = ["sample_received", "in_shoot", "shoot_completed", "kept_at_studio"].includes(
    sampleStatus
  );
  const paymentComplete = ["paid", "waived"].includes(paymentStatus);
  const dualGateReady = planType !== "with_product_150" || (paymentComplete && sampleDelivered);

  return {
    ...row,
    plan_type: planType,
    fixed_fee_inr: Number(row.fixed_fee_inr || 0),
    pending_payment_amount_inr: Number(row.pending_payment_amount_inr || 0),
    pending_payment_purpose: row.pending_payment_purpose ? String(row.pending_payment_purpose) : null,
    pending_extension_days: Number(row.pending_extension_days || 7),
    pending_upgrade_mode: row.pending_upgrade_mode ? String(row.pending_upgrade_mode) : null,
    sample_status: sampleStatus,
    payment_status: paymentStatus,
    payment_due_at: paymentDueAt,
    is_payment_pending: isPaymentPending,
    is_payment_overdue: isPaymentOverdue,
    dual_gate_ready: dualGateReady,
    missed_clicks_after_expiry: Number(row.missed_clicks_after_expiry || 0),
    renewal_count: Number(row.renewal_count || 0),
    effective_status: effectiveStatus,
    effective_workflow: effectiveWorkflow,
    is_expired: isExpired,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveSellerContext(user);

    const [prodRes, enrollRes, linksRes, callbackRes, auditRes, txRes] = await Promise.all([
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
      supabaseServer
        .from("influencer_campaign_audit_logs")
        .select("*")
        .in("seller_id", ctx.sellerIds)
        .order("created_at", { ascending: false })
        .limit(60),
      supabaseServer
        .from("influencer_payment_transactions")
        .select("id")
        .in("seller_id", ctx.sellerIds)
        .limit(1),
    ]);

    const migrationRequired =
      isMissingSchemaError(enrollRes.error) ||
      isMissingSchemaError(linksRes.error) ||
      isMissingSchemaError(callbackRes.error);

    const upgradeMigrationRequired =
      isMissingSchemaError(auditRes.error) || isMissingSchemaError(txRes.error);

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

    const rawEnrollments: Array<Record<string, unknown>> =
      !enrollRes.error && Array.isArray(enrollRes.data)
        ? (enrollRes.data as Array<Record<string, unknown>>)
        : [];
    const enrollments = rawEnrollments.map(computeEffectiveState);

    const rawLinks: Array<Record<string, unknown>> =
      !linksRes.error && Array.isArray(linksRes.data)
        ? (linksRes.data as Array<Record<string, unknown>>)
        : [];
    const creatorLinks: Array<Record<string, unknown>> = rawLinks.map((lnk): Record<string, unknown> => {
      const expiresAt = lnk.expires_at ? String(lnk.expires_at) : null;
      const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
      const isExpired =
        lnk.status === "expired" ||
        (lnk.status === "active" &&
          expiresMs !== null &&
          !Number.isNaN(expiresMs) &&
          expiresMs <= Date.now());
      return {
        ...lnk,
        effective_status: isExpired ? "expired" : String(lnk.status || "pending"),
        is_expired: isExpired,
        missed_clicks_after_expiry: Number(lnk.missed_clicks_after_expiry || 0),
        renewal_count: Number(lnk.renewal_count || 0),
      };
    });

    const callbacks: Array<Record<string, unknown>> =
      !callbackRes.error && Array.isArray(callbackRes.data)
        ? (callbackRes.data as Array<Record<string, unknown>>)
        : [];

    const auditLogs: Array<Record<string, unknown>> =
      !auditRes.error && Array.isArray(auditRes.data)
        ? (auditRes.data as Array<Record<string, unknown>>)
        : [];

    const summary = {
      activeCatalogs: enrollments.filter((e) => e.effective_status === "active").length,
      inQueueCatalogs: enrollments.filter(
        (e) =>
          e.effective_status === "pending" ||
          [
            "awaiting_payment",
            "awaiting_review",
            "accepted",
            "assigned",
            "in_production",
            "submitted_for_review",
            "revision_needed",
          ].includes(String(e.effective_workflow))
      ).length,
      paymentPendingCount: enrollments.filter((e) => Boolean(e.is_payment_pending)).length,
      paymentOverdueCount: enrollments.filter((e) => Boolean(e.is_payment_overdue)).length,
      expiredCatalogs: enrollments.filter((e) => e.effective_status === "expired").length,
      pausedCatalogs: enrollments.filter((e) => e.effective_status === "paused").length,
      liveVideos: creatorLinks.filter((l) => l.effective_status === "active" && Boolean(l.video_url)).length,
      totalClicks: enrollments.reduce((s: number, e) => s + Number(e.total_clicks || 0), 0),
      missedClicks: enrollments.reduce((s: number, e) => s + Number(e.missed_clicks_after_expiry || 0), 0),
      totalOrders: enrollments.reduce((s: number, e) => s + Number(e.total_orders || 0), 0),
      deliveredOrders: enrollments.reduce((s: number, e) => s + Number(e.delivered_orders || 0), 0),
      deliveredGmv: enrollments.reduce((s: number, e) => s + Number(e.delivered_gmv || 0), 0),
      commissionAccrued: enrollments.reduce((s: number, e) => s + Number(e.commission_accrued || 0), 0),
    };

    return NextResponse.json({
      success: true,
      migrationRequired,
      upgradeMigrationRequired,
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
      auditLogs,
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

      const planType =
        body.planType === "with_product_150" ? "with_product_150" : "without_product_1pct";
      const isWithProduct = planType === "with_product_150";
      const paymentTiming = body.paymentTiming === "pay_now" ? "pay_now" : "pay_within_3_days";
      const commissionRate = isWithProduct ? 0 : 1;
      const fixedFeeInr = isWithProduct ? 150 : 0;
      const sampleReturnPreference = "non_returnable";

      const maxBudgetCap =
        !isWithProduct &&
        body.maxBudgetCap !== undefined &&
        body.maxBudgetCap !== null &&
        String(body.maxBudgetCap).trim() !== ""
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

      const now = new Date();
      const nowIso = now.toISOString();
      const dueIso = new Date(now.getTime() + 3 * 86_400_000).toISOString(); // Exact 3-day payment window

      const rows = validProducts.map((p: Record<string, unknown>) => ({
        seller_id: ctx.primarySellerId,
        seller_store_name: ctx.storeName,
        product_id: String(p.id),
        product_name: String(p.name || "Catalog"),
        product_image:
          (typeof p.image_url === "string" && p.image_url.trim()) ||
          (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : null),
        product_price: Number(p.price || 0),
        campaign_source: "seller",
        plan_type: planType,
        commission_rate: commissionRate,
        fixed_fee_inr: fixedFeeInr,
        payment_method: isWithProduct ? "razorpay" : "commission_only",
        payment_status: isWithProduct ? "pending" : "not_required",
        payment_due_at: isWithProduct ? dueIso : null,
        pending_payment_amount_inr: isWithProduct ? 150 : 0,
        pending_payment_purpose: isWithProduct ? "new_shoot_150" : null,
        sample_status: isWithProduct ? "awaiting_sample" : "not_required",
        sample_return_preference: isWithProduct ? sampleReturnPreference : null,
        max_budget_cap: maxBudgetCap,
        status: "pending",
        workflow_status: isWithProduct ? "awaiting_payment" : "awaiting_review",
        link_duration_days: 7,
        auto_attach_video_proof: isWithProduct,
        updated_at: nowIso,
      }));

      const { data: upserted, error: upErr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .upsert(rows, { onConflict: "seller_id,product_id" })
        .select("*");

      if (upErr) {
        if (isMissingSchemaError(upErr)) {
          return NextResponse.json(
            {
              success: false,
              upgradeMigrationRequired: true,
              error:
                "Please run supabase/upgrade_alpha_media_razorpay_and_dualgate.sql in Supabase SQL Editor first.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
      }

      const createdEnrollments = (Array.isArray(upserted) ? upserted : []) as Array<
        Record<string, unknown>
      >;
      const createdEnrollmentIds = createdEnrollments.map((e) => String(e.id));

      for (const enr of createdEnrollments) {
        try {
          const { data: existingLink } = await supabaseServer
            .from("influencer_creator_links")
            .select("id")
            .eq("seller_id", ctx.primarySellerId)
            .eq("product_id", String(enr.product_id))
            .limit(1)
            .maybeSingle();

          let linkId = existingLink?.id || null;
          if (!existingLink) {
            const refCode = `INF-${String(enr.product_id)
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 4)
              .toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const { data: insertedLink } = await supabaseServer
              .from("influencer_creator_links")
              .insert({
                enrollment_id: enr.id,
                seller_id: ctx.primarySellerId,
                product_id: enr.product_id,
                campaign_source: "seller",
                plan_type: planType,
                creator_name: "Alpha Media Studio Queue",
                creator_handle: "@zebalpha_official",
                platform: "instagram",
                ref_code: refCode,
                commission_rate: commissionRate,
                status: "pending",
              })
              .select("id")
              .maybeSingle();
            linkId = insertedLink?.id || null;
          }

          await supabaseServer.from("influencer_campaign_audit_logs").insert({
            enrollment_id: enr.id,
            link_id: linkId,
            seller_id: ctx.primarySellerId,
            product_id: enr.product_id,
            product_name: enr.product_name,
            event_type: "created",
            to_plan: planType,
            fee_charged_inr: 0,
            duration_days: 7,
            actor_user_id: user.id,
            actor_role: "SELLER",
            actor_name: ctx.storeName,
            notes: isWithProduct
              ? paymentTiming === "pay_now"
                ? "Enrolled in With Product + ₹150 — launching secure online checkout (3-day deadline fallback active)"
                : "Enrolled in With Product + ₹150 — Pay Within 3 Days selected (Payment Pending until paid online)"
              : "Enrolled in Without Product + 1% (7 Days) — sent to Alpha Media Leader queue",
          });
        } catch {
          // Non-fatal
        }
      }

      return NextResponse.json({
        success: true,
        enrolledCount: createdEnrollments.length,
        createdEnrollmentIds,
        requiresRazorpayNow: isWithProduct && paymentTiming === "pay_now",
        message: isWithProduct
          ? paymentTiming === "pay_now"
            ? "Opening secure checkout for ₹150 studio shoot..."
            : `${createdEnrollments.length} catalog(s) saved! Complete ₹150 online payment within 3 days + deliver your product sample so Alpha Media can proceed.`
          : `${createdEnrollments.length} catalog(s) sent to Alpha Media Leader queue under Without Product + 1% (7 Days)!`,
      });
    }

    // Deferred ₹50 Upgrade / Reactivate ("Pay Within 3 Days") — keeps link locked until Razorpay ₹50 completes!
    if (action === "schedule_upgrade_pay_later" || action === "renew_or_upgrade") {
      const enrollmentId = String(body.enrollmentId || "").trim();
      const mode =
        body.mode === "upgrade_with_product_150" ? "upgrade_with_product_150" : "renew";
      const durationDays = Math.min(30, Math.max(7, Number(body.durationDays || 7)));

      if (!enrollmentId) {
        return NextResponse.json({ success: false, error: "Enrollment ID required" }, { status: 400 });
      }

      const { data: enr, error: fetchErr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .in("seller_id", ctx.sellerIds)
        .maybeSingle();

      if (fetchErr || !enr) {
        return NextResponse.json({ success: false, error: "Campaign not found." }, { status: 404 });
      }

      const nowIso = new Date().toISOString();
      const dueIso = new Date(Date.now() + 3 * 86_400_000).toISOString();

      const { error: updErr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .update({
          payment_method: "razorpay",
          payment_status: "pending",
          payment_due_at: dueIso,
          pending_payment_amount_inr: 50,
          pending_payment_purpose: "upgrade_50",
          pending_extension_days: durationDays,
          pending_upgrade_mode: mode,
          updated_at: nowIso,
        })
        .eq("id", enrollmentId);

      if (updErr) {
        if (isMissingSchemaError(updErr)) {
          return NextResponse.json(
            {
              success: false,
              upgradeMigrationRequired: true,
              error:
                "Please run supabase/upgrade_alpha_media_razorpay_and_dualgate.sql in Supabase SQL Editor first.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      try {
        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enr.id,
          seller_id: ctx.primarySellerId,
          product_id: enr.product_id,
          product_name: enr.product_name,
          event_type: mode === "upgrade_with_product_150" ? "upgraded" : "renewed",
          from_plan: String(enr.plan_type || "without_product_1pct"),
          to_plan:
            mode === "upgrade_with_product_150"
              ? "with_product_150"
              : String(enr.plan_type || "without_product_1pct"),
          fee_charged_inr: 0,
          duration_days: durationDays,
          actor_user_id: user.id,
          actor_role: "SELLER",
          actor_name: ctx.storeName,
          notes: `₹50 Upgrade / Reactivation (+${durationDays}d) saved with Pay Within 3 Days — link stays deactivated until ₹50 online payment completes`,
          metadata: { payment_due_at: dueIso, pending_amount_inr: 50 },
        });
      } catch {
        // Non-fatal
      }

      return NextResponse.json({
        success: true,
        paymentDueAt: dueIso,
        message: `₹50 upgrade request saved (Payment Pending — Pay online within 3 days to reactivate your link for +${durationDays} days).`,
      });
    }

    if (action === "update_enrollment") {
      const enrollmentId = String(body.enrollmentId || "").trim();
      if (!enrollmentId) {
        return NextResponse.json({ success: false, error: "Enrollment ID required" }, { status: 400 });
      }

      const nextStatus = ["active", "paused", "ended"].includes(String(body.status))
        ? String(body.status)
        : null;
      if (!nextStatus) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }

      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .update({
          status: nextStatus,
          workflow_status: nextStatus === "paused" ? "paused" : "live",
          updated_at: nowIso,
        })
        .eq("id", enrollmentId)
        .in("seller_id", ctx.sellerIds);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      await supabaseServer
        .from("influencer_creator_links")
        .update({ status: nextStatus, updated_at: nowIso })
        .eq("enrollment_id", enrollmentId)
        .in("seller_id", ctx.sellerIds);

      return NextResponse.json({
        success: true,
        message: `Influencer campaign ${nextStatus === "active" ? "resumed" : "paused"}.`,
      });
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
        notes: notes || "Seller requested Alpha Media Influencer Marketing callback",
        status: "pending",
      });

      if (cbErr) {
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

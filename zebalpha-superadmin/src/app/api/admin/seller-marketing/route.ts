import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

function isMissingSchema(err: unknown): boolean {
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

export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    const [brandRes, enrollRes, linksRes, cbRes, auditRes, creatorsRes, txRes, storeSellersRes, brandTxRes] =
      await Promise.all([
        supabaseServer
          .from("seller_branding_campaigns")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(120),
        supabaseServer
          .from("seller_influencer_enrollments")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(200),
        supabaseServer
          .from("influencer_creator_links")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250),
        supabaseServer
          .from("seller_marketing_callbacks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabaseServer
          .from("influencer_campaign_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250),
        supabaseServer
          .from("media_creator_profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(150),
        supabaseServer
          .from("influencer_payment_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(150),
        supabaseServer
          .from("sellers")
          .select(
            "id, business_name, email, phone, city, state, store_slug, store_tagline, store_pass_plan, store_pass_status, store_pass_starts_at, store_pass_expires_at, store_pass_renewal_count, store_search_count, store_visit_count, missed_store_searches, missed_store_visits, store_slug_blocked, store_slug_block_reason"
          )
          .order("store_pass_expires_at", { ascending: false, nullsFirst: false })
          .limit(250),
        supabaseServer
          .from("seller_branding_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    const migrationRequired =
      isMissingSchema(brandRes.error) ||
      isMissingSchema(enrollRes.error) ||
      isMissingSchema(linksRes.error) ||
      isMissingSchema(cbRes.error);

    const upgradeMigrationRequired =
      isMissingSchema(auditRes.error) ||
      isMissingSchema(creatorsRes.error) ||
      isMissingSchema(txRes.error);

    const brandingUpgradeRequired =
      isMissingSchema(storeSellersRes.error) || isMissingSchema(brandTxRes.error);

    const brandingCampaigns: Array<Record<string, unknown>> =
      !brandRes.error && Array.isArray(brandRes.data)
        ? (brandRes.data as Array<Record<string, unknown>>)
        : [];
    const storePassSellers: Array<Record<string, unknown>> =
      !storeSellersRes.error && Array.isArray(storeSellersRes.data)
        ? (storeSellersRes.data as Array<Record<string, unknown>>)
        : [];
    const brandingTransactions: Array<Record<string, unknown>> =
      !brandTxRes.error && Array.isArray(brandTxRes.data)
        ? (brandTxRes.data as Array<Record<string, unknown>>)
        : [];

    const influencerEnrollments: Array<Record<string, unknown>> =
      !enrollRes.error && Array.isArray(enrollRes.data)
        ? (enrollRes.data as Array<Record<string, unknown>>)
        : [];
    const creatorLinks: Array<Record<string, unknown>> =
      !linksRes.error && Array.isArray(linksRes.data)
        ? (linksRes.data as Array<Record<string, unknown>>)
        : [];
    const mediaCreators: Array<Record<string, unknown>> =
      !creatorsRes.error && Array.isArray(creatorsRes.data)
        ? (creatorsRes.data as Array<Record<string, unknown>>)
        : [];
    const paymentTransactions: Array<Record<string, unknown>> =
      !txRes.error && Array.isArray(txRes.data)
        ? (txRes.data as Array<Record<string, unknown>>)
        : [];

    const nowMs = Date.now();
    const activeLinks = creatorLinks.filter((l) => {
      const exp = l.expires_at ? new Date(String(l.expires_at)).getTime() : null;
      return l.status === "active" && (exp === null || Number.isNaN(exp) || exp > nowMs);
    }).length;
    const expiredLinks = creatorLinks.filter((l) => {
      const exp = l.expires_at ? new Date(String(l.expires_at)).getTime() : null;
      return (
        l.status === "expired" ||
        (l.status === "active" && exp !== null && !Number.isNaN(exp) && exp <= nowMs)
      );
    }).length;

    const paymentPendingCount = influencerEnrollments.filter(
      (e) => String(e.payment_status || "") === "pending"
    ).length;
    const paymentOverdueCount = influencerEnrollments.filter((e) => {
      if (String(e.payment_status || "") !== "pending" || !e.payment_due_at) return false;
      return new Date(String(e.payment_due_at)).getTime() <= nowMs;
    }).length;

    const summary = {
      totalFixedFeesInr: influencerEnrollments
        .filter((e) => ["paid", "deducted"].includes(String(e.payment_status || "")))
        .reduce((s, e) => s + Number(e.fixed_fee_inr || 0), 0),
      totalCommissionAccrued: influencerEnrollments.reduce(
        (s, e) => s + Number(e.commission_accrued || 0),
        0
      ),
      activeLinks,
      expiredLinks,
      paymentPendingCount,
      paymentOverdueCount,
      totalMissedClicks: influencerEnrollments.reduce(
        (s, e) => s + Number(e.missed_clicks_after_expiry || 0),
        0
      ),
      pendingCreatorApps: mediaCreators.filter((c) => c.approval_status === "pending").length,
    };

    const activeStorePasses = storePassSellers.filter((s) => {
      if (s.store_slug_blocked) return false;
      const exp = s.store_pass_expires_at ? new Date(String(s.store_pass_expires_at)).getTime() : 0;
      return String(s.store_pass_status || "") === "active" && exp > nowMs;
    }).length;
    const expiredStorePasses = storePassSellers.filter((s) => {
      const exp = s.store_pass_expires_at ? new Date(String(s.store_pass_expires_at)).getTime() : 0;
      return (
        String(s.store_pass_status || "") === "expired" ||
        (String(s.store_pass_status || "") === "active" && exp > 0 && exp <= nowMs)
      );
    }).length;

    const appAdRevenueInr = brandingTransactions
      .filter((t) => t.track_type === "app_ad" && t.status === "verified")
      .reduce((sum, t) => sum + Number(t.amount_inr || 0), 0);
    const storePassRevenueInr = brandingTransactions
      .filter((t) => t.track_type === "store_pass" && t.status === "verified")
      .reduce((sum, t) => sum + Number(t.amount_inr || 0), 0);

    const brandingSummary = {
      appAdRevenueInr,
      storePassRevenueInr,
      activeStorePasses,
      expiredStorePasses,
      totalStoreSearches: storePassSellers.reduce((s, r) => s + Number(r.store_search_count || 0), 0),
      totalStoreVisits: storePassSellers.reduce((s, r) => s + Number(r.store_visit_count || 0), 0),
      totalMissedStoreSearches: storePassSellers.reduce(
        (s, r) => s + Number(r.missed_store_searches || 0),
        0
      ),
      totalMissedStoreVisits: storePassSellers.reduce(
        (s, r) => s + Number(r.missed_store_visits || 0),
        0
      ),
      pendingAppAds: brandingCampaigns.filter(
        (c) => c.placement_type !== "store_search" && c.approval_status === "pending_review"
      ).length,
    };

    return NextResponse.json({
      success: true,
      migrationRequired,
      upgradeMigrationRequired,
      brandingUpgradeRequired,
      summary,
      brandingSummary,
      brandingCampaigns,
      storePassSellers,
      brandingTransactions,
      influencerEnrollments,
      creatorLinks,
      callbacks: !cbRes.error && Array.isArray(cbRes.data) ? cbRes.data : [],
      auditLogs: !auditRes.error && Array.isArray(auditRes.data) ? auditRes.data : [],
      mediaCreators,
      paymentTransactions,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err?.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Seller Marketing GET] Error:", error);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load seller marketing data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const adminSession = await requireSuperAdmin(req);
    const adminUserId: string | null = null;
    const adminEmail = String(adminSession?.user || "SuperAdmin");
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const nowIso = new Date().toISOString();

    // 1. DIRECT INVITE-ONLY MEDIA ACCOUNT CREATION
    if (action === "create_media_account") {
      const fullName = String(body.fullName || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();
      const phone = String(body.phone || "").replace(/\D/g, "").slice(-10) || null;
      const city = String(body.city || "").trim() || null;
      const instagramHandle = String(body.instagramHandle || "").trim() || null;
      const youtubeHandle = String(body.youtubeHandle || "").trim() || null;
      const niche = String(body.niche || "Fashion & Streetwear").trim();
      const roleType = ["MEDIA_LEADER", "MEDIA_CREATOR", "INFLUENCER"].includes(String(body.roleType))
        ? String(body.roleType)
        : "MEDIA_CREATOR";

      if (!fullName || !email || password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Full Name, Email, and Password (min 6 chars) are required." },
          { status: 400 }
        );
      }

      let targetUserId: string | null = null;
      const { data: createdAuth, error: authErr } = await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: roleType,
        },
      });

      if (authErr) {
        const { data: listed } = await supabaseServer.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = (listed?.users || []).find(
          (u: { email?: string; id: string }) => (u.email || "").toLowerCase() === email
        );
        if (!existing) {
          return NextResponse.json({ success: false, message: authErr.message }, { status: 400 });
        }
        targetUserId = existing.id;
        await supabaseServer.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      } else {
        targetUserId = createdAuth.user?.id || null;
      }

      if (!targetUserId) {
        return NextResponse.json(
          { success: false, message: "Unable to resolve created auth user ID." },
          { status: 500 }
        );
      }

      const { error: memErr } = await supabaseServer.from("user_app_memberships").upsert(
        {
          user_id: targetUserId,
          app_name: "media",
          role: roleType,
          is_active: true,
          granted_by: adminUserId,
          updated_at: nowIso,
        },
        { onConflict: "user_id,app_name" }
      );
      if (memErr) {
        return NextResponse.json({ success: false, message: memErr.message }, { status: 500 });
      }

      const { error: profErr } = await supabaseServer.from("media_creator_profiles").upsert(
        {
          user_id: targetUserId,
          full_name: fullName,
          email,
          phone,
          city,
          instagram_handle: instagramHandle,
          youtube_handle: youtubeHandle,
          niche,
          role_type: roleType,
          onboarding_source: "admin_invite",
          approval_status: "approved",
          approved_by: adminUserId,
          approved_at: nowIso,
          is_active: true,
          updated_at: nowIso,
        },
        { onConflict: "email" }
      );
      if (profErr) {
        return NextResponse.json({ success: false, message: profErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${roleType} account created for ${fullName}! Ready to log into media.zebalpha.shop/login.`,
        credentials: {
          fullName,
          email,
          password,
          roleType,
          loginUrl: "https://media.zebalpha.shop/login",
        },
      });
    }

    // 2. APPROVE / CHANGE ROLE / SUSPEND CREATOR PROFILE
    if (action === "manage_creator") {
      const profileId = String(body.profileId || "").trim();
      const operation = String(body.operation || "").trim();
      if (!profileId) {
        return NextResponse.json({ success: false, message: "Profile ID required" }, { status: 400 });
      }

      const { data: profile } = await supabaseServer
        .from("media_creator_profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ success: false, message: "Creator profile not found" }, { status: 404 });
      }

      if (operation === "approve") {
        const nextRole = ["MEDIA_LEADER", "MEDIA_CREATOR", "INFLUENCER"].includes(String(body.roleType))
          ? String(body.roleType)
          : String(profile.role_type || "INFLUENCER");

        await supabaseServer
          .from("media_creator_profiles")
          .update({
            role_type: nextRole,
            approval_status: "approved",
            rejection_reason: null,
            approved_by: adminUserId,
            approved_at: nowIso,
            is_active: true,
            updated_at: nowIso,
          })
          .eq("id", profileId);

        if (profile.user_id) {
          await supabaseServer.from("user_app_memberships").upsert(
            {
              user_id: profile.user_id,
              app_name: "media",
              role: nextRole,
              is_active: true,
              granted_by: adminUserId,
              updated_at: nowIso,
            },
            { onConflict: "user_id,app_name" }
          );
        }
        return NextResponse.json({
          success: true,
          message: `${profile.full_name} approved as ${nextRole}!`,
        });
      }

      if (operation === "reject") {
        await supabaseServer
          .from("media_creator_profiles")
          .update({
            approval_status: "rejected",
            rejection_reason: String(body.reason || "Rejected by SuperAdmin"),
            is_active: false,
            updated_at: nowIso,
          })
          .eq("id", profileId);
        return NextResponse.json({ success: true, message: "Creator application rejected." });
      }

      if (operation === "set_role") {
        const nextRole = ["MEDIA_LEADER", "MEDIA_CREATOR", "INFLUENCER"].includes(String(body.roleType))
          ? String(body.roleType)
          : "INFLUENCER";
        await supabaseServer
          .from("media_creator_profiles")
          .update({ role_type: nextRole, updated_at: nowIso })
          .eq("id", profileId);
        if (profile.user_id) {
          await supabaseServer
            .from("user_app_memberships")
            .update({ role: nextRole, updated_at: nowIso })
            .eq("user_id", profile.user_id)
            .eq("app_name", "media");
        }
        return NextResponse.json({
          success: true,
          message: `Updated ${profile.full_name}'s role to ${nextRole}.`,
        });
      }

      if (operation === "toggle_active") {
        const nextActive = !Boolean(profile.is_active);
        await supabaseServer
          .from("media_creator_profiles")
          .update({
            is_active: nextActive,
            approval_status: nextActive ? "approved" : "suspended",
            updated_at: nowIso,
          })
          .eq("id", profileId);
        if (profile.user_id) {
          await supabaseServer
            .from("user_app_memberships")
            .update({ is_active: nextActive, updated_at: nowIso })
            .eq("user_id", profile.user_id)
            .eq("app_name", "media");
        }
        return NextResponse.json({
          success: true,
          message: nextActive ? "Creator access restored." : "Creator access suspended.",
        });
      }
    }

    // 3. VERIFY PENDING PAYMENT (₹150 New Shoot OR ₹50 Upgrade Override)
    if (action === "verify_plan_payment") {
      const enrollmentId = String(body.enrollmentId || "").trim();
      if (!enrollmentId) {
        return NextResponse.json({ success: false, message: "Enrollment ID required" }, { status: 400 });
      }
      const { data: enr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .maybeSingle();

      if (!enr) {
        return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
      }

      const isUpgrade50 =
        String(enr.pending_payment_purpose || "") === "upgrade_50" ||
        Number(enr.pending_payment_amount_inr || 0) === 50;

      if (isUpgrade50) {
        const durationDays = Math.min(30, Math.max(7, Number(enr.pending_extension_days || 7)));
        const now = new Date();
        const existingExpMs = enr.expires_at ? new Date(String(enr.expires_at)).getTime() : 0;
        const baseMs = existingExpMs > now.getTime() ? existingExpMs : now.getTime();
        const newExpiresAt = new Date(baseMs + durationDays * 86_400_000).toISOString();

        await supabaseServer
          .from("seller_influencer_enrollments")
          .update({
            payment_status: "paid",
            paid_at: nowIso,
            payment_due_at: null,
            pending_payment_amount_inr: 0,
            pending_payment_purpose: null,
            fixed_fee_inr: Number(enr.fixed_fee_inr || 0) + 50,
            status: "active",
            workflow_status: "live",
            starts_at: enr.starts_at || nowIso,
            expires_at: newExpiresAt,
            renewal_count: Number(enr.renewal_count || 0) + 1,
            updated_at: nowIso,
          })
          .eq("id", enrollmentId);

        await supabaseServer
          .from("influencer_creator_links")
          .update({
            status: "active",
            starts_at: enr.starts_at || nowIso,
            expires_at: newExpiresAt,
            last_reactivated_at: nowIso,
            updated_at: nowIso,
          })
          .eq("enrollment_id", enrollmentId);

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enr.id,
          seller_id: enr.seller_id,
          product_id: enr.product_id,
          product_name: enr.product_name,
          event_type: "payment_verified",
          to_plan: enr.plan_type,
          fee_charged_inr: 50,
          duration_days: durationDays,
          actor_user_id: adminUserId,
          actor_role: "SUPER_ADMIN",
          actor_name: adminEmail,
          notes: `SuperAdmin verified ₹50 upgrade payment & reactivated link for +${durationDays} days`,
        });

        return NextResponse.json({
          success: true,
          message: `₹50 upgrade payment verified & link reactivated for +${durationDays} days!`,
        });
      }

      const sampleReady = ["sample_received", "in_shoot", "shoot_completed", "kept_at_studio"].includes(
        String(enr.sample_status || "")
      );
      const nextWorkflow = sampleReady ? "accepted" : "awaiting_review";

      await supabaseServer
        .from("seller_influencer_enrollments")
        .update({
          payment_status: "paid",
          paid_at: nowIso,
          payment_due_at: null,
          pending_payment_amount_inr: 0,
          pending_payment_purpose: null,
          workflow_status: nextWorkflow,
          updated_at: nowIso,
        })
        .eq("id", enrollmentId);

      await supabaseServer.from("influencer_campaign_audit_logs").insert({
        enrollment_id: enr.id,
        seller_id: enr.seller_id,
        product_id: enr.product_id,
        product_name: enr.product_name,
        event_type: "payment_verified",
        to_plan: enr.plan_type,
        fee_charged_inr: Number(enr.fixed_fee_inr || 150),
        actor_user_id: adminUserId,
        actor_role: "SUPER_ADMIN",
        actor_name: adminEmail,
        notes: sampleReady
          ? "SuperAdmin verified ₹150 payment + Product delivered — unlocked for Alpha Media shoot"
          : "SuperAdmin verified ₹150 payment — awaiting physical product delivery to Alpha Studio",
      });

      return NextResponse.json({
        success: true,
        message: sampleReady
          ? "₹150 payment verified & Dual-Gate unlocked for Media Team!"
          : "₹150 payment verified! Media unlocks once product sample delivery is confirmed.",
      });
    }

    // 4. SUPERADMIN MASTER OVERRIDE ON ANY CAMPAIGN
    if (action === "admin_override_campaign") {
      const enrollmentId = String(body.enrollmentId || "").trim();
      const overrideAction = String(body.overrideAction || "").trim();
      const durationDays = Math.min(60, Math.max(1, Number(body.durationDays || 7)));

      const { data: enr } = await supabaseServer
        .from("seller_influencer_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .maybeSingle();

      if (!enr) {
        return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
      }

      if (overrideAction === "accept") {
        const sampleReceived = Boolean(body.sampleReceived);
        const nextSample =
          enr.plan_type === "with_product_150" && sampleReceived
            ? "sample_received"
            : enr.sample_status;
        const paidOk =
          enr.plan_type !== "with_product_150" || ["paid", "waived"].includes(String(enr.payment_status || ""));
        const nextWorkflow = paidOk ? "accepted" : "awaiting_payment";

        await supabaseServer
          .from("seller_influencer_enrollments")
          .update({
            workflow_status: nextWorkflow,
            sample_status: nextSample,
            accepted_by: adminUserId,
            accepted_by_name: `${adminEmail} (SuperAdmin)`,
            accepted_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", enrollmentId);

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enr.id,
          seller_id: enr.seller_id,
          product_id: enr.product_id,
          product_name: enr.product_name,
          event_type: sampleReceived ? "sample_received" : "accepted",
          to_plan: enr.plan_type,
          actor_user_id: adminUserId,
          actor_role: "SUPER_ADMIN",
          actor_name: adminEmail,
          notes: sampleReceived
            ? paidOk
              ? "SuperAdmin confirmed product delivery + payment verified — ready for shoot"
              : "SuperAdmin confirmed product delivery — still awaiting ₹150 online payment"
            : "SuperAdmin accepted campaign into Alpha Media queue",
        });

        return NextResponse.json({
          success: true,
          message: sampleReceived && !paidOk
            ? "Product delivery confirmed! Still waiting for seller's ₹150 online payment."
            : "Campaign updated by SuperAdmin override.",
        });
      }

      if (overrideAction === "activate_extend_7d") {
        const now = new Date();
        const existingExpMs = enr.expires_at ? new Date(String(enr.expires_at)).getTime() : 0;
        const baseMs = existingExpMs > now.getTime() ? existingExpMs : now.getTime();
        const newExpiresAt = new Date(baseMs + durationDays * 86_400_000).toISOString();

        await supabaseServer
          .from("seller_influencer_enrollments")
          .update({
            status: "active",
            workflow_status: "live",
            starts_at: enr.starts_at || nowIso,
            expires_at: newExpiresAt,
            approved_by: adminUserId,
            approved_by_name: `${adminEmail} (SuperAdmin)`,
            approved_at: enr.approved_at || nowIso,
            updated_at: nowIso,
          })
          .eq("id", enrollmentId);

        await supabaseServer
          .from("influencer_creator_links")
          .update({
            status: "active",
            starts_at: enr.starts_at || nowIso,
            expires_at: newExpiresAt,
            last_reactivated_at: nowIso,
            updated_at: nowIso,
          })
          .eq("enrollment_id", enrollmentId);

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enr.id,
          seller_id: enr.seller_id,
          product_id: enr.product_id,
          product_name: enr.product_name,
          event_type: "admin_override",
          to_plan: enr.plan_type,
          duration_days: durationDays,
          actor_user_id: adminUserId,
          actor_role: "SUPER_ADMIN",
          actor_name: adminEmail,
          notes: `SuperAdmin force-activated / extended campaign link by +${durationDays} days`,
        });

        return NextResponse.json({
          success: true,
          message: `Campaign link is LIVE for +${durationDays} days!`,
        });
      }

      if (overrideAction === "force_deactivate") {
        await supabaseServer
          .from("seller_influencer_enrollments")
          .update({
            status: "expired",
            workflow_status: "expired",
            expires_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", enrollmentId);

        await supabaseServer
          .from("influencer_creator_links")
          .update({
            status: "expired",
            expires_at: nowIso,
            updated_at: nowIso,
          })
          .eq("enrollment_id", enrollmentId);

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enr.id,
          seller_id: enr.seller_id,
          product_id: enr.product_id,
          product_name: enr.product_name,
          event_type: "expired",
          to_plan: enr.plan_type,
          actor_user_id: adminUserId,
          actor_role: "SUPER_ADMIN",
          actor_name: adminEmail,
          notes: "SuperAdmin force-deactivated / expired campaign link",
        });

        return NextResponse.json({
          success: true,
          message: "Campaign link deactivated (marked expired). Seller can reactivate anytime for ₹50 online.",
        });
      }
    }

    // 5. EXISTING BRANDING & CALLBACK ACTIONS
    if (action === "approve_branding") {
      const campaignId = String(body.campaignId || "").trim();
      const durationDays = Math.max(1, Number(body.durationDays || 7));
      if (!campaignId) {
        return NextResponse.json({ success: false, message: "Campaign ID required" }, { status: 400 });
      }
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + durationDays * 86_400_000);

      const { error } = await supabaseServer
        .from("seller_branding_campaigns")
        .update({
          approval_status: "live",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          rejection_reason: null,
          updated_at: nowIso,
        })
        .eq("id", campaignId);

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Branding campaign is now LIVE on ZebAlpha!" });
    }

    if (action === "reject_branding") {
      const campaignId = String(body.campaignId || "").trim();
      const reason = String(body.reason || "Did not meet visual/quality guidelines").trim();
      if (!campaignId) {
        return NextResponse.json({ success: false, message: "Campaign ID required" }, { status: 400 });
      }

      const { error } = await supabaseServer
        .from("seller_branding_campaigns")
        .update({
          approval_status: "rejected",
          rejection_reason: reason,
          updated_at: nowIso,
        })
        .eq("id", campaignId);

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Branding campaign rejected." });
    }

    if (action === "assign_creator_link") {
      const enrollmentId = String(body.enrollmentId || "").trim();
      const sellerId = String(body.sellerId || "").trim();
      const productId = String(body.productId || "").trim();
      const creatorName = String(body.creatorName || "Alpha Media Creator").trim();
      const creatorHandle = String(body.creatorHandle || "").trim();
      const assignedCreatorId = body.assignedCreatorId ? String(body.assignedCreatorId).trim() : null;
      const platform = ["instagram", "youtube", "facebook", "zebalpha_app"].includes(String(body.platform))
        ? String(body.platform)
        : "instagram";
      const videoUrl = String(body.videoUrl || "").trim();
      const commissionRate = Number(body.commissionRate ?? 1);
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + 7 * 86_400_000);

      if (!sellerId || !productId) {
        return NextResponse.json(
          { success: false, message: "Seller ID and Product ID required" },
          { status: 400 }
        );
      }

      const cleanPrefix =
        creatorName
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 4)
          .toUpperCase() || "CREA";
      const refCode = `INF-${cleanPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabaseServer
        .from("influencer_creator_links")
        .insert({
          enrollment_id: enrollmentId || null,
          seller_id: sellerId,
          product_id: productId,
          assigned_creator_id: assignedCreatorId,
          creator_name: creatorName,
          creator_handle: creatorHandle || null,
          platform,
          video_url: videoUrl || null,
          ref_code: refCode,
          commission_rate: commissionRate,
          status: "active",
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          published_by: adminUserId,
          published_by_name: `${adminEmail} (SuperAdmin)`,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      if (enrollmentId) {
        await supabaseServer
          .from("seller_influencer_enrollments")
          .update({
            status: "active",
            workflow_status: "live",
            assigned_creator_id: assignedCreatorId,
            assigned_creator_name: creatorName,
            assigned_creator_handle: creatorHandle || null,
            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: nowIso,
          })
          .eq("id", enrollmentId);

        await supabaseServer.from("influencer_campaign_audit_logs").insert({
          enrollment_id: enrollmentId,
          link_id: data.id,
          seller_id: sellerId,
          product_id: productId,
          event_type: "published_live",
          duration_days: 7,
          actor_user_id: adminUserId,
          actor_role: "SUPER_ADMIN",
          actor_name: adminEmail,
          notes: `SuperAdmin assigned ${creatorName} & activated 7-day link ${refCode}`,
        });
      }

      return NextResponse.json({
        success: true,
        link: data,
        message: `7-Day Creator tracking link live (/go/${refCode})!`,
      });
    }

    if (action === "update_callback") {
      const callbackId = String(body.callbackId || "").trim();
      const status = ["pending", "contacted", "resolved"].includes(String(body.status))
        ? String(body.status)
        : "contacted";

      const { error } = await supabaseServer
        .from("seller_marketing_callbacks")
        .update({ status, updated_at: nowIso })
        .eq("id", callbackId);

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Callback marked as ${status}.` });
    }

    // 6. STORE SEARCH & MINI-STOREFRONT PASS MASTER ADMIN CONTROLS
    if (action === "manage_store_pass") {
      const sellerId = String(body.sellerId || "").trim();
      const operation = String(body.operation || "").trim();
      if (!sellerId) {
        return NextResponse.json({ success: false, message: "Seller ID required" }, { status: 400 });
      }

      const { data: sellerRow } = await supabaseServer
        .from("sellers")
        .select("id, business_name, store_slug, store_pass_status, store_pass_starts_at, store_pass_expires_at, store_pass_renewal_count")
        .eq("id", sellerId)
        .maybeSingle();

      if (!sellerRow) {
        return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
      }

      if (operation === "extend_18d" || operation === "extend_28d") {
        const days = operation === "extend_28d" ? 28 : 18;
        const pkgKey = days === 28 ? "store_search_59_28d" : "store_search_49_18d";
        const now = Date.now();
        const currentExp = sellerRow.store_pass_expires_at
          ? new Date(String(sellerRow.store_pass_expires_at)).getTime()
          : 0;
        const baseMs =
          sellerRow.store_pass_status === "active" && currentExp > now ? currentExp : now;
        const nextExpiryIso = new Date(baseMs + days * 86_400_000).toISOString();

        const { error: updErr } = await supabaseServer
          .from("sellers")
          .update({
            store_pass_plan: pkgKey,
            store_pass_status: "active",
            store_pass_starts_at: sellerRow.store_pass_starts_at || nowIso,
            store_pass_expires_at: nextExpiryIso,
            store_pass_renewal_count: Number(sellerRow.store_pass_renewal_count || 0) + 1,
            store_slug_blocked: false,
            updated_at: nowIso,
          })
          .eq("id", sellerId);

        if (updErr) {
          return NextResponse.json({ success: false, message: updErr.message }, { status: 500 });
        }

        try {
          await supabaseServer.from("seller_branding_transactions").insert({
            seller_id: sellerId,
            store_name: String(sellerRow.business_name || "Seller"),
            package_key: pkgKey,
            track_type: "store_pass",
            amount_inr: 0,
            duration_days: days,
            payment_method: "online_checkout",
            status: "verified",
            notes: `SuperAdmin (${adminEmail}) extended Store Search Pass by +${days} days`,
          });
        } catch {
          // Ignore if ledger table missing
        }

        return NextResponse.json({
          success: true,
          message: `Store Search & Mini-Storefront Pass extended by +${days} days for ${sellerRow.business_name || "Seller"}!`,
        });
      }

      if (operation === "force_expire") {
        const { error: updErr } = await supabaseServer
          .from("sellers")
          .update({
            store_pass_status: "expired",
            store_pass_expires_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", sellerId);

        if (updErr) {
          return NextResponse.json({ success: false, message: updErr.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Store Search Pass deactivated for ${sellerRow.business_name || "Seller"}. PDP store link & Mini-Storefront are now paused.`,
        });
      }

      if (operation === "block_slug" || operation === "unblock_slug") {
        const blocked = operation === "block_slug";
        const reason = blocked
          ? String(body.reason || "Restricted by ZebAlpha Admin policy review").trim()
          : null;

        const { error: updErr } = await supabaseServer
          .from("sellers")
          .update({
            store_slug_blocked: blocked,
            store_slug_block_reason: reason,
            updated_at: nowIso,
          })
          .eq("id", sellerId);

        if (updErr) {
          return NextResponse.json({ success: false, message: updErr.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: blocked
            ? `Storefront slug /store/${sellerRow.store_slug} blocked immediately.`
            : `Storefront slug /store/${sellerRow.store_slug} unblocked.`,
        });
      }

      return NextResponse.json({ success: false, message: "Invalid store pass operation" }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err?.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Seller Marketing POST] Error:", error);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to update seller marketing" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

function isMissingTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || "").toLowerCase();
  const code = String((err as { code?: string })?.code || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    const [brandRes, enrollRes, linksRes, cbRes] = await Promise.all([
      supabaseServer
        .from("seller_branding_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseServer
        .from("seller_influencer_enrollments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),
      supabaseServer
        .from("influencer_creator_links")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),
      supabaseServer
        .from("seller_marketing_callbacks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const migrationRequired =
      isMissingTable(brandRes.error) ||
      isMissingTable(enrollRes.error) ||
      isMissingTable(linksRes.error) ||
      isMissingTable(cbRes.error);

    return NextResponse.json({
      success: true,
      migrationRequired,
      brandingCampaigns: !brandRes.error && Array.isArray(brandRes.data) ? brandRes.data : [],
      influencerEnrollments: !enrollRes.error && Array.isArray(enrollRes.data) ? enrollRes.data : [],
      creatorLinks: !linksRes.error && Array.isArray(linksRes.data) ? linksRes.data : [],
      callbacks: !cbRes.error && Array.isArray(cbRes.data) ? cbRes.data : [],
    });
  } catch (error: any) {
    if (error?.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Seller Marketing GET] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load seller marketing data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

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
          updated_at: new Date().toISOString(),
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
          updated_at: new Date().toISOString(),
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
      const platform = ["instagram", "youtube", "facebook", "zebalpha_app"].includes(String(body.platform))
        ? String(body.platform)
        : "instagram";
      const videoUrl = String(body.videoUrl || "").trim();
      const commissionRate = Number(body.commissionRate || 0.5);

      if (!sellerId || !productId) {
        return NextResponse.json(
          { success: false, message: "Seller ID and Product ID required" },
          { status: 400 }
        );
      }

      const cleanPrefix = creatorName
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
          creator_name: creatorName,
          creator_handle: creatorHandle || null,
          platform,
          video_url: videoUrl || null,
          ref_code: refCode,
          commission_rate: commissionRate,
          status: "active",
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        link: data,
        message: `Creator tracking link created (${refCode})!`,
      });
    }

    if (action === "update_callback") {
      const callbackId = String(body.callbackId || "").trim();
      const status = ["pending", "contacted", "resolved"].includes(String(body.status))
        ? String(body.status)
        : "contacted";

      const { error } = await supabaseServer
        .from("seller_marketing_callbacks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", callbackId);

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Callback marked as ${status}.` });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    if (error?.name === "AuthError") return authErrorResponse(error);
    console.error("[Admin Seller Marketing POST] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update seller marketing" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventType = String(body.eventType || "").trim();
    const campaignId = body.campaignId ? String(body.campaignId).trim() : null;
    const refCode = body.refCode ? String(body.refCode).trim() : null;
    const productId = body.productId ? String(body.productId).trim() : null;
    const sessionId = body.sessionId ? String(body.sessionId).trim().slice(0, 80) : null;

    if (
      !["influencer_click", "branding_impression", "branding_click"].includes(eventType)
    ) {
      return NextResponse.json({ success: false, error: "Invalid eventType" }, { status: 400 });
    }

    if (eventType === "influencer_click" && refCode) {
      const { data: link } = await supabaseServer
        .from("influencer_creator_links")
        .select("id, enrollment_id, seller_id, product_id, clicks")
        .eq("ref_code", refCode)
        .eq("status", "active")
        .maybeSingle();

      if (link) {
        await Promise.allSettled([
          supabaseServer
            .from("influencer_creator_links")
            .update({ clicks: Number(link.clicks || 0) + 1 })
            .eq("id", link.id),
          link.enrollment_id
            ? (async () => {
                const { data: enr } = await supabaseServer
                  .from("seller_influencer_enrollments")
                  .select("total_clicks")
                  .eq("id", link.enrollment_id)
                  .maybeSingle();
                if (enr) {
                  await supabaseServer
                    .from("seller_influencer_enrollments")
                    .update({ total_clicks: Number(enr.total_clicks || 0) + 1 })
                    .eq("id", link.enrollment_id);
                }
              })()
            : Promise.resolve(),
          supabaseServer.from("seller_marketing_events").insert({
            event_type: "influencer_click",
            ref_code: refCode,
            seller_id: link.seller_id,
            product_id: productId || link.product_id,
            session_id: sessionId,
          }),
        ]);
      }
      return NextResponse.json({ success: true });
    }

    if ((eventType === "branding_impression" || eventType === "branding_click") && campaignId) {
      const { data: camp } = await supabaseServer
        .from("seller_branding_campaigns")
        .select("id, seller_id, impressions, clicks")
        .eq("id", campaignId)
        .maybeSingle();

      if (camp) {
        const updatePayload =
          eventType === "branding_impression"
            ? { impressions: Number(camp.impressions || 0) + 1 }
            : { clicks: Number(camp.clicks || 0) + 1 };

        await Promise.allSettled([
          supabaseServer
            .from("seller_branding_campaigns")
            .update(updatePayload)
            .eq("id", camp.id),
          supabaseServer.from("seller_marketing_events").insert({
            event_type: eventType,
            campaign_id: camp.id,
            seller_id: camp.seller_id,
            product_id: productId,
            session_id: sessionId,
          }),
        ]);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch {
    // Never break storefront UX for telemetry
    return NextResponse.json({ success: true });
  }
}

import { supabaseServer } from "@/lib/supabaseServer";

export async function recordOrderMarketingAttribution(params: {
  influencerRef?: string | null;
  brandingCampaignId?: string | null;
  orderId?: string | null;
  orderAmount: number;
  items?: Array<{ id?: string | number; product_id?: string | number; price?: number; quantity?: number }>;
}) {
  try {
    const refCode = params.influencerRef ? String(params.influencerRef).trim() : "";
    const brandingId = params.brandingCampaignId ? String(params.brandingCampaignId).trim() : "";
    const orderId = params.orderId ? String(params.orderId).trim() : null;
    const orderAmount = Number(params.orderAmount || 0);

    if (!refCode && !brandingId) return;

    const tasks: Promise<unknown>[] = [];

    if (refCode) {
      tasks.push(
        (async () => {
          const { data: link } = await supabaseServer
            .from("influencer_creator_links")
            .select(
              "id, enrollment_id, seller_id, product_id, status, expires_at, orders, gmv, commission_rate, commission_earned"
            )
            .eq("ref_code", refCode)
            .maybeSingle();

          if (!link) return;

          // Strictly enforce 7-day active link window
          const expiresMs = link.expires_at ? new Date(link.expires_at).getTime() : null;
          const isActive =
            link.status === "active" &&
            (expiresMs === null || Number.isNaN(expiresMs) || expiresMs > Date.now());

          if (!isActive) return;

          const rate = Number(link.commission_rate || 0);
          const commissionDelta = Math.round(orderAmount * (rate / 100) * 100) / 100;

          await Promise.allSettled([
            supabaseServer
              .from("influencer_creator_links")
              .update({
                orders: Number(link.orders || 0) + 1,
                gmv: Number(link.gmv || 0) + orderAmount,
                commission_earned: Number(link.commission_earned || 0) + commissionDelta,
              })
              .eq("id", link.id),
            link.enrollment_id
              ? (async () => {
                  const { data: enr } = await supabaseServer
                    .from("seller_influencer_enrollments")
                    .select("total_orders, commission_accrued")
                    .eq("id", link.enrollment_id)
                    .maybeSingle();
                  if (enr) {
                    await supabaseServer
                      .from("seller_influencer_enrollments")
                      .update({
                        total_orders: Number(enr.total_orders || 0) + 1,
                        commission_accrued: Number(enr.commission_accrued || 0) + commissionDelta,
                      })
                      .eq("id", link.enrollment_id);
                  }
                })()
              : Promise.resolve(),
            supabaseServer.from("seller_marketing_events").insert({
              event_type: "influencer_order",
              ref_code: refCode,
              seller_id: link.seller_id,
              product_id: link.product_id,
              order_id: orderId,
              order_amount: orderAmount,
            }),
          ]);
        })()
      );
    }

    if (brandingId) {
      tasks.push(
        (async () => {
          const { data: camp } = await supabaseServer
            .from("seller_branding_campaigns")
            .select("id, seller_id, attributed_orders, attributed_revenue")
            .eq("id", brandingId)
            .maybeSingle();

          if (!camp) return;

          await Promise.allSettled([
            supabaseServer
              .from("seller_branding_campaigns")
              .update({
                attributed_orders: Number(camp.attributed_orders || 0) + 1,
                attributed_revenue: Number(camp.attributed_revenue || 0) + orderAmount,
              })
              .eq("id", camp.id),
            supabaseServer.from("seller_marketing_events").insert({
              event_type: "branding_order",
              campaign_id: camp.id,
              seller_id: camp.seller_id,
              order_id: orderId,
              order_amount: orderAmount,
            }),
          ]);
        })()
      );
    }

    await Promise.allSettled(tasks);
  } catch {
    // Non-fatal: never block order confirmation
  }
}

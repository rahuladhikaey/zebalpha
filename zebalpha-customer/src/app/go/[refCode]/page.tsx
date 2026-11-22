import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, ShieldCheck, ShoppingBag } from "lucide-react";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GoRefPageProps {
  params: Promise<{ refCode: string }>;
}

export default async function InfluencerShortLinkPage({ params }: GoRefPageProps) {
  const { refCode: rawRef } = await params;
  const refCode = decodeURIComponent(String(rawRef || "")).trim();

  let redirectTarget: string | null = null;
  let linkState: "not_found" | "pending" | "expired" = "not_found";
  let creatorName = "Alpha Media Creator";

  if (refCode) {
    const { data: link } = await supabaseServer
      .from("influencer_creator_links")
      .select(
        "id, enrollment_id, seller_id, product_id, creator_name, status, clicks, missed_clicks_after_expiry, starts_at, expires_at"
      )
      .eq("ref_code", refCode)
      .maybeSingle();

    if (link) {
      creatorName = String(link.creator_name || "Alpha Media Creator");
      const nowMs = Date.now();
      const expiresMs = link.expires_at ? new Date(link.expires_at).getTime() : null;
      const isActive =
        link.status === "active" && (expiresMs === null || Number.isNaN(expiresMs) || expiresMs > nowMs);

      if (isActive && link.product_id) {
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
            product_id: link.product_id,
            session_id: `go_${Date.now()}`,
          }),
        ]);

        redirectTarget = `/products/${encodeURIComponent(String(link.product_id))}?ref=${encodeURIComponent(
          refCode
        )}&go_tracked=1`;
      } else if (link.status === "pending") {
        linkState = "pending";
      } else {
        linkState = "expired";

        // Increment missed clicks so Seller Panel shows live FOMO renewal cue
        await Promise.allSettled([
          supabaseServer
            .from("influencer_creator_links")
            .update({
              status: link.status === "active" ? "expired" : link.status,
              missed_clicks_after_expiry: Number(link.missed_clicks_after_expiry || 0) + 1,
            })
            .eq("id", link.id),
          link.enrollment_id
            ? (async () => {
                const { data: enr } = await supabaseServer
                  .from("seller_influencer_enrollments")
                  .select("missed_clicks_after_expiry, status, workflow_status")
                  .eq("id", link.enrollment_id)
                  .maybeSingle();
                if (enr) {
                  await supabaseServer
                    .from("seller_influencer_enrollments")
                    .update({
                      status: enr.status === "active" ? "expired" : enr.status,
                      workflow_status: enr.workflow_status === "live" ? "expired" : enr.workflow_status,
                      missed_clicks_after_expiry: Number(enr.missed_clicks_after_expiry || 0) + 1,
                    })
                    .eq("id", link.enrollment_id);
                }
              })()
            : Promise.resolve(),
          supabaseServer.from("seller_marketing_events").insert({
            event_type: "influencer_expired_click",
            ref_code: refCode,
            seller_id: link.seller_id,
            product_id: link.product_id,
            session_id: `go_exp_${Date.now()}`,
          }),
        ]);
      }
    }
  }

  // Call redirect OUTSIDE any try/catch so NEXT_REDIRECT is never swallowed
  if (redirectTarget) {
    redirect(redirectTarget);
  }

  const heading =
    linkState === "pending"
      ? "Creator Campaign Launching Soon"
      : linkState === "expired"
      ? "This 7-Day Creator Offer Has Ended"
      : "Creator Link Not Found";

  const subcopy =
    linkState === "pending"
      ? `${creatorName} is finalizing this Alpha Media drop. Explore trending styles on ZebAlpha while it goes live!`
      : linkState === "expired"
      ? `The 7-day influencer link (${refCode}) from ${creatorName} is currently paused. Don't worry — discover verified daily deals & fresh styles right here on ZebAlpha.`
      : `We couldn't find an active creator link for "${refCode}". Browse our latest curated collections on ZebAlpha.`;

  return (
    <main className="min-h-[80vh] bg-neutral-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
          <Clock className="h-7 w-7" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-700">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          ZebAlpha Alpha Media
        </span>

        <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">
          {heading}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{subcopy}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-neutral-800 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Explore Similar on ZebAlpha</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3.5 text-sm font-bold text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

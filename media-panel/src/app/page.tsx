"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  Megaphone,
  Share2,
  Plus,
  ExternalLink,
  Clapperboard,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function MediaDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    awaitingReview: 0,
    pendingApprovals: 0,
    liveLinks: 0,
    pendingCreators: 0,
    brandCampaigns: 0,
  });
  const [recentInfluencer, setRecentInfluencer] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        if (!auth.userId) {
          router.push("/login");
        } else {
          router.push("/unauthorized");
        }
        return;
      }
      setSession(auth);

      // Creators / Influencers go straight to their focused assigned shoots workspace
      if (!auth.isLeader) {
        router.replace("/my-shoots");
        return;
      }

      try {
        const [enrRes, creatorRes, campRes] = await Promise.all([
          supabase
            .from("seller_influencer_enrollments")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("media_creator_profiles")
            .select("id, approval_status")
            .eq("approval_status", "pending"),
          supabase.from("media_campaigns").select("id", { count: "exact", head: true }),
        ]);

        const rows = (Array.isArray(enrRes.data) ? enrRes.data : []) as Array<Record<string, unknown>>;
        const nowMs = Date.now();
        const awaitingReview = rows.filter((r) =>
          ["awaiting_review", "awaiting_payment"].includes(String(r.workflow_status || ""))
        ).length;
        const pendingApprovals = rows.filter(
          (r) => String(r.workflow_status || "") === "submitted_for_review"
        ).length;
        const liveLinks = rows.filter((r) => {
          const exp = r.expires_at ? new Date(String(r.expires_at)).getTime() : null;
          return r.status === "active" && (exp === null || exp > nowMs);
        }).length;

        setStats({
          awaitingReview,
          pendingApprovals,
          liveLinks,
          pendingCreators: Array.isArray(creatorRes.data) ? creatorRes.data.length : 0,
          brandCampaigns: campRes.count || 0,
        });
        setRecentInfluencer(rows.slice(0, 8));
      } catch (err) {
        console.error("Error loading leader overview:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400 font-medium">Verifying Alpha Media Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header
        title="Alpha Media Leader Command Center"
        description="Manage Seller Plan 1 (1%) & Plan 2 (₹150) shoots, ZebAlpha Own-Brand reels, and creator approvals"
      />

      <main className="p-8 space-y-8">
        {/* Top Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/20">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Alpha Media Studio: @zebalpha_official
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Leader Mode
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Accept seller requests, confirm ₹150 samples, assign shoots to creators, and start 7-day smart links.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://www.instagram.com/zebalpha_official?psln=MW5jZHU3YjF0M2x3eg=="
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white text-xs font-medium flex items-center gap-2 transition-colors border border-dark-700"
            >
              <span>Instagram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/influencer-queue"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Open Influencer Queue</span>
            </Link>
          </div>
        </div>

        {/* Live Alpha Media KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/influencer-queue"
            className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-amber-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Awaiting Accept</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.awaitingReview}</div>
            <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <span>Review &amp; assign creators</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <Link
            href="/influencer-queue"
            className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Reels Ready for Review</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Clapperboard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingApprovals}</div>
            <div className="text-[11px] text-purple-400 mt-1">Approve &amp; start 7-day link</div>
          </Link>

          <Link
            href="/influencer-queue"
            className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Active 7-Day Links</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.liveLinks}</div>
            <div className="text-[11px] text-emerald-400 mt-1">Tracking clicks &amp; orders live</div>
          </Link>

          <Link
            href="/team"
            className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-blue-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Pending Creator Apps</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingCreators}</div>
            <div className="text-[11px] text-blue-400 mt-1">Approve /apply creators &rarr;</div>
          </Link>
        </div>

        {/* Recent Seller & Own-Brand Influencer Queue */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-dark-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Influencer &amp; Own-Brand Shoot Requests
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Live sync from Seller Panel &amp; Alpha Studio
              </p>
            </div>
            <Link
              href="/influencer-queue"
              className="text-xs text-brand-500 hover:underline font-medium"
            >
              Manage Full Queue &rarr;
            </Link>
          </div>

          {recentInfluencer.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-dark-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-white">No influencer shoot requests yet</h4>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Seller Plan 1 &amp; Plan 2 requests will appear here automatically, or dispatch a ZebAlpha Own-Brand shoot now.
              </p>
              <Link
                href="/influencer-queue"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Open Influencer Queue</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Product &amp; Source</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Workflow Stage</th>
                    <th className="py-3 px-4">Assigned Creator</th>
                    <th className="py-3 px-4">Clicks / Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {recentInfluencer.map((row) => (
                    <tr key={String(row.id)} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-white">{String(row.product_name || "Catalog")}</p>
                        <p className="text-[10px] text-zinc-400">
                          {row.campaign_source === "zebalpha_own_brand"
                            ? "ZebAlpha Own Brand"
                            : String(row.seller_store_name || "Seller Campaign")}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-dark-800 text-zinc-200 border border-dark-700">
                          {row.plan_type === "with_product_150"
                            ? "With Product + ₹150"
                            : "Without Product + 1%"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {String(row.workflow_status || row.status || "pending").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {String(row.assigned_creator_name || "Unassigned")}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {Number(row.total_clicks || 0)} / {Number(row.total_orders || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

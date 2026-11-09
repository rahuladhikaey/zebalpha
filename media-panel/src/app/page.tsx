"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { 
  Megaphone, 
  Image as ImageIcon, 
  Share2, 
  Bell, 
  Plus, 
  ExternalLink,
  Calendar,
  Layers,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function MediaDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalAssets: 0,
    scheduledPosts: 0,
    pendingTasks: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

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

      // Fetch live data under RLS
      try {
        const [
          { count: campCount, data: campData },
          { count: assetCount },
          { count: postCount },
          { count: taskCount },
        ] = await Promise.all([
          supabase.from("media_campaigns").select("*", { count: "exact" }).limit(5).order("created_at", { ascending: false }),
          supabase.from("creative_assets").select("id", { count: "exact", head: true }),
          supabase.from("social_posts").select("id", { count: "exact", head: true }),
          supabase.from("media_tasks").select("id", { count: "exact", head: true }).eq("status", "todo"),
        ]);

        setStats({
          activeCampaigns: campCount || 0,
          totalAssets: assetCount || 0,
          scheduledPosts: postCount || 0,
          pendingTasks: taskCount || 0,
        });

        if (campData) {
          setRecentCampaigns(campData);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
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
          <p className="text-xs text-zinc-400 font-medium">Verifying Media Panel Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header 
        title="Marketing & Media Operations" 
        description="Brand campaigns, lookbook assets, social scheduling, and audience push notifications" 
      />

      <main className="p-8 space-y-8">
        {/* Top Banner / Social Profile Sync */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/20">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Official Brand Channel: @zebalpha_official</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Instagram Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Centralized brand storytelling, lookbook drops, influencer collaborations, and customer engagement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/zebalpha_official?psln=MW5jZHU3YjF0M2x3eg=="
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white text-xs font-medium flex items-center gap-2 transition-colors border border-dark-700"
            >
              <span>View Live Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/campaigns"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Active Campaigns</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Megaphone className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.activeCampaigns}</div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Marketing promotions</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Creative Assets</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <ImageIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalAssets}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Banners, videos & lookbooks</div>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Social Content Queue</span>
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.scheduledPosts}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Calendar scheduled drops</div>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Pending Creative Tasks</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingTasks}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Production queue</div>
          </div>
        </div>

        {/* Recent Marketing Campaigns Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-dark-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Brand Campaigns</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Live tracking from PostgreSQL media_campaigns</p>
            </div>
            <Link
              href="/campaigns"
              className="text-xs text-brand-500 hover:underline font-medium"
            >
              View All Campaigns &rarr;
            </Link>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-dark-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-white">No campaigns created yet</h4>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Launch your first marketing campaign to coordinate creative assets, budget allocations, and performance tracking.
              </p>
              <Link
                href="/campaigns"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Campaign</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Campaign Name</th>
                    <th className="py-3 px-4">Objective</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Budget</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {recentCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{camp.name}</td>
                      <td className="py-3 px-4 text-zinc-400">{camp.objective}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-mono">₹{Number(camp.budget).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-zinc-400">
                        {new Date(camp.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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


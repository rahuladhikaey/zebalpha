"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Share2, Plus, ExternalLink, Calendar, Instagram } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SocialPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const { data } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setPosts(data);
    }
    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Social Content & Drops Calendar" description="Coordinate Instagram announcements, lookbook posts, and engagement" />

      <main className="p-8 space-y-6">
        {/* Instagram Profile Card */}
        <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Instagram Account: @zebalpha_official</div>
              <div className="text-[11px] text-zinc-400">Official ZebAlpha Fashion & Apparel Marketplace Profile</div>
            </div>
          </div>
          <a
            href="https://www.instagram.com/zebalpha_official?psln=MW5jZHU3YjF0M2x3eg=="
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-pink-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>Open Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Content Calendar */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Scheduled Posts</h3>
            <button
              onClick={() => alert("Schedule new social post modal")}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Post</span>
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No scheduled posts in the queue. Create a post to synchronize lookbook drops with @zebalpha_official.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {posts.map((post) => (
                <div key={post.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-dark-800 text-zinc-300 mr-2">
                      {post.platform}
                    </span>
                    <span className="text-xs text-white">{post.caption}</span>
                  </div>
                  <span className="text-xs text-zinc-400">{post.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


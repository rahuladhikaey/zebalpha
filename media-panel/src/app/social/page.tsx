"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { 
  Share2, 
  Plus, 
  ExternalLink, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  X, 
  Send,
  MoreVertical,
  Layers,
  Globe
} from "lucide-react";
import { useRouter } from "next/navigation";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function TwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor"/>
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect width="4" height="12" x="2" y="9"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

interface SocialPost {
  id: string;
  campaign_id?: string | null;
  platform: "instagram" | "facebook" | "youtube" | "twitter" | "linkedin" | "other";
  caption: string;
  hashtags?: string | null;
  media_asset_ids?: any;
  scheduled_at?: string | null;
  published_at?: string | null;
  status: "draft" | "under_review" | "approved" | "scheduled" | "published" | "failed";
  created_by: string;
  created_at: string;
}

interface CampaignOption {
  id: string;
  name: string;
}

export default function SocialPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState<SocialPost["platform"]>("instagram");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("#zebalpha #fashion #lookbook #editorial");
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Default to tomorrow 6:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState<SocialPost["status"]>("scheduled");
  const [campaignId, setCampaignId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter Tabs
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const [postRes, campRes] = await Promise.all([
        supabase
          .from("social_posts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("media_campaigns")
          .select("id, name")
          .order("name", { ascending: true })
      ]);

      if (postRes.data) setPosts(postRes.data as SocialPost[]);
      if (campRes.data) setCampaigns(campRes.data as CampaignOption[]);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      if (!caption.trim()) {
        setFormError("Caption cannot be empty.");
        setSubmitting(false);
        return;
      }

      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;

      const { data, error } = await supabase
        .from("social_posts")
        .insert({
          platform,
          caption: caption.trim(),
          hashtags: hashtags.trim(),
          scheduled_at: scheduledIso,
          status,
          campaign_id: campaignId || null,
          created_by: session.userId,
        })
        .select()
        .single();

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data) {
        setPosts([data as SocialPost, ...posts]);
        setShowModal(false);
        // Reset form
        setCaption("");
        setHashtags("#zebalpha #fashion #lookbook #editorial");
        setStatus("scheduled");
        setCampaignId("");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred while creating social post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (postId: string, newStatus: SocialPost["status"]) => {
    const { error } = await supabase
      .from("social_posts")
      .update({ 
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null
      })
      .eq("id", postId);

    if (!error) {
      setPosts(posts.map((p) => (p.id === postId ? { ...p, status: newStatus } : p)));
    } else {
      console.error("Failed to update post status:", error.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to remove this scheduled post?")) return;
    const { error } = await supabase
      .from("social_posts")
      .delete()
      .eq("id", postId);

    if (!error) {
      setPosts(posts.filter((p) => p.id !== postId));
    } else {
      console.error("Error deleting post:", error.message);
    }
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat) {
      case "instagram":
        return <InstagramIcon className="w-4 h-4 text-pink-400" />;
      case "twitter":
        return <TwitterIcon className="w-4 h-4 text-sky-400" />;
      case "youtube":
        return <YoutubeIcon className="w-4 h-4 text-red-400" />;
      case "facebook":
        return <FacebookIcon className="w-4 h-4 text-blue-500" />;
      case "linkedin":
        return <LinkedinIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <Share2 className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "published":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "scheduled":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "approved":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "under_review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true;
    return post.status === activeFilter;
  });

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Social Content & Drops Calendar" description="Coordinate Instagram announcements, lookbook posts, and engagement" />

      <main className="p-8 space-y-6">
        {/* Instagram Profile Card */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <InstagramIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Instagram: @zebalpha_official</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Primary Brand Account
                </span>
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">Official ZebAlpha Fashion & Apparel Marketplace Profile</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/zebalpha_official?psln=MW5jZHU3YjF0M2x3eg=="
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-pink-400 text-xs font-medium flex items-center gap-1.5 transition-colors border border-dark-700"
            >
              <span>Open Instagram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Action & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Social Drops & Content Queue</h2>
            <p className="text-xs text-zinc-400">Total {posts.length} posts scheduled across marketing channels</p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Post</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-800 p-1.5 rounded-xl overflow-x-auto">
          {[
            { id: "all", label: "All Posts" },
            { id: "scheduled", label: "Scheduled Drops" },
            { id: "approved", label: "Approved" },
            { id: "draft", label: "Drafts" },
            { id: "published", label: "Published" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilter === tab.id
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-dark-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Schedule Post Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Schedule Social Drop</h3>
                    <p className="text-[11px] text-zinc-400">Plan and synchronize content across social channels</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Target Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as any)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 capitalize"
                    >
                      <option value="instagram">Instagram (@zebalpha_official)</option>
                      <option value="facebook">Facebook Page</option>
                      <option value="youtube">YouTube Community</option>
                      <option value="twitter">X / Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="other">Other Platform</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Initial Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 capitalize"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="approved">Approved</option>
                      <option value="under_review">Under Review</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-300">Post Caption</label>
                    <span className="text-[10px] text-zinc-500">{caption.length} / 2,200 chars</span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Introducing our Winter 2026 Raw Silk Collection ✨ Handcrafted silhouettes designed for contemporary elegance..."
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Hashtags</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#zebalpha #fashion #sustainable #luxury"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Scheduled Drop Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Associated Campaign (Optional)</label>
                    <select
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">None / Standalone Post</option>
                      {campaigns.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Schedule Post</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content Posts List */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">
                {activeFilter === "all" ? "No scheduled posts in the queue" : `No posts with status '${activeFilter}'`}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Create a scheduled post to synchronize product lookbook drops and promotional announcements with @zebalpha_official.
              </p>
              <button
                onClick={() => {
                  setFormError(null);
                  setShowModal(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule First Post</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {filteredPosts.map((post) => (
                <div key={post.id} className="p-5 hover:bg-dark-850/50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-dark-950 border border-dark-800 shrink-0 mt-0.5">
                      {getPlatformIcon(post.platform)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-dark-950 text-white border border-dark-800">
                          {post.platform}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(post.status)}`}>
                          {post.status.replace("_", " ")}
                        </span>
                        {post.scheduled_at && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {new Date(post.scheduled_at).toLocaleDateString("en-IN", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white leading-relaxed max-w-2xl whitespace-pre-line">
                        {post.caption}
                      </p>
                      {post.hashtags && (
                        <p className="text-[11px] text-brand-400 font-medium">
                          {post.hashtags}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <select
                      value={post.status}
                      onChange={(e) => handleUpdateStatus(post.id, e.target.value as any)}
                      className="px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 capitalize"
                    >
                      <option value="draft">Draft</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </select>

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      title="Delete post"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Camera,
  Video,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function CreatorApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [followersCount, setFollowersCount] = useState("");
  const [niche, setNiche] = useState("Fashion & Streetwear");
  const [sampleReelUrl, setSampleReelUrl] = useState("");
  const [upiId, setUpiId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        setSubmitting(false);
        return;
      }

      // 1. Create Supabase Auth account (or sign in if already registered)
      let userId: string | null = null;
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: "INFLUENCER_APPLICANT",
          },
        },
      });

      if (signUpErr) {
        // Fallback: if account already exists, try signing in with provided password
        if (signUpErr.message.toLowerCase().includes("already")) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInErr || !signInData.user) {
            setErrorMsg(
              "An account with this email already exists. Please use the correct password or contact Media Leader."
            );
            setSubmitting(false);
            return;
          }
          userId = signInData.user.id;
        } else {
          setErrorMsg(signUpErr.message);
          setSubmitting(false);
          return;
        }
      } else {
        userId = signUpData.user?.id || null;
      }

      if (!userId) {
        setErrorMsg("Could not initialize account. Please verify your email and try again.");
        setSubmitting(false);
        return;
      }

      // 2. Insert pending creator application (stays locked until Media Leader or SuperAdmin approves)
      const { error: profErr } = await supabase.from("media_creator_profiles").insert({
        user_id: userId,
        full_name: fullName.trim(),
        email: cleanEmail,
        phone: phone.replace(/\D/g, "").slice(-10) || null,
        city: city.trim() || null,
        instagram_handle: instagramHandle.trim() || null,
        youtube_handle: youtubeHandle.trim() || null,
        followers_count: Number(followersCount || 0),
        niche: niche.trim() || "Fashion & Lifestyle",
        sample_reel_url: sampleReelUrl.trim() || null,
        upi_id: upiId.trim() || null,
        role_type: "INFLUENCER",
        onboarding_source: "self_apply",
        approval_status: "pending",
        is_active: false,
      });

      if (profErr) {
        if (profErr.code === "23505") {
          setSubmitted(true);
          return;
        }
        setErrorMsg(
          profErr.message.includes("row-level security")
            ? "Account created! If email confirmation is enabled, verify your email first, then contact Alpha Media Leader to approve your profile."
            : profErr.message
        );
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Application Submitted!</h1>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Thank you, <strong className="text-white">{fullName}</strong>! Your creator application is now in the{" "}
            <strong className="text-brand-400">Alpha Media Leader Approval Queue</strong>. Once approved, you can sign in to view your assigned Seller &amp; ZebAlpha Own-Brand shoots.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-all"
            >
              <span>Go to Media Panel Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 min-w-12 min-h-12 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border border-dark-700 shadow-lg shadow-brand-500/20">
              <img
                src="/official-logo.png"
                alt="ZebAlpha Official Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Join ZebAlpha Alpha Creator Network</h1>
              <p className="text-xs text-zinc-400">
                Shoot reels for ZebAlpha Own Brand &amp; verified Bharat sellers. Approval required by Media Leader.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Riya Sen"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Phone / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="riya@example.com"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Create Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-pink-400" /> Instagram Handle
                </label>
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@riyastyles"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-red-400" /> YouTube Channel Handle
                </label>
                <input
                  type="text"
                  value={youtubeHandle}
                  onChange={(e) => setYoutubeHandle(e.target.value)}
                  placeholder="@riyashorts"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kolkata"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Followers Count</label>
                <input
                  type="number"
                  min={0}
                  value={followersCount}
                  onChange={(e) => setFollowersCount(e.target.value)}
                  placeholder="15000"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Primary Niche</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option>Fashion &amp; Streetwear</option>
                  <option>Ethnic &amp; Festive Wear</option>
                  <option>Accessories &amp; Lifestyle</option>
                  <option>Video Editing &amp; Reels</option>
                  <option>Home &amp; Gadgets</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Best Sample Reel / Portfolio URL</label>
                <input
                  type="url"
                  value={sampleReelUrl}
                  onChange={(e) => setSampleReelUrl(e.target.value)}
                  placeholder="https://instagram.com/reel/..."
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">UPI ID (Optional for Payouts)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Submitting Application..." : "Submit Creator Application for Approval"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

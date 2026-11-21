"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Building2, 
  MapPin, 
  Save, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  CreditCard,
  Shirt,
  Sparkles,
  Layers,
  Copy,
  Check,
  Store,
  User,
  Tag,
  FileText,
  AlertCircle,
  Globe,
  ExternalLink
} from "lucide-react";
import { validateSellerSocialPageUrl } from "@/shared/utils/socialVideoUtils";

const APPAREL_CATEGORIES = [
  "Clothing & Apparel",
  "Luxury Clothing & Streetwear",
  "Polos & T-Shirts",
  "Hoodies & Sweatshirts",
  "Casual Shirts",
  "Bottoms & Cargo",
  "Outerwear & Jackets",
  "Accessories & Caps",
  "Limited Drops"
];

const cleanCategory = (cat?: string | null) => {
  if (!cat) return "Clothing & Apparel";
  const lower = cat.toLowerCase().trim();
  if (lower === "grocery" || lower.includes("grocery")) return "Clothing & Apparel";
  return cat;
};

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [taxVerifying, setTaxVerifying] = useState(false);
  const [taxVerifyMsg, setTaxVerifyMsg] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  // OTP state for email verification if needed
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    mobile_number: "",
    email: "",
    email_verified: true,
    category: "Clothing & Apparel",
    business_category: "Clothing & Apparel",
    upi_id: "",
    phonepay_number: "",
    gstin: "",
    social_page_url: "",
    social_platform: "",
    pickup_address: "",
    warehouse_address: "",
    city: "",
    state: "West Bengal",
    pincode: "",
    business_logo_url: "",
    business_description: "",
    account_status: "Active",
    created_at: "",
    updated_at: ""
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("*")
        .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
        .maybeSingle();

      if (seller) {
        setSellerId(seller.id);
        const resolvedUpi = seller.phonepay_no || seller.phonepay_number || seller.upi_id || "";
        const resolvedCategory = cleanCategory(seller.category || seller.business_category);

        setForm({
          business_name: seller.business_name || seller.shop_name || "",
          owner_name: seller.owner_name || seller.full_name || "",
          mobile_number: seller.mobile_number || seller.phone_number || "",
          email: seller.email || user.email || "",
          email_verified: seller.email_verified !== undefined ? Boolean(seller.email_verified) : true,
          category: resolvedCategory,
          business_category: resolvedCategory,
          upi_id: resolvedUpi,
          phonepay_number: resolvedUpi,
          gstin: seller.gstin || "",
          social_page_url: seller.social_page_url || user.user_metadata?.social_page_url || "",
          social_platform: seller.social_platform || user.user_metadata?.social_platform || "",
          pickup_address: seller.pickup_address || seller.warehouse_address || "",
          warehouse_address: seller.warehouse_address || seller.pickup_address || "",
          city: seller.city || seller.pickup_location || "",
          state: seller.state || "West Bengal",
          pincode: seller.pincode || "",
          business_logo_url: seller.business_logo_url || seller.profile_photo || "",
          business_description: seller.business_description || "",
          account_status: seller.account_status || seller.status || "Active",
          created_at: seller.created_at || "",
          updated_at: seller.updated_at || ""
        });
      } else {
        // Pre-fill from Supabase Auth user metadata
        setForm(prev => ({
          ...prev,
          email: user.email || "",
          owner_name: user.user_metadata?.full_name || "",
          mobile_number: user.user_metadata?.phone || "",
          upi_id: user.user_metadata?.phone ? `${user.user_metadata.phone}@phonepe` : ""
        }));
      }
    } catch (e) {
      console.error("Error loading seller profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('settings-seller-profile-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sellers', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              setForm(prev => ({
                ...prev,
                account_status: payload.new.account_status || payload.new.status || prev.account_status,
                business_name: payload.new.business_name || prev.business_name,
                upi_id: payload.new.upi_id || payload.new.phonepay_number || prev.upi_id,
                gstin: payload.new.gstin !== undefined ? (payload.new.gstin || "") : prev.gstin
              }));
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleCopyUpi = () => {
    if (!form.upi_id) return;
    navigator.clipboard.writeText(form.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleVerifyEnrolmentId = async () => {
    const cleanId = form.gstin.trim().toUpperCase();
    if (cleanId.length !== 15) return;
    setTaxVerifying(true);
    setTaxVerifyMsg(null);
    try {
      const res = await fetch("/api/seller/verify-tax-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrolmentId: cleanId,
          excludeSellerId: sellerId || undefined,
          mobile: form.mobile_number.trim(),
          email: form.email.trim().toLowerCase(),
          businessName: form.business_name.trim(),
        }),
      });
      const json = await res.json();
      if (json.verified || json.formatVerifiedOnly || json.manualReviewRequired) {
        setTaxVerifyMsg({ type: "success", text: json.message });
      } else {
        setTaxVerifyMsg({ type: "error", text: json.error || json.message || "Could not verify Enrolment ID." });
      }
    } catch {
      setTaxVerifyMsg({ type: "error", text: "Verification service unreachable right now." });
    }
    setTaxVerifying(false);
  };

  const handleSendOtp = async () => {
    if (!form.email) {
      alert("Please enter a valid email address first.");
      return;
    }
    setSendingOtp(true);
    setOtpError("");
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: form.email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      alert("Verification OTP sent to your email!");
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: form.email.trim().toLowerCase(), otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || "Invalid OTP code.");
      setForm(prev => ({ ...prev, email_verified: true }));
      setOtpSent(false);
      setOtpCode("");
      setStatusMsg("✅ Email verified successfully!");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Session expired. Please log in again.");
        return;
      }

      const finalUpi = form.upi_id.trim() || `${form.mobile_number.trim()}@phonepe`;

      let normalizedSocialUrl: string | null = null;
      let detectedSocialPlatform: string | null = null;
      if (form.social_page_url.trim()) {
        const sv = validateSellerSocialPageUrl(form.social_page_url);
        if (!sv.valid) {
          alert(sv.error || "Please enter a valid Instagram, Facebook, or YouTube shop page URL.");
          setSaving(false);
          return;
        }
        normalizedSocialUrl = sv.normalizedUrl;
        detectedSocialPlatform = sv.platform || null;
      }

      const payload: Record<string, any> = {
        business_name: form.business_name.trim(),
        owner_name: (form.owner_name || "").trim() || (form.business_name || "").trim() || "Store Owner",
        full_name: (form.owner_name || "").trim() || (form.business_name || "").trim() || "Store Owner",
        mobile_number: form.mobile_number.trim(),
        phone_number: form.mobile_number.trim(),
        email: form.email.trim().toLowerCase(),
        email_verified: form.email_verified,
        category: form.category,
        business_category: form.category,
        upi_id: finalUpi,
        phonepay_no: finalUpi,
        phonepay_number: finalUpi,
        gstin: form.gstin.trim().toUpperCase() || null,
        social_page_url: normalizedSocialUrl,
        social_platform: detectedSocialPlatform,
        pickup_address: form.pickup_address.trim(),
        warehouse_address: form.pickup_address.trim(),
        pickup_location: form.city.trim() || form.pickup_address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        business_logo_url: form.business_logo_url.trim(),
        profile_photo: form.business_logo_url.trim(),
        business_description: form.business_description.trim(),
        status: "approved",
        account_status: "Active",
        updated_at: new Date().toISOString()
      };

      // Check if seller row exists by user_id, id, or email
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select("id")
        .or(`user_id.eq.${user.id},id.eq.${sellerId || user.id},email.eq.${user.email?.toLowerCase().trim()}`)
        .maybeSingle();

      if (existingSeller) {
        let updateSuccess = false;
        try {
          const { error } = await supabase
            .from("sellers")
            .update(payload)
            .eq("id", existingSeller.id);
          if (!error) updateSuccess = true;
        } catch (_) {}

        if (!updateSuccess) {
          const { upi_id, social_page_url, social_platform, ...safePayload } = payload;
          const { error } = await supabase
            .from("sellers")
            .update(safePayload)
            .eq("id", existingSeller.id);
          if (error) throw error;
        }
      } else {
        const insertPayload: Record<string, any> = {
          ...payload,
          id: user.id,
          user_id: user.id,
          seller_id: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
          created_at: new Date().toISOString()
        };
        let insertSuccess = false;
        try {
          const { error } = await supabase.from("sellers").insert([insertPayload]);
          if (!error) insertSuccess = true;
        } catch (_) {}

        if (!insertSuccess) {
          const { upi_id, social_page_url, social_platform, ...safeInsert } = insertPayload;
          const { error } = await supabase.from("sellers").insert([safeInsert]);
          if (error) throw error;
        }
      }

      // Synchronize default warehouse pickup location with the updated shop & contact info
      try {
        const resolvedSellerId = (existingSeller as any)?.id || user.id;
        const { data: defaultLoc } = await supabase
          .from("seller_pickup_locations")
          .select("id")
          .in("seller_id", [resolvedSellerId, user.id])
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        const locPayload = {
          name: `${form.business_name.trim()} Warehouse`,
          location_name: `${form.business_name.trim()} Warehouse`,
          contact_name: form.owner_name.trim(),
          contact_phone: form.mobile_number.trim(),
          phone: form.mobile_number.trim(),
          contact_email: form.email.trim().toLowerCase(),
          address: form.pickup_address.trim(),
          address_line1: form.pickup_address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          updated_at: new Date().toISOString()
        };

        if (defaultLoc?.id) {
          await supabase
            .from("seller_pickup_locations")
            .update(locPayload)
            .eq("id", defaultLoc.id);
        } else if (form.pickup_address.trim()) {
          await supabase
            .from("seller_pickup_locations")
            .insert([{
              ...locPayload,
              seller_id: resolvedSellerId,
              is_default: true,
              is_active: true,
              approval_status: "approved",
              shiprocket_sync_status: "synced",
              created_at: new Date().toISOString()
            }]);
        }
      } catch (locSyncErr) {
        console.warn("Notice syncing pickup location with settings:", locSyncErr);
      }

      setStatusMsg("✨ Merchant settings & Payout details updated successfully!");
      setTimeout(() => setStatusMsg(""), 4500);
    } catch (err: any) {
      console.error("Save settings error:", err);
      alert(err.message || "Failed to save settings. Please verify details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">ZEBALPHA MERCHANT PORTAL</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              ● Phase 2 Live
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">Merchant Profile & Settings</h1>
          <p className="text-xs font-bold text-zinc-400 mt-1">
            Configure your brand identity, UPI payout destination, fulfillment hub, and streetwear catalog settings.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-white/10 active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in duration-150">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{statusMsg}</span>
          </span>
          <button onClick={() => setStatusMsg("")} className="text-zinc-400 hover:text-white font-black text-sm">✕</button>
        </div>
      )}

      {/* 🌟 1. PAYOUT & REVENUE TRANSFERS (UPI / PHONEPE) CARD 🌟 */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
                <CreditCard size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Direct 5-Day Safe UPI Payouts</span>
                <h3 className="text-lg font-black text-white mt-0.5">Payout UPI ID / UPI Number Settlement</h3>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
              <CheckCircle2 size={14} /> 5-Day Direct UPI Payout
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                <span>Merchant Payout UPI ID / UPI Number *</span>
                <span className="text-[11px] text-zinc-500 font-normal">e.g. yourname@upi, 9876543210@upi</span>
              </label>
              
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="e.g. yourshop@upi or 9876543210@upi"
                  value={form.upi_id}
                  onChange={(e) => setForm({ ...form, upi_id: e.target.value, phonepay_number: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-white outline-none focus:border-white pr-28 transition-all"
                />
                
                {form.upi_id && (
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="absolute right-3 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    {copiedUpi ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedUpi ? "Copied!" : "Copy"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-1.5">
              <p className="text-white font-bold flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Automated 5-Day Merchant Settlement (No Bank A/C, PAN or Aadhaar Required)</span>
              </p>
              <p className="leading-relaxed">
                When customers purchase your products on ZEBALPHA, your earnings are automatically calculated and safely transferred directly to your UPI ID / UPI Number within 5 days of order delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 2. BRAND & STOREFRONT IDENTITY CARD 🌟 */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3.5 border-b border-zinc-800/80 pb-5">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0 shadow-lg">
            <Store size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Store Profile</span>
            <h3 className="text-lg font-black text-white mt-0.5">Brand & Merchant Identity</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Store size={14} className="text-white" />
              <span>Shop / Brand Name *</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Zebalpha Streetwear & Studio"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <User size={14} className="text-white" />
              <span>Owner / Designer Full Name *</span>
            </label>
            <input
              type="text"
              required
              placeholder="Full Name"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Shirt size={14} className="text-white" />
              <span>Primary Apparel Category *</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value, business_category: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all cursor-pointer"
            >
              {APPAREL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Tag size={14} className="text-white" />
              <span>Brand Logo URL</span>
            </label>
            <input
              type="text"
              placeholder="https://... (Optional)"
              value={form.business_logo_url}
              onChange={(e) => setForm({ ...form, business_logo_url: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Enrolment ID (No PAN Needed)</span>
              </span>
              {form.gstin.trim().length === 15 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Enrolment ID
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={15}
                placeholder="15-character Enrolment ID (e.g. 19E000123456789)"
                value={form.gstin}
                onChange={(e) => {
                  setForm({ ...form, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") });
                  setTaxVerifyMsg(null);
                }}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-white outline-none focus:border-emerald-400 transition-all"
              />
              <button
                type="button"
                onClick={handleVerifyEnrolmentId}
                disabled={taxVerifying || form.gstin.trim().length !== 15}
                className="px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer shrink-0 transition"
              >
                {taxVerifying ? "Checking..." : "Verify ID"}
              </button>
            </div>
            {taxVerifyMsg && (
              <p
                className={`text-[11px] font-bold mt-1 ${
                  taxVerifyMsg.type === "success"
                    ? "text-emerald-400"
                    : taxVerifyMsg.type === "warning"
                    ? "text-amber-300"
                    : "text-rose-400"
                }`}
              >
                {taxVerifyMsg.text}
              </p>
            )}
            <a
              href="https://reg.gst.gov.in/registration/generateuid"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 mt-1"
            >
              <span>Don&apos;t have an Enrolment ID? Generate Free on Official Portal →</span>
            </a>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Globe size={14} className="text-rose-400" />
                <span>Official Shop Social Page (Instagram / Facebook / YouTube)</span>
              </span>
              {form.social_page_url.trim() && validateSellerSocialPageUrl(form.social_page_url).valid && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ✓ {validateSellerSocialPageUrl(form.social_page_url).platformLabel}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://www.instagram.com/yourshopname or https://www.facebook.com/yourshopname"
                value={form.social_page_url}
                onChange={(e) => setForm({ ...form, social_page_url: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-rose-400 transition-all"
              />
              {form.social_page_url.trim() && validateSellerSocialPageUrl(form.social_page_url).valid && (
                <a
                  href={validateSellerSocialPageUrl(form.social_page_url).normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 transition"
                >
                  <span>Open</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            {form.social_page_url.trim() && !validateSellerSocialPageUrl(form.social_page_url).valid && (
              <p className="text-[11px] font-bold text-rose-400">
                {validateSellerSocialPageUrl(form.social_page_url).error}
              </p>
            )}
            <p className="text-[11px] text-zinc-400">
              Your official shop social page where you publish real product &amp; packaging proof videos for customer trust and RTO dispute protection.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <FileText size={14} className="text-white" />
            <span>Store Bio & Brand Story</span>
          </label>
          <textarea
            rows={3}
            placeholder="Tell customers about your streetwear aesthetics, fabric quality, and design philosophy..."
            value={form.business_description}
            onChange={(e) => setForm({ ...form, business_description: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all resize-none"
          />
        </div>
      </div>

      {/* 🌟 3. CONTACT & FULFILLMENT HUB CARD 🌟 */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3.5 border-b border-zinc-800/80 pb-5">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0 shadow-lg">
            <MapPin size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Logistics & Contact</span>
            <h3 className="text-lg font-black text-white mt-0.5">Fulfillment Hub & Dispatch Location</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Phone size={14} className="text-white" />
              <span>Contact Mobile Number *</span>
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="9876543210"
              value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-white" />
                <span>Email Address *</span>
              </span>
              {form.email_verified && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Verified
                </span>
              )}
            </label>
            <input
              type="email"
              required
              placeholder="merchant@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <MapPin size={14} className="text-white" />
            <span>Pickup / Warehouse Address *</span>
          </label>
          <input
            type="text"
            required
            placeholder="Studio / Dispatch Address for courier pickup"
            value={form.pickup_address}
            onChange={(e) => setForm({ ...form, pickup_address: e.target.value, warehouse_address: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">City / Dispatch Hub *</label>
            <input
              type="text"
              required
              placeholder="e.g. Kolkata, Mumbai"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">State *</label>
            <input
              type="text"
              required
              placeholder="e.g. West Bengal"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Pincode *</label>
            <input
              type="text"
              maxLength={6}
              placeholder="700001"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* 🌟 4. FAST-TRACK CLOTHING COMPLIANCE CARD 🌟 */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Apparel Marketplace Authorization</h4>
              <p className="text-[11px] text-zinc-400">ZEBALPHA Verified Merchant Status</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase self-start sm:self-auto">
            ● Active & Authorized
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-emerald-400 block">Fast-Track Onboarding</span>
            <p className="text-white font-bold">No Document Uploads Required</p>
            <p className="text-zinc-400 text-[11px]">
              Initial onboarding for our clothing line only requires your Enrolment ID &amp; UPI ID — no Aadhaar, PAN, or Bank Account uploads needed. Your merchant account is immediately cleared for product publishing.
            </p>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-blue-400 block">Apparel & Streetwear Scope</span>
            <p className="text-white font-bold">Pure Clothing Operations</p>
            <p className="text-zinc-400 text-[11px]">
              All product lines (Polos, Tees, Hoodies, Shirts, Cargo, Outerwear) operate directly under ZEBALPHA apparel logistics.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button Bottom */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black text-xs uppercase tracking-wider transition-all shadow-2xl shadow-white/20 active:scale-95 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Merchant Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

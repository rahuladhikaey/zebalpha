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
  AlertCircle
} from "lucide-react";

const APPAREL_CATEGORIES = [
  "Polos & T-Shirts",
  "Hoodies & Sweatshirts",
  "Casual Shirts",
  "Bottoms & Cargo",
  "Outerwear & Jackets",
  "Accessories & Caps",
  "Limited Drops",
  "Luxury Clothing & Streetwear"
];

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

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
    category: "Polos & T-Shirts",
    business_category: "Polos & T-Shirts",
    upi_id: "",
    phonepay_number: "",
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
        .eq("user_id", user.id)
        .maybeSingle();

      if (seller) {
        setSellerId(seller.id);
        const resolvedUpi = seller.upi_id || seller.phonepay_number || seller.phonepay_no || "";
        const resolvedCategory = seller.category || seller.business_category || "Polos & T-Shirts";

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
                upi_id: payload.new.upi_id || payload.new.phonepay_number || prev.upi_id
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

      const payload = {
        business_name: form.business_name.trim(),
        owner_name: form.owner_name.trim(),
        full_name: form.owner_name.trim(),
        mobile_number: form.mobile_number.trim(),
        phone_number: form.mobile_number.trim(),
        email: form.email.trim().toLowerCase(),
        email_verified: form.email_verified,
        category: form.category,
        business_category: form.category,
        upi_id: finalUpi,
        phonepay_no: finalUpi,
        phonepay_number: finalUpi,
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

      // Check if seller row exists
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingSeller) {
        const { error } = await supabase
          .from("sellers")
          .update(payload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const insertPayload = {
          ...payload,
          id: user.id,
          user_id: user.id,
          seller_id: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
          created_at: new Date().toISOString()
        };
        const { error } = await supabase.from("sellers").insert([insertPayload]);
        if (error) throw error;
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
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Direct Payout Routing</span>
                <h3 className="text-lg font-black text-white mt-0.5">Payout UPI ID / PhonePe Settlement</h3>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
              <CheckCircle2 size={14} /> Instant Revenue Transfer
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                <span>Merchant Payout UPI ID / PhonePe Number *</span>
                <span className="text-[11px] text-zinc-500 font-normal">e.g. yourname@phonepe, 9876543210@paytm</span>
              </label>
              
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="e.g. rahuladhikary@phonepe or 9876543210@paytm"
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
                <span>Automated Merchant Settlement</span>
              </p>
              <p className="leading-relaxed">
                When customers purchase your clothing items on ZEBALPHA, earnings and payouts are automatically calculated and transferred directly to this UPI ID or PhonePe account without manual paper delays.
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
              Initial onboarding for our clothing line does not require Aadhaar, PAN, GST, or FSSAI uploads. Your merchant account is immediately cleared for product publishing.
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

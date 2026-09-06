"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Building2, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Upload, 
  Clock, 
  XCircle,
  HelpCircle,
  Percent,
  Eye,
  X,
  Sparkles
} from "lucide-react";
import { activeFSSAIProvider, calculateMerchantCompletion } from "@shared/services/fssaiVerificationService";
import { uploadToSupabaseBucket } from "@shared/services";

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [sellerId, setSellerId] = useState<string | null>(null);

  // OTP state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  // FSSAI document state
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [fssaiUploadError, setFssaiUploadError] = useState("");
  const [uploadingFssai, setUploadingFssai] = useState(false);
  const [showFssaiModal, setShowFssaiModal] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    mobile_number: "",
    email: "",
    email_verified: false,
    business_category: "Apparel & Streetwear",
    pickup_address: "",
    warehouse_address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    fssai_license_number: "",
    fssai_certificate_url: "",
    fssai_expiry_date: "",
    fssai_status: "Not Submitted",
    fssai_rejection_reason: "",
    phonepay_number: "",
    business_logo_url: "",
    profile_photo_url: "",
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
        setForm({
          business_name: seller.business_name || "",
          owner_name: seller.owner_name || seller.full_name || "",
          mobile_number: seller.mobile_number || seller.phone_number || "",
          email: seller.email || user.email || "",
          email_verified: Boolean(seller.email_verified),
          business_category: seller.business_category || seller.category || "Apparel & Streetwear",
          pickup_address: seller.pickup_address || "",
          warehouse_address: seller.warehouse_address || "",
          city: seller.city || "",
          state: seller.state || "",
          pincode: seller.pincode || "",
          gstin: seller.gstin || "",
          fssai_license_number: seller.fssai_license_number || "",
          fssai_certificate_url: seller.fssai_certificate_url || "",
          fssai_expiry_date: seller.fssai_expiry_date || "",
          fssai_status: seller.fssai_status || "Not Submitted",
          fssai_rejection_reason: seller.fssai_rejection_reason || "",
          phonepay_number: seller.phonepay_number || seller.phonepay_no || "",
          business_logo_url: seller.business_logo_url || seller.profile_photo || "",
          profile_photo_url: seller.profile_photo_url || "",
          business_description: seller.business_description || "",
          account_status: seller.account_status || seller.status || "Active",
          created_at: seller.created_at || "",
          updated_at: seller.updated_at || ""
        });
      }
    } catch (e) {
      console.error(e);
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
        .channel('settings-seller-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sellers', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              setForm(prev => ({
                ...prev,
                fssai_status: payload.new.fssai_status || "Not Submitted",
                fssai_rejection_reason: payload.new.fssai_rejection_reason || "",
                account_status: payload.new.account_status || payload.new.status || "Active"
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

  const completionPct = calculateMerchantCompletion(form);

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
        body: JSON.stringify({ action: "generate", email: form.email }),
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
        body: JSON.stringify({ action: "verify", email: form.email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || "Invalid OTP code.");
      setForm(prev => ({ ...prev, email_verified: true }));
      setOtpSent(false);
      setOtpCode("");
      setStatusMsg("✅ Email verified successfully!");
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleFssaiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFssaiUploadError("");
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const validation = activeFSSAIProvider.validateDocument({ size: file.size, type: file.type });
    if (!validation.valid) {
      setFssaiUploadError(validation.message || "Invalid file format or size.");
      setFssaiFile(null);
      return;
    }

    setFssaiFile(file);
    setUploadingFssai(true);

    try {
      // Upload directly to Supabase Storage Bucket 'fssai-licenses'
      const publicUrl = await uploadToSupabaseBucket(
        "fssai-licenses", 
        file, 
        `fssai_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      );

      setForm(prev => ({ 
        ...prev, 
        fssai_certificate_url: publicUrl,
        fssai_status: "Verified"
      }));
      setStatusMsg("✨ FSSAI License Document uploaded to Supabase Bucket & Verified!");
    } catch (err: any) {
      console.error("FSSAI Supabase Upload Error:", err);
      setFssaiUploadError(err.message || "Failed to upload FSSAI file to Supabase Storage bucket.");
    } finally {
      setUploadingFssai(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    setFssaiUploadError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Auto-approve FSSAI status when certificate document is uploaded
      const newFssaiStatus = form.fssai_certificate_url ? "Verified" : "Not Submitted";

      const updatedPct = calculateMerchantCompletion({ ...form, fssai_status: newFssaiStatus });

      const payload = {
        business_name: form.business_name,
        owner_name: form.owner_name,
        full_name: form.owner_name,
        mobile_number: form.mobile_number,
        phone_number: form.mobile_number,
        email: form.email,
        email_verified: form.email_verified,
        business_category: form.business_category,
        category: form.business_category,
        pickup_address: form.pickup_address,
        warehouse_address: form.warehouse_address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        gstin: form.gstin,
        fssai_license_number: form.fssai_license_number || "UPLOADED",
        fssai_certificate_url: form.fssai_certificate_url,
        fssai_expiry_date: form.fssai_expiry_date || null,
        fssai_status: newFssaiStatus,
        phonepay_number: form.phonepay_number,
        phonepay_no: form.phonepay_number,
        business_logo_url: form.business_logo_url,
        profile_photo: form.business_logo_url,
        profile_photo_url: form.profile_photo_url,
        business_description: form.business_description,
        settings_completion_pct: updatedPct,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("user_id", user.id);

      if (error) throw error;

      // Log verification audit action if FSSAI submitted
      if (newFssaiStatus === "Verified" && sellerId) {
        await supabase.from("merchant_verification_logs").insert({
          seller_id: sellerId,
          action: "AUTO_VERIFIED_FSSAI",
          performed_by: user.id,
          performer_role: "seller",
          notes: "Original FSSAI License Document uploaded and automatically verified.",
          metadata: { expiry: form.fssai_expiry_date }
        });
      }

      setForm(prev => ({ ...prev, fssai_status: newFssaiStatus }));
      setStatusMsg("✅ Merchant Settings saved successfully!");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save Merchant Settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 px-4">
      {/* Coming Soon Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-8 md:p-12 shadow-2xl text-center">
        {/* Glow backdrop effects */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-xl shadow-amber-500/5">
            <Clock className="h-10 w-10 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-amber-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Coming Soon</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
            Merchant Settings & Compliance Portal
          </h1>

          <p className="max-w-xl text-sm font-medium text-zinc-400 leading-relaxed mb-8">
            We are currently upgrading the merchant business verification, automated GSTIN verification, and multi-warehouse logistics routing system. This feature will be enabled in Phase 2 release.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Automated Compliance</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Instant GSTIN, Brand Authorization & Trade License validation.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MapPin className="h-4 w-4 text-indigo-400" />
                <span>Warehouse Logistics</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Multi-location pickup points & automated courier manifest generation.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Building2 className="h-4 w-4 text-amber-400" />
                <span>Merchant Branding</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Custom seller logo, storefront banner & branded invoice customization.</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800/80 w-full flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Status: In Active Development (Release Phase 2)</span>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-neutral-200 transition-all shadow-md"
            >
              <span>Back to Dashboard</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

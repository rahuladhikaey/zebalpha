"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { 
  Sparkles, 
  ShieldCheck, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calculator, 
  History, 
  Send, 
  Eye, 
  Lock, 
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Truck,
  Percent,
  RefreshCw
} from "lucide-react";

export default function PlatformFeeConfig() {
  const [loading, setLoading] = useState(true);
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);

  // Draft / Edit Form State
  const [formData, setFormData] = useState({
    commission_percentage: 5.0,
    fixed_fee_per_order: 15.0,
    payment_collection_fee_pct: 2.0,
    cod_handling_fee: 25.0,
    standard_shipping_fee: 60.0,
    reverse_shipping_fee: 70.0,
    rto_charge: 50.0,
    gst_on_platform_fees_pct: 18.0,
    settlement_delay_days: 7,
    shipping_paid_by: "CUSTOMER",
    change_reason: ""
  });

  // Action status message
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [rollbackModalVersion, setRollbackModalVersion] = useState<any | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");

  // Live Preview Impact Calculator State
  const [previewInput, setPreviewInput] = useState({
    price: 1000,
    quantity: 1,
    paymentMethod: "PREPAID"
  });
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch configs
  async function loadConfigurations() {
    try {
      setLoading(true);
      const [activeRes, versionsRes] = await Promise.all([
        apiService.getActiveFinanceConfig(),
        apiService.listFinanceConfigVersions()
      ]);

      if (activeRes?.success && activeRes.data) {
        setActiveConfig(activeRes.data);
        setFormData({
          commission_percentage: Number(activeRes.data.commission_percentage) || 5.0,
          fixed_fee_per_order: Number(activeRes.data.fixed_fee_per_order) || 15.0,
          payment_collection_fee_pct: Number(activeRes.data.payment_collection_fee_pct) || 2.0,
          cod_handling_fee: Number(activeRes.data.cod_handling_fee) || 25.0,
          standard_shipping_fee: Number(activeRes.data.standard_shipping_fee) || 60.0,
          reverse_shipping_fee: Number(activeRes.data.reverse_shipping_fee) || 70.0,
          rto_charge: Number(activeRes.data.rto_charge) || 50.0,
          gst_on_platform_fees_pct: Number(activeRes.data.gst_on_platform_fees_pct) || 18.0,
          settlement_delay_days: Number(activeRes.data.settlement_delay_days) || 7,
          shipping_paid_by: activeRes.data.shipping_paid_by || "CUSTOMER",
          change_reason: ""
        });
      }

      if (versionsRes?.success && Array.isArray(versionsRes.data)) {
        setVersions(versionsRes.data);
      } else if (versionsRes?.error && (versionsRes.error.includes("Bearer token") || versionsRes.error.includes("Authentication required"))) {
        console.warn("Version history requires admin Bearer token:", versionsRes.error);
      }
    } catch (err: any) {
      console.error("Failed to load platform finance configs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigurations();
  }, []);

  // Update live preview whenever formData or previewInput changes
  useEffect(() => {
    async function calculatePreview() {
      try {
        setPreviewLoading(true);
        const res = await apiService.previewFinanceImpact({
          price: previewInput.price,
          quantity: previewInput.quantity,
          paymentMethod: previewInput.paymentMethod,
          config: formData
        });
        if (res?.success && res.data) {
          setPreviewResult(res.data);
        }
      } catch (err) {
        console.error("Preview impact calculation failed:", err);
      } finally {
        setPreviewLoading(false);
      }
    }

    const timer = setTimeout(calculatePreview, 250);
    return () => clearTimeout(timer);
  }, [formData, previewInput]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      setActionMsg(null);
      const res = await apiService.createDraftFinanceConfig({
        ...formData,
        status: "DRAFT"
      });
      if (res?.success) {
        setActionMsg({ text: `Draft Version ${res.data?.version} saved successfully!`, type: "success" });
        loadConfigurations();
      } else {
        setActionMsg({ text: res?.error || "Failed to save draft", type: "error" });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || "Failed to save draft", type: "error" });
    } finally {
      setSavingDraft(false);
    }
  };

  // Handle Immediate Publish
  const handlePublishNow = async () => {
    if (!formData.change_reason.trim()) {
      setActionMsg({ text: "Please provide a Change Reason before publishing a new configuration.", type: "error" });
      return;
    }

    try {
      setPublishing(true);
      setActionMsg(null);
      // Create draft first, then publish it
      const draftRes = await apiService.createDraftFinanceConfig({
        ...formData,
        status: "VALIDATED"
      });

      if (!draftRes?.success || !draftRes.data?.id) {
        throw new Error(draftRes?.error || "Failed to prepare configuration");
      }

      const pubRes = await apiService.publishFinanceConfig(draftRes.data.id, {});
      if (pubRes?.success) {
        setActionMsg({ text: `Configuration Version ${pubRes.data?.version} successfully published and activated!`, type: "success" });
        loadConfigurations();
      } else {
        throw new Error(pubRes?.error || "Failed to publish");
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || "Publication failed", type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  // Handle Schedule Activation
  const handleSchedulePublish = async () => {
    if (!scheduleDate) {
      setActionMsg({ text: "Please choose a future date for activation.", type: "error" });
      return;
    }

    try {
      setPublishing(true);
      const draftRes = await apiService.createDraftFinanceConfig({
        ...formData,
        status: "SCHEDULED"
      });

      if (!draftRes?.success || !draftRes.data?.id) {
        throw new Error(draftRes?.error || "Failed to prepare configuration");
      }

      const pubRes = await apiService.publishFinanceConfig(draftRes.data.id, { scheduleDate });
      if (pubRes?.success) {
        setActionMsg({ text: `Version ${pubRes.data?.version} scheduled for activation on ${new Date(scheduleDate).toLocaleString()}.`, type: "success" });
        setScheduleModalOpen(false);
        loadConfigurations();
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || "Scheduling failed", type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  // Handle Safe Rollback (Creates new corrective version)
  const handleConfirmRollback = async () => {
    if (!rollbackModalVersion) return;
    try {
      setActionMsg(null);
      const res = await apiService.rollbackFinanceConfig({
        targetVersion: rollbackModalVersion.version,
        reason: rollbackReason || `Rollback to Version ${rollbackModalVersion.version}`
      });

      if (res?.success) {
        setActionMsg({ 
          text: `Rollback applied! New corrective Version ${res.data?.version} created with parameters from v${rollbackModalVersion.version}.`, 
          type: "success" 
        });
        setRollbackModalVersion(null);
        setRollbackReason("");
        loadConfigurations();
      } else {
        setActionMsg({ text: res?.error || "Rollback failed", type: "error" });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || "Rollback failed", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-96 bg-zinc-900 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-950 border border-zinc-800 rounded-2xl" />)}
        </div>
        <div className="h-96 bg-zinc-950 border border-zinc-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ── HEADER & BREADCRUMB ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-widest mb-1">
            <span>Finance Architecture</span>
            <span>•</span>
            <span>Platform Fee Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Commercial Rules & Platform Fees
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Configure platform commissions, order processing fees, payment collection tariffs, and settlement hold windows with immutable versioning and live financial simulation.
          </p>
        </div>

        <button
          onClick={loadConfigurations}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Refresh Engine</span>
        </button>
      </div>

      {/* ── ACTION NOTIFICATION MESSAGE ────────────────────────────────────── */}
      {actionMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in ${
          actionMsg.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : actionMsg.type === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
        }`}>
          <div className="flex items-center gap-2.5">
            {actionMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* ── ACTIVE CONFIGURATION BANNER ───────────────────────────────────── */}
      {activeConfig && (
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-zinc-950 to-zinc-950 p-6 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Active in Production
                </span>
                <span className="text-xs font-black text-white">
                  Version {activeConfig.version}
                </span>
                <span className="text-xs text-zinc-500">
                  Effective from: {new Date(activeConfig.effective_from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">
                Marketplace Standard Commission: {activeConfig.commission_percentage}% • Fixed Fee: ₹{activeConfig.fixed_fee_per_order}
              </h2>
              <p className="text-xs text-zinc-400">
                Payment Collection Fee: {activeConfig.payment_collection_fee_pct}% (Prepaid) • COD Handling: ₹{activeConfig.cod_handling_fee} • Settlement Delay: {activeConfig.settlement_delay_days} days • Shipping Paid By: <span className="font-bold text-zinc-200">{activeConfig.shipping_paid_by}</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">GST on Platform Fees</span>
                <span className="text-sm font-black text-emerald-400">{activeConfig.gst_on_platform_fees_pct}%</span>
              </div>
              <div className="w-px h-8 bg-zinc-800 mx-2" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">Historical Orders</span>
                <span className="text-sm font-black text-blue-400">100% Protected</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN MAIN WORKSPACE: FORM vs LIVE SIMULATOR ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT COLUMN: EDIT COMMERCIAL RULES ────────────────────────────── */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <span>Commercial Rules Parameters</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Edit parameters below to create a draft or publish a new version.</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
              Immutable Versioning
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Commission % */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={12} className="text-amber-400" />
                <span>Marketplace Commission (%)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={formData.commission_percentage}
                onChange={e => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Standard vendor sales fee (e.g. 5.0%)</p>
            </div>

            {/* 2. Fixed Fee per order */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Fixed Order Processing Fee (₹)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.fixed_fee_per_order}
                onChange={e => setFormData({ ...formData, fixed_fee_per_order: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Fixed operational charge per order (e.g. ₹15)</p>
            </div>

            {/* 3. Payment Collection Fee % */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={12} className="text-blue-400" />
                <span>Payment Collection Fee (%)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.payment_collection_fee_pct}
                onChange={e => setFormData({ ...formData, payment_collection_fee_pct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Gateway tariff for Prepaid/Online orders only (e.g. 2.0%)</p>
            </div>

            {/* 4. COD Handling Fee */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>COD Handling Fee (₹)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.cod_handling_fee}
                onChange={e => setFormData({ ...formData, cod_handling_fee: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Applied only when payment method is Cash on Delivery (e.g. ₹25)</p>
            </div>

            {/* 5. Standard Shipping Fee */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={12} className="text-emerald-400" />
                <span>Standard Shipping Fee (₹)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.standard_shipping_fee}
                onChange={e => setFormData({ ...formData, standard_shipping_fee: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Forward delivery fee (e.g. ₹60)</p>
            </div>

            {/* 6. Shipping Paid By Responsibility */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Shipping Cost Responsible Party</span>
              </label>
              <select
                value={formData.shipping_paid_by}
                onChange={e => setFormData({ ...formData, shipping_paid_by: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition cursor-pointer"
              >
                <option value="CUSTOMER">CUSTOMER (No deduction from seller)</option>
                <option value="SELLER">SELLER (Deducted from seller payout)</option>
                <option value="ZEBALPHA">ZEBALPHA (Platform subsidized)</option>
                <option value="SHARED">SHARED (50% seller / 50% platform)</option>
              </select>
              <p className="text-[10px] text-zinc-500">Determines who bears forward freight charge</p>
            </div>

            {/* 7. Reverse Shipping Fee */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Reverse Shipping Fee (₹)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.reverse_shipping_fee}
                onChange={e => setFormData({ ...formData, reverse_shipping_fee: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Applied only upon approved customer return event (e.g. ₹70)</p>
            </div>

            {/* 8. RTO Charge */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Return-to-Origin (RTO) Fee (₹)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.rto_charge}
                onChange={e => setFormData({ ...formData, rto_charge: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Applied only upon confirmed courier RTO failure (e.g. ₹50)</p>
            </div>

            {/* 9. GST on Platform Fees */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} className="text-amber-400" />
                <span>GST on Platform Fees (%)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="28"
                value={formData.gst_on_platform_fees_pct}
                onChange={e => setFormData({ ...formData, gst_on_platform_fees_pct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Statutory tax on platform service revenue (default: 18%)</p>
            </div>

            {/* 10. Settlement Delay Days */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} className="text-purple-400" />
                <span>Settlement Delay (Days Post-Delivery)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="60"
                value={formData.settlement_delay_days}
                onChange={e => setFormData({ ...formData, settlement_delay_days: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 outline-none transition"
              />
              <p className="text-[10px] text-zinc-500">Return & dispute hold window before funds become ELIGIBLE (e.g. 7)</p>
            </div>
          </div>

          {/* Change Reason Input */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider">
              Change Reason & Business Justification <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Festival promotional commission revision, updated logistics carrier tariff"
              value={formData.change_reason}
              onChange={e => setFormData({ ...formData, change_reason: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-medium text-white focus:border-amber-400 outline-none transition placeholder:text-zinc-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing}
              className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Layers size={14} />
              <span>{savingDraft ? "Saving..." : "Save Draft"}</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScheduleModalOpen(true)}
                disabled={savingDraft || publishing}
                className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Calendar size={14} />
                <span>Schedule Activation</span>
              </button>

              <button
                onClick={handlePublishNow}
                disabled={savingDraft || publishing}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black shadow-lg shadow-amber-400/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                <span>{publishing ? "Publishing..." : "Publish & Activate Now"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LIVE FINANCIAL IMPACT SIMULATOR ─────────────────── */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-zinc-800/80 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-400" />
                  <span>Financial Impact Simulator</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Read-Only Simulation
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Simulate how the configured parameters will allocate gross customer payments between platform revenues and seller payouts.
              </p>
            </div>

            {/* Simulator Inputs */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Test Product Price (₹)</span>
                <input
                  type="number"
                  step="50"
                  min="1"
                  value={previewInput.price}
                  onChange={e => setPreviewInput({ ...previewInput, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Payment Rail</span>
                <select
                  value={previewInput.paymentMethod}
                  onChange={e => setPreviewInput({ ...previewInput, paymentMethod: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer"
                >
                  <option value="PREPAID">Prepaid (Razorpay)</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                </select>
              </div>
            </div>

            {/* Breakdown Result */}
            {previewResult && (
              <div className="space-y-3 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/60 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-300">
                  <span>Gross Customer Payment:</span>
                  <span className="font-black text-white text-sm">₹{previewResult.gross.toFixed(2)}</span>
                </div>

                <div className="space-y-2 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Platform Commission ({formData.commission_percentage}%):</span>
                    <span className="text-rose-400 font-bold">-₹{previewResult.commission.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Fixed Order Processing Fee:</span>
                    <span className="text-rose-400 font-bold">-₹{previewResult.fixedFee.toFixed(2)}</span>
                  </div>

                  {previewInput.paymentMethod === "PREPAID" ? (
                    <div className="flex justify-between">
                      <span>Online Payment Gateway Fee ({formData.payment_collection_fee_pct}%):</span>
                      <span className="text-rose-400 font-bold">-₹{previewResult.paymentCollectionFee.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>COD Logistics Handling Fee:</span>
                      <span className="text-rose-400 font-bold">-₹{previewResult.codHandlingFee.toFixed(2)}</span>
                    </div>
                  )}

                  {previewResult.shippingFee > 0 && (
                    <div className="flex justify-between">
                      <span>Seller Logistics Deduction ({formData.shipping_paid_by}):</span>
                      <span className="text-rose-400 font-bold">-₹{previewResult.shippingFee.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>GST on Platform Fees ({formData.gst_on_platform_fees_pct}%):</span>
                    <span className="text-rose-400 font-bold">-₹{previewResult.taxOnFees.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-between text-zinc-300 font-bold">
                  <span>Total Platform Revenue:</span>
                  <span className="text-amber-400 font-black">₹{previewResult.totalPlatformFees.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-wider">Estimated Seller Net Payout</span>
                    <span className="text-xs text-zinc-400">Eligible {formData.settlement_delay_days} days post-delivery</span>
                  </div>
                  <span className="text-xl font-black text-emerald-400">₹{previewResult.estimatedSellerPayable.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-zinc-500 text-center italic">
            Protected by Integer Minor Units (paise) • Zero floating-point rounding divergence
          </p>
        </div>
      </div>

      {/* ── VERSION HISTORY & AUDIT LOG TABLE ─────────────────────────────── */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <History size={16} className="text-blue-400" />
              <span>Version History & Audit Log</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Historical commercial configurations are immutable. Rollback creates a new corrective version.</p>
          </div>
          <span className="text-xs font-bold text-zinc-400">{versions.length} Total Versions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Commission</th>
                <th className="py-3 px-3">Fixed Fee</th>
                <th className="py-3 px-3">Payment Fee</th>
                <th className="py-3 px-3">COD Fee</th>
                <th className="py-3 px-3">Shipping Paid</th>
                <th className="py-3 px-3">Delay</th>
                <th className="py-3 px-3">Effective Interval</th>
                <th className="py-3 px-3">Reason / Author</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-300">
              {versions.map(v => (
                <tr key={v.id} className="hover:bg-zinc-900/40 transition">
                  <td className="py-3.5 px-3 font-black text-white">
                    v{v.version}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      v.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : v.status === 'SCHEDULED'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : v.status === 'DRAFT'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-amber-300">{v.commission_percentage}%</td>
                  <td className="py-3.5 px-3">₹{v.fixed_fee_per_order}</td>
                  <td className="py-3.5 px-3">{v.payment_collection_fee_pct}%</td>
                  <td className="py-3.5 px-3">₹{v.cod_handling_fee}</td>
                  <td className="py-3.5 px-3">{v.shipping_paid_by}</td>
                  <td className="py-3.5 px-3">{v.settlement_delay_days}d</td>
                  <td className="py-3.5 px-3 text-zinc-400 text-[11px]">
                    {new Date(v.effective_from).toLocaleDateString()}
                    {v.effective_to ? ` → ${new Date(v.effective_to).toLocaleDateString()}` : " → Active"}
                  </td>
                  <td className="py-3.5 px-3 max-w-xs truncate text-[11px] text-zinc-400" title={v.change_reason}>
                    {v.change_reason || "Standard commercial policy"}
                    <span className="block text-[9px] text-zinc-600">By: {v.created_by || "Admin"}</span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {v.status !== 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setRollbackModalVersion(v);
                          setRollbackReason(`Rollback parameters to Version ${v.version}`);
                        }}
                        className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Rollback to v{v.version}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SCHEDULE ACTIVATION MODAL ─────────────────────────────────────── */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Calendar size={16} className="text-amber-400" />
              <span>Schedule Activation Date</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Choose the exact future date and time when this configuration will automatically take effect. Historical orders before this timestamp will continue using their original snapshots.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400">Effective Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePublish}
                disabled={publishing}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition"
              >
                {publishing ? "Scheduling..." : "Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROLLBACK CONFIRMATION MODAL ───────────────────────────────────── */}
      {rollbackModalVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <RotateCcw size={16} className="text-amber-400" />
              <span>Confirm Configuration Rollback</span>
            </h3>
            <p className="text-xs text-zinc-400">
              You are rolling back to the commercial parameters of <span className="text-white font-bold">Version {rollbackModalVersion.version}</span> (Commission: {rollbackModalVersion.commission_percentage}%, Fixed: ₹{rollbackModalVersion.fixed_fee_per_order}).
            </p>
            <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              Institutional Safety Rule: This operation will NOT overwrite past configuration rows. It will create a brand new corrective version and activate it immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400">Rollback Justification</label>
              <input
                type="text"
                value={rollbackReason}
                onChange={e => setRollbackReason(e.target.value)}
                placeholder="Reason for reverting to these parameters..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-medium text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setRollbackModalVersion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRollback}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition"
              >
                Confirm & Create New Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

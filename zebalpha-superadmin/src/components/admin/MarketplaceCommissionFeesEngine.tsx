"use client";

import { useState, useEffect, useMemo } from "react";
import { apiService } from "@/services/apiService";
import { supabase } from "@/lib/supabaseClient";
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
  RefreshCw,
  AlertCircle,
  Check,
  Sliders,
  DollarSign,
  HelpCircle
} from "lucide-react";

interface FinanceConfigData {
  id?: string;
  version?: number;
  commission_percentage: number;
  fixed_fee_per_order: number;
  payment_collection_fee_pct: number;
  cod_handling_fee: number;
  standard_shipping_fee: number;
  reverse_shipping_fee: number;
  rto_charge: number;
  gst_on_platform_fees_pct: number;
  settlement_delay_days: number;
  shipping_paid_by: string;
  status?: string;
  effective_from?: string;
  effective_to?: string | null;
  change_reason?: string;
  created_by?: string;
  published_by?: string;
}

interface CustomerCheckoutCharges {
  deliveryCharge: number;
  freeShippingThreshold: number;
  appCharge: number;
  codEnabled: boolean;
  returnWindowDays: number;
  premiumCommissionDiscount: number;
  premiumSettlementDelay: number;
}

export default function MarketplaceCommissionFeesEngine() {
  const [loading, setLoading] = useState(true);
  const [activeConfig, setActiveConfig] = useState<FinanceConfigData | null>(null);
  const [versions, setVersions] = useState<any[]>([]);

  // Unified Form State combining Customer Charges + Seller Commercial Rules
  const [formData, setFormData] = useState({
    // Customer Checkout Charges (Storefront / Cart)
    deliveryCharge: 35,
    freeShippingThreshold: 659,
    appCharge: 5,
    codEnabled: true,
    cod_handling_fee: 5,
    
    // Seller Commercial Commission & Processing Tariffs
    commission_percentage: 0.0,
    fixed_fee_per_order: 0.0,
    payment_collection_fee_pct: 2.0,
    standard_shipping_fee: 60.0,
    shipping_paid_by: "CUSTOMER",

    // Logistics Returns & Risk Tariffs
    reverse_shipping_fee: 70.0,
    rto_charge: 50.0,
    gst_on_platform_fees_pct: 3.0,

    // Settlement Escrow & Tiers
    settlement_delay_days: 7,
    returnWindowDays: 5,
    premiumCommissionDiscount: 0,
    premiumSettlementDelay: 3,

    // Audit Trail
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

  // Live Simulator Inputs
  const [simPrice, setSimPrice] = useState<number>(1000);
  const [simQuantity, setSimQuantity] = useState<number>(1);
  const [simPaymentMethod, setSimPaymentMethod] = useState<"PREPAID" | "COD">("PREPAID");

  // Load all configurations from database & server API
  async function loadConfigurations() {
    try {
      setLoading(true);
      setActionMsg(null);

      let loadedActive: FinanceConfigData | null = null;
      let loadedVersions: any[] = [];
      let loadedStoreRules: any = null;

      // 1. Fetch from Next.js server route /api/admin/settings (handles both store_settings and platform_finance_configs)
      try {
        const settingsRes = await fetch("/api/admin/settings", { cache: "no-store" });
        if (settingsRes.ok) {
          const json = await settingsRes.json();
          if (json.success) {
            if (json.settings) {
              loadedStoreRules = json.settings.marketplace_rules || {};
              const fin = json.settings.marketplace_financial_rules;
              if (fin) {
                loadedActive = {
                  commission_percentage: fin.commission_percentage ?? 0,
                  fixed_fee_per_order: fin.fixed_fee_per_order ?? 0,
                  payment_collection_fee_pct: fin.payment_collection_fee_pct ?? 0,
                  cod_handling_fee: fin.cod_handling_fee ?? 0,
                  standard_shipping_fee: fin.standard_shipping_fee ?? 0,
                  reverse_shipping_fee: fin.reverse_shipping_fee ?? 0,
                  rto_charge: fin.rto_charge ?? 0,
                  gst_on_platform_fees_pct: fin.gst_on_platform_fees_pct ?? 0,
                  settlement_delay_days: fin.settlement_delay_days ?? 7,
                  shipping_paid_by: fin.shipping_paid_by || "CUSTOMER",
                  status: "ACTIVE"
                };
              }
            }

            if (json.activeFinanceConfig) {
              loadedActive = json.activeFinanceConfig;
            }
            if (Array.isArray(json.financeVersions) && json.financeVersions.length > 0) {
              loadedVersions = json.financeVersions;
            }
          }
        }
      } catch (err) {
        console.warn("Could not load from /api/admin/settings:", err);
      }

      // 2. Fetch directly from backend finance API if available
      try {
        const [activeRes, versionsRes] = await Promise.all([
          apiService.getActiveFinanceConfig().catch(() => null),
          apiService.listFinanceConfigVersions().catch(() => null)
        ]);

        if (activeRes?.success && activeRes.data) {
          loadedActive = activeRes.data;
        }
        if (versionsRes?.success && Array.isArray(versionsRes.data) && versionsRes.data.length > 0) {
          loadedVersions = versionsRes.data;
        }
      } catch (err) {
        console.warn("Backend finance API fetch notice:", err);
      }

      // 3. Fallback direct Supabase query if needed
      if (!loadedActive || loadedVersions.length === 0) {
        try {
          const { data: directActive } = await supabase
            .from("platform_finance_configs")
            .select("*")
            .eq("status", "ACTIVE")
            .maybeSingle();

          if (directActive) loadedActive = directActive;

          const { data: directVersions } = await supabase
            .from("platform_finance_configs")
            .select("*")
            .order("version", { ascending: false });

          if (directVersions && directVersions.length > 0) {
            loadedVersions = directVersions;
          }
        } catch (_) {}
      }

      if (loadedActive) {
        setActiveConfig(loadedActive);
      }
      if (loadedVersions.length > 0) {
        setVersions(loadedVersions);
      }

      // Populate unified form state
      setFormData(prev => {
        const comm = loadedActive?.commission_percentage ?? (loadedStoreRules?.globalCommissionPct ? Number(loadedStoreRules.globalCommissionPct) : prev.commission_percentage);
        const fixed = loadedActive?.fixed_fee_per_order ?? (loadedStoreRules?.fixedFee ? Number(loadedStoreRules.fixedFee) : prev.fixed_fee_per_order);
        const col = loadedActive?.payment_collection_fee_pct ?? (loadedStoreRules?.collectionFeePct ? Number(loadedStoreRules.collectionFeePct) : prev.payment_collection_fee_pct);
        const codFee = loadedActive?.cod_handling_fee ?? (loadedStoreRules?.cod_handling_fee ? Number(loadedStoreRules.cod_handling_fee) : prev.cod_handling_fee);
        const ship = loadedActive?.standard_shipping_fee ?? (loadedStoreRules?.defaultShippingCost ? Number(loadedStoreRules.defaultShippingCost) : prev.standard_shipping_fee);
        const shipBy = loadedActive?.shipping_paid_by ?? loadedStoreRules?.shipping_paid_by ?? prev.shipping_paid_by;
        const revShip = loadedActive?.reverse_shipping_fee ?? (loadedStoreRules?.reverseShippingFee ? Number(loadedStoreRules.reverseShippingFee) : prev.reverse_shipping_fee);
        const rto = loadedActive?.rto_charge ?? (loadedStoreRules?.rtoCharge ? Number(loadedStoreRules.rtoCharge) : prev.rto_charge);
        const gst = loadedActive?.gst_on_platform_fees_pct ?? (loadedStoreRules?.gstRatePct ? Number(loadedStoreRules.gstRatePct) : prev.gst_on_platform_fees_pct);
        const delay = loadedActive?.settlement_delay_days ?? (loadedStoreRules?.settlementDelayDays ? Number(loadedStoreRules.settlementDelayDays) : prev.settlement_delay_days);

        const delivery = loadedStoreRules?.deliveryCharge !== undefined ? Number(loadedStoreRules.deliveryCharge) : prev.deliveryCharge;
        const threshold = loadedStoreRules?.freeShippingThreshold !== undefined ? Number(loadedStoreRules.freeShippingThreshold) : prev.freeShippingThreshold;
        const app = loadedStoreRules?.appCharge !== undefined ? Number(loadedStoreRules.appCharge) : prev.appCharge;
        const codOn = loadedStoreRules?.codEnabled !== undefined ? Boolean(loadedStoreRules.codEnabled) : prev.codEnabled;
        const returnWin = loadedStoreRules?.returnWindowDays !== undefined ? Number(loadedStoreRules.returnWindowDays) : prev.returnWindowDays;
        const premDisc = loadedStoreRules?.premiumCommissionDiscount !== undefined ? Number(loadedStoreRules.premiumCommissionDiscount) : prev.premiumCommissionDiscount;
        const premDelay = loadedStoreRules?.premiumSettlementDelay !== undefined ? Number(loadedStoreRules.premiumSettlementDelay) : prev.premiumSettlementDelay;

        return {
          deliveryCharge: delivery,
          freeShippingThreshold: threshold,
          appCharge: app,
          codEnabled: codOn,
          cod_handling_fee: codFee,
          commission_percentage: comm,
          fixed_fee_per_order: fixed,
          payment_collection_fee_pct: col,
          standard_shipping_fee: ship,
          shipping_paid_by: shipBy,
          reverse_shipping_fee: revShip,
          rto_charge: rto,
          gst_on_platform_fees_pct: gst,
          settlement_delay_days: delay,
          returnWindowDays: returnWin,
          premiumCommissionDiscount: premDisc,
          premiumSettlementDelay: premDelay,
          change_reason: ""
        };
      });

    } catch (err: any) {
      console.error("Failed to load platform finance configs:", err);
      setActionMsg({ text: "Could not load settings from database. Please retry.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigurations();
  }, []);

  // Synchronize both database targets atomically
  async function saveToStoreSettingsAndFinance(publishedVersionData?: any) {
    const marketplaceRulesPayload = {
      deliveryCharge: Number(formData.deliveryCharge),
      freeShippingThreshold: Number(formData.freeShippingThreshold),
      appCharge: Number(formData.appCharge),
      globalCommissionPct: Number(formData.commission_percentage),
      defaultShippingCost: Number(formData.standard_shipping_fee),
      codEnabled: Boolean(formData.codEnabled),
      fixedFee: Number(formData.fixed_fee_per_order),
      collectionFeePct: Number(formData.payment_collection_fee_pct),
      cod_handling_fee: Number(formData.cod_handling_fee),
      shipping_paid_by: formData.shipping_paid_by,
      reverseShippingFee: Number(formData.reverse_shipping_fee),
      returnProcessingFee: 0,
      rtoCharge: Number(formData.rto_charge),
      gstRatePct: Number(formData.gst_on_platform_fees_pct),
      settlementDelayDays: Number(formData.settlement_delay_days),
      returnWindowDays: Number(formData.returnWindowDays),
      premiumCommissionDiscount: Number(formData.premiumCommissionDiscount),
      premiumSettlementDelay: Number(formData.premiumSettlementDelay)
    };

    const billingPayload = {
      deliveryFee: Number(formData.deliveryCharge),
      freeDeliveryThreshold: Number(formData.freeShippingThreshold),
      packagingFee: Number(formData.appCharge),
      tax: 0
    };

    const financialRulesPayload = {
      commission_percentage: Number(formData.commission_percentage),
      fixed_fee_per_order: Number(formData.fixed_fee_per_order),
      payment_collection_fee_pct: Number(formData.payment_collection_fee_pct),
      cod_handling_fee: Number(formData.cod_handling_fee),
      standard_shipping_fee: Number(formData.standard_shipping_fee),
      reverse_shipping_fee: Number(formData.reverse_shipping_fee),
      rto_charge: Number(formData.rto_charge),
      gst_on_platform_fees_pct: Number(formData.gst_on_platform_fees_pct),
      settlement_delay_days: Number(formData.settlement_delay_days),
      customer_return_window_days: Number(formData.returnWindowDays),
      shipping_paid_by: formData.shipping_paid_by,
      tiers: {
        standard: {
          commission_pct: Number(formData.commission_percentage),
          settlement_delay_days: Number(formData.settlement_delay_days)
        },
        premium: {
          commission_pct: Math.max(0, Number(formData.commission_percentage) - Number(formData.premiumCommissionDiscount)),
          settlement_delay_days: Number(formData.premiumSettlementDelay)
        }
      }
    };

    // Save batch to Next.js server route
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          marketplace_rules: marketplaceRulesPayload,
          billing: billingPayload,
          marketplace_financial_rules: financialRulesPayload
        }
      })
    });

    // Also update Supabase store_settings directly as safety fallback
    try {
      await supabase.from("store_settings").upsert([
        { key: "marketplace_rules", value: marketplaceRulesPayload, updated_at: new Date().toISOString() },
        { key: "billing", value: billingPayload, updated_at: new Date().toISOString() },
        { key: "marketplace_financial_rules", value: financialRulesPayload, updated_at: new Date().toISOString() }
      ], { onConflict: "key" });
    } catch (_) {}
  }

  // Handle Save Draft
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      setActionMsg(null);

      const draftPayload = {
        commission_percentage: Number(formData.commission_percentage),
        fixed_fee_per_order: Number(formData.fixed_fee_per_order),
        payment_collection_fee_pct: Number(formData.payment_collection_fee_pct),
        cod_handling_fee: Number(formData.cod_handling_fee),
        standard_shipping_fee: Number(formData.standard_shipping_fee),
        reverse_shipping_fee: Number(formData.reverse_shipping_fee),
        rto_charge: Number(formData.rto_charge),
        gst_on_platform_fees_pct: Number(formData.gst_on_platform_fees_pct),
        settlement_delay_days: Number(formData.settlement_delay_days),
        shipping_paid_by: formData.shipping_paid_by,
        change_reason: formData.change_reason || "Draft configuration update",
        status: "DRAFT"
      };

      const res = await apiService.createDraftFinanceConfig(draftPayload).catch(() => null);

      if (res?.success) {
        setActionMsg({ text: `Draft Version ${res.data?.version} saved successfully!`, type: "success" });
      } else {
        // Fallback: save to store_settings draft key
        await supabase.from("store_settings").upsert({
          key: "marketplace_financial_rules_draft",
          value: draftPayload,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });
        setActionMsg({ text: "Draft configuration saved to database successfully!", type: "success" });
      }

      await loadConfigurations();
    } catch (err: any) {
      setActionMsg({ text: err.message || "Failed to save draft", type: "error" });
    } finally {
      setSavingDraft(false);
    }
  };

  // Handle Immediate Publish & Activate Now
  const handlePublishNow = async () => {
    if (!formData.change_reason.trim()) {
      setActionMsg({ text: "Please provide a Change Reason / Business Justification before publishing.", type: "error" });
      return;
    }

    try {
      setPublishing(true);
      setActionMsg(null);

      const financePayload = {
        commission_percentage: Number(formData.commission_percentage),
        fixed_fee_per_order: Number(formData.fixed_fee_per_order),
        payment_collection_fee_pct: Number(formData.payment_collection_fee_pct),
        cod_handling_fee: Number(formData.cod_handling_fee),
        standard_shipping_fee: Number(formData.standard_shipping_fee),
        reverse_shipping_fee: Number(formData.reverse_shipping_fee),
        rto_charge: Number(formData.rto_charge),
        gst_on_platform_fees_pct: Number(formData.gst_on_platform_fees_pct),
        settlement_delay_days: Number(formData.settlement_delay_days),
        shipping_paid_by: formData.shipping_paid_by,
        change_reason: formData.change_reason,
        status: "VALIDATED"
      };

      let publishedVersionNumber = activeConfig?.version ? activeConfig.version + 1 : 1;

      // 1. Try backend finance API
      let publishedSuccessfully = false;
      try {
        const draftRes = await apiService.createDraftFinanceConfig(financePayload);
        if (draftRes?.success && draftRes.data?.id) {
          const pubRes = await apiService.publishFinanceConfig(draftRes.data.id, {});
          if (pubRes?.success) {
            publishedVersionNumber = pubRes.data.version;
            publishedSuccessfully = true;
          }
        }
      } catch (backendErr) {
        console.warn("Backend publish API not reachable, using direct database update:", backendErr);
      }

      // 2. Direct Supabase platform_finance_configs sync
      try {
        // Expire older active configs
        await supabase
          .from("platform_finance_configs")
          .update({
            status: "EXPIRED",
            effective_to: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("status", "ACTIVE");

        // Insert new active configuration row
        const { data: newRow, error: insertErr } = await supabase
          .from("platform_finance_configs")
          .insert({
            version: publishedVersionNumber,
            commission_percentage: Number(formData.commission_percentage),
            fixed_fee_per_order: Number(formData.fixed_fee_per_order),
            payment_collection_fee_pct: Number(formData.payment_collection_fee_pct),
            cod_handling_fee: Number(formData.cod_handling_fee),
            standard_shipping_fee: Number(formData.standard_shipping_fee),
            reverse_shipping_fee: Number(formData.reverse_shipping_fee),
            rto_charge: Number(formData.rto_charge),
            gst_on_platform_fees_pct: Number(formData.gst_on_platform_fees_pct),
            settlement_delay_days: Number(formData.settlement_delay_days),
            shipping_paid_by: formData.shipping_paid_by,
            status: "ACTIVE",
            effective_from: new Date().toISOString(),
            change_reason: formData.change_reason,
            published_by: "Super Admin",
            created_by: "Super Admin"
          })
          .select()
          .maybeSingle();

        if (!insertErr && newRow) {
          publishedVersionNumber = newRow.version;
        }
      } catch (_) {}

      // 3. Atomically update store_settings (marketplace_rules, billing, marketplace_financial_rules)
      await saveToStoreSettingsAndFinance();

      setActionMsg({
        text: `Configuration Version ${publishedVersionNumber} successfully published and activated across production!`,
        type: "success"
      });

      // Clear change reason and reload
      setFormData(prev => ({ ...prev, change_reason: "" }));
      await loadConfigurations();

    } catch (err: any) {
      console.error("Publish error:", err);
      setActionMsg({ text: err.message || "Publication failed. Please verify database connection.", type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  // Handle Scheduled Activation
  const handleSchedulePublish = async () => {
    if (!scheduleDate) {
      setActionMsg({ text: "Please choose a future date for activation.", type: "error" });
      return;
    }

    try {
      setPublishing(true);
      const schedulePayload = {
        commission_percentage: Number(formData.commission_percentage),
        fixed_fee_per_order: Number(formData.fixed_fee_per_order),
        payment_collection_fee_pct: Number(formData.payment_collection_fee_pct),
        cod_handling_fee: Number(formData.cod_handling_fee),
        standard_shipping_fee: Number(formData.standard_shipping_fee),
        reverse_shipping_fee: Number(formData.reverse_shipping_fee),
        rto_charge: Number(formData.rto_charge),
        gst_on_platform_fees_pct: Number(formData.gst_on_platform_fees_pct),
        settlement_delay_days: Number(formData.settlement_delay_days),
        shipping_paid_by: formData.shipping_paid_by,
        change_reason: formData.change_reason || `Scheduled activation on ${scheduleDate}`,
        status: "SCHEDULED"
      };

      try {
        const draftRes = await apiService.createDraftFinanceConfig(schedulePayload);
        if (draftRes?.success && draftRes.data?.id) {
          await apiService.publishFinanceConfig(draftRes.data.id, { scheduleDate });
        }
      } catch (_) {}

      // Also record in platform_finance_configs
      const nextVer = (versions[0]?.version || 0) + 1;
      await supabase.from("platform_finance_configs").insert({
        version: nextVer,
        ...schedulePayload,
        effective_from: new Date(scheduleDate).toISOString(),
        published_by: "Super Admin",
        created_by: "Super Admin"
      });

      setActionMsg({
        text: `Version ${nextVer} scheduled for automatic activation on ${new Date(scheduleDate).toLocaleString()}.`,
        type: "success"
      });

      setScheduleModalOpen(false);
      await loadConfigurations();
    } catch (err: any) {
      setActionMsg({ text: err.message || "Scheduling failed", type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  // Handle Safe Rollback
  const handleConfirmRollback = async () => {
    if (!rollbackModalVersion) return;
    try {
      setActionMsg(null);
      setPublishing(true);

      const target = rollbackModalVersion;
      const targetVersion = target.version;
      const reason = rollbackReason || `Rollback to Version ${targetVersion}`;

      let rolledBackVersionNumber = (versions[0]?.version || 0) + 1;

      // Expire current active
      await supabase
        .from("platform_finance_configs")
        .update({
          status: "EXPIRED",
          effective_to: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("status", "ACTIVE");

      // Insert new corrective version
      await supabase
        .from("platform_finance_configs")
        .insert({
          version: rolledBackVersionNumber,
          commission_percentage: Number(target.commission_percentage),
          fixed_fee_per_order: Number(target.fixed_fee_per_order),
          payment_collection_fee_pct: Number(target.payment_collection_fee_pct),
          cod_handling_fee: Number(target.cod_handling_fee),
          standard_shipping_fee: Number(target.standard_shipping_fee),
          reverse_shipping_fee: Number(target.reverse_shipping_fee),
          rto_charge: Number(target.rto_charge),
          gst_on_platform_fees_pct: Number(target.gst_on_platform_fees_pct),
          settlement_delay_days: Number(target.settlement_delay_days),
          shipping_paid_by: target.shipping_paid_by || "CUSTOMER",
          status: "ACTIVE",
          effective_from: new Date().toISOString(),
          change_reason: `[ROLLBACK] Reverted to v${targetVersion}: ${reason}`,
          published_by: "Super Admin",
          created_by: "Super Admin"
        });

      // Update form data and sync store settings
      setFormData(prev => ({
        ...prev,
        commission_percentage: Number(target.commission_percentage),
        fixed_fee_per_order: Number(target.fixed_fee_per_order),
        payment_collection_fee_pct: Number(target.payment_collection_fee_pct),
        cod_handling_fee: Number(target.cod_handling_fee),
        standard_shipping_fee: Number(target.standard_shipping_fee),
        reverse_shipping_fee: Number(target.reverse_shipping_fee),
        rto_charge: Number(target.rto_charge),
        gst_on_platform_fees_pct: Number(target.gst_on_platform_fees_pct),
        settlement_delay_days: Number(target.settlement_delay_days),
        shipping_paid_by: target.shipping_paid_by || "CUSTOMER"
      }));

      await saveToStoreSettingsAndFinance();

      setActionMsg({
        text: `Rollback applied! Corrective Version ${rolledBackVersionNumber} created with parameters from v${targetVersion}.`,
        type: "success"
      });

      setRollbackModalVersion(null);
      setRollbackReason("");
      await loadConfigurations();
    } catch (err: any) {
      setActionMsg({ text: err.message || "Rollback failed", type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  // Instant Client-Side Simulator Calculation
  const simulation = useMemo(() => {
    const price = Math.max(0, Number(simPrice) || 0);
    const qty = Math.max(1, Number(simQuantity) || 1);
    const subtotal = price * qty;

    const deliveryFee = subtotal >= Number(formData.freeShippingThreshold) ? 0 : Number(formData.deliveryCharge);
    const platformConvenienceFee = Number(formData.appCharge);
    const isCod = simPaymentMethod === "COD";

    const codSurcharge = isCod ? Number(formData.cod_handling_fee) : 0;
    const grossCustomerPayment = subtotal + deliveryFee + platformConvenienceFee + codSurcharge;

    // Platform deductions from seller gross
    const commPct = Number(formData.commission_percentage);
    const commissionFee = Number(((subtotal * commPct) / 100).toFixed(2));
    const fixedFee = Number(Number(formData.fixed_fee_per_order).toFixed(2));

    const collectionFee = !isCod
      ? Number(((subtotal * Number(formData.payment_collection_fee_pct)) / 100).toFixed(2))
      : 0;

    let sellerShippingDeduction = 0;
    const stdShip = Number(formData.standard_shipping_fee);
    if (formData.shipping_paid_by === "SELLER") {
      sellerShippingDeduction = stdShip;
    } else if (formData.shipping_paid_by === "SHARED") {
      sellerShippingDeduction = Number((stdShip / 2).toFixed(2));
    }

    // GST on Platform Service Fees (Commission + Fixed Fee + Collection / COD Fee)
    const taxableFees = commissionFee + fixedFee + collectionFee + codSurcharge;
    const gstOnFees = Number(((taxableFees * Number(formData.gst_on_platform_fees_pct)) / 100).toFixed(2));

    const totalDeductionsFromSeller = Number((commissionFee + fixedFee + collectionFee + codSurcharge + sellerShippingDeduction + gstOnFees).toFixed(2));
    const estimatedSellerPayout = Math.max(0, Number((subtotal - totalDeductionsFromSeller).toFixed(2)));

    // Total Platform Revenue
    const platformNetRevenue = Number((commissionFee + fixedFee + collectionFee + codSurcharge + platformConvenienceFee + gstOnFees).toFixed(2));

    return {
      subtotal,
      deliveryFee,
      platformConvenienceFee,
      codSurcharge,
      grossCustomerPayment,
      commissionFee,
      fixedFee,
      collectionFee,
      sellerShippingDeduction,
      gstOnFees,
      totalDeductionsFromSeller,
      estimatedSellerPayout,
      platformNetRevenue
    };
  }, [simPrice, simQuantity, simPaymentMethod, formData]);

  if (loading) {
    return (
      <div className="p-12 space-y-6 animate-pulse">
        <div className="h-10 w-96 bg-zinc-900 rounded-2xl" />
        <div className="h-28 bg-zinc-950 border border-zinc-800 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 bg-zinc-950 border border-zinc-800 rounded-3xl" />
          <div className="lg:col-span-5 h-96 bg-zinc-950 border border-zinc-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ── UNIFIED HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-500 uppercase tracking-widest mb-1">
            <span>Marketplace Platform Architecture</span>
            <span>•</span>
            <span>Commission & Fees Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Marketplace Standard Commission & Platform Fees
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-3xl">
            Single canonical control for customer checkout delivery charges, app convenience fees, seller standard commissions, payment tariffs, return policies, real-time financial simulation, and immutable version audits.
          </p>
        </div>

        <button
          onClick={loadConfigurations}
          title="Reload active settings from database"
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Engine</span>
        </button>
      </div>

      {/* ── ACTION NOTIFICATION ALERT ─────────────────────────────────────────── */}
      {actionMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in ${
          actionMsg.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : actionMsg.type === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
        }`}>
          <div className="flex items-center gap-2.5">
            {actionMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* ── ACTIVE IN PRODUCTION VERSION BANNER ───────────────────────────────── */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-50 to-white dark:via-zinc-950 dark:to-zinc-950 p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active in Production
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Version {activeConfig?.version ?? 1}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Effective: {activeConfig?.effective_from ? new Date(activeConfig.effective_from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}
              </span>
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Marketplace Standard Commission: {formData.commission_percentage}% • Fixed Closing Fee: ₹{formData.fixed_fee_per_order}
            </h2>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Customer Delivery: ₹{formData.deliveryCharge} (Free above ₹{formData.freeShippingThreshold}) • Payment Collection: {formData.payment_collection_fee_pct}% (Prepaid) • COD Handling: ₹{formData.cod_handling_fee} • Escrow Delay: {formData.settlement_delay_days} days • Freight Paid By: <span className="font-bold text-slate-900 dark:text-zinc-200">{formData.shipping_paid_by}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 block uppercase tracking-wider">GST on Fees</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formData.gst_on_platform_fees_pct}%</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-zinc-800 mx-2" />
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 block uppercase tracking-wider">Historical Orders</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">100% Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN WORKSPACE: FORM vs LIVE SIMULATOR ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: UNIFIED COMMERCIAL RULES FORM ─────────────────────── */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-amber-500" />
                <span>Commercial Rules & Platform Parameters</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                All parameters update both customer checkout billing and seller payout settlement ledger simultaneously.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
              Single Canonical Page
            </span>
          </div>

          {/* 1. CUSTOMER CHECKOUT & DELIVERY CHARGES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Truck size={14} />
              <span>1. Customer Checkout & Delivery Charges</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Delivery Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.deliveryCharge}
                  onChange={e => setFormData({ ...formData, deliveryCharge: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Default delivery fee added at order checkout</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.freeShippingThreshold}
                  onChange={e => setFormData({ ...formData, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Cart subtotal amount required to waive delivery charge</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  App Platform Convenience Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.appCharge}
                  onChange={e => setFormData({ ...formData, appCharge: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Fixed convenience charge per customer order</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Cash On Delivery (COD) Status
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, codEnabled: !formData.codEnabled })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      formData.codEnabled
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    {formData.codEnabled ? "✅ COD Enabled" : "❌ COD Disabled"}
                  </button>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                    {formData.codEnabled ? "Customers can Pay on Delivery" : "Prepaid online only"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SELLER COMMERCIAL COMMISSION & PROCESSING TARIFFS */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Percent size={14} />
              <span>2. Seller Platform Commission & Processing Tariffs</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                  <Percent size={12} className="text-amber-500" />
                  <span>Marketplace Standard Commission (%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.commission_percentage}
                  onChange={e => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Standard vendor fee (0% = Zero commission model)</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Fixed Order Processing Fee (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.fixed_fee_per_order}
                  onChange={e => setFormData({ ...formData, fixed_fee_per_order: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Fixed closing fee per completed item</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={12} className="text-blue-500" />
                  <span>Payment Collection Fee (%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.payment_collection_fee_pct}
                  onChange={e => setFormData({ ...formData, payment_collection_fee_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Payment gateway collection fee (Prepaid orders)</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  COD Handling Surcharge (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.cod_handling_fee}
                  onChange={e => setFormData({ ...formData, cod_handling_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Applied when payment method is Cash on Delivery</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Standard Shipping Fee (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.standard_shipping_fee}
                  onChange={e => setFormData({ ...formData, standard_shipping_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Base forward logistics cost allocated per parcel</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Shipping Cost Responsible Party
                </label>
                <select
                  value={formData.shipping_paid_by}
                  onChange={e => setFormData({ ...formData, shipping_paid_by: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="CUSTOMER">CUSTOMER (No deduction from seller)</option>
                  <option value="SELLER">SELLER (Deducted from seller payout)</option>
                  <option value="ZEBALPHA">ZEBALPHA (Platform subsidized)</option>
                  <option value="SHARED">SHARED (50% seller / 50% platform)</option>
                </select>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Determines who bears forward freight charge</p>
              </div>
            </div>
          </div>

          {/* 3. LOGISTICS RETURNS & RISK PROTECTION */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <RotateCcw size={14} />
              <span>3. Logistics Returns & Risk Tariffs</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Reverse Logistics Fee (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.reverse_shipping_fee}
                  onChange={e => setFormData({ ...formData, reverse_shipping_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Charged on customer return</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  RTO Penalty Charge (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.rto_charge}
                  onChange={e => setFormData({ ...formData, rto_charge: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Courier penalty on Return-To-Origin</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                  <Lock size={12} className="text-amber-500" />
                  <span>GST on Fees (%)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="28"
                  value={formData.gst_on_platform_fees_pct}
                  onChange={e => setFormData({ ...formData, gst_on_platform_fees_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Statutory tax on platform services</p>
              </div>
            </div>
          </div>

          {/* 4. SETTLEMENT POLICY & SELLER TIERS */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Clock size={14} />
              <span>4. Settlement Policy & Seller Tiers</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Settlement Escrow Delay (Days)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="60"
                  value={formData.settlement_delay_days}
                  onChange={e => setFormData({ ...formData, settlement_delay_days: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Days after order delivery before payout is released</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Customer Return Window (Days)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="30"
                  value={formData.returnWindowDays}
                  onChange={e => setFormData({ ...formData, returnWindowDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Window after delivery during which customer can return</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Premium Tier Commission Discount (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.premiumCommissionDiscount}
                  onChange={e => setFormData({ ...formData, premiumCommissionDiscount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Discount off standard commission for Premium Tier sellers</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Premium Tier Settlement Delay (Days)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.premiumSettlementDelay}
                  onChange={e => setFormData({ ...formData, premiumSettlementDelay: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">Faster payout release window for verified Premium Tier vendors</p>
              </div>
            </div>
          </div>

          {/* 5. CHANGE REASON & BUSINESS JUSTIFICATION */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <label className="text-[11px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>Change Reason & Business Justification <span className="text-rose-500">*</span></span>
              <span className="text-[10px] font-medium text-slate-400">Recorded in immutable audit trail</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unified marketplace commission update, festival delivery charges revision"
              value={formData.change_reason}
              onChange={e => setFormData({ ...formData, change_reason: e.target.value })}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition"
            />
          </div>

          {/* 6. ACTION CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <History size={14} />
              <span>{savingDraft ? "Saving Draft..." : "Save Draft"}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setScheduleModalOpen(true)}
                disabled={savingDraft || publishing}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Calendar size={14} />
                <span>Schedule Activation</span>
              </button>

              <button
                onClick={handlePublishNow}
                disabled={savingDraft || publishing}
                className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {publishing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{publishing ? "Publishing to Production..." : "Publish & Activate Now"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LIVE FINANCIAL IMPACT SIMULATOR ─────────────────── */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-500" />
                  <span>Financial Impact Simulator</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Simulate live fee splits between platform revenue and net vendor payouts.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Simulation
              </span>
            </div>

            {/* Simulation Test Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Test Product Price (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={simPrice}
                  onChange={e => setSimPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  value={simPaymentMethod}
                  onChange={e => setSimPaymentMethod(e.target.value as "PREPAID" | "COD")}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="PREPAID">Prepaid (Razorpay)</option>
                  <option value="COD">Cash On Delivery (COD)</option>
                </select>
              </div>
            </div>

            {/* Financial Breakdown Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold">
                <span className="text-slate-600 dark:text-zinc-400">Gross Customer Payment</span>
                <span className="text-slate-900 dark:text-white font-black text-sm">₹{simulation.grossCustomerPayment.toFixed(2)}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Product Subtotal ({simQuantity} item)</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">₹{simulation.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Customer Delivery Fee</span>
                  <span className={simulation.deliveryFee === 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-semibold text-slate-700 dark:text-zinc-300"}>
                    {simulation.deliveryFee === 0 ? "₹0.00 (Waived)" : `+₹${simulation.deliveryFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>App Convenience Fee</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">+₹{simulation.platformConvenienceFee.toFixed(2)}</span>
                </div>

                {simulation.codSurcharge > 0 && (
                  <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                    <span>COD Handling Surcharge</span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">+₹{simulation.codSurcharge.toFixed(2)}</span>
                  </div>
                )}

                <div className="h-px bg-slate-200 dark:bg-zinc-800 my-2" />

                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Platform Commission ({formData.commission_percentage}%)</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {simulation.commissionFee === 0 ? "₹0.00 (0% Standard)" : `-₹${simulation.commissionFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Fixed Closing Fee</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {simulation.fixedFee === 0 ? "₹0.00" : `-₹${simulation.fixedFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>{simPaymentMethod === "COD" ? "COD Collection Fee" : `Online Gateway Fee (${formData.payment_collection_fee_pct}%)`}</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {simPaymentMethod === "COD" ? `-₹${simulation.codSurcharge.toFixed(2)}` : `-₹${simulation.collectionFee.toFixed(2)}`}
                  </span>
                </div>

                {simulation.sellerShippingDeduction > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Forward Freight ({formData.shipping_paid_by})</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">-₹{simulation.sellerShippingDeduction.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>GST on Platform Fees ({formData.gst_on_platform_fees_pct}%)</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">-₹{simulation.gstOnFees.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center text-xs font-black">
                <span className="text-amber-600 dark:text-amber-400">Total Platform Net Revenue</span>
                <span className="text-amber-600 dark:text-amber-400 text-sm">₹{simulation.platformNetRevenue.toFixed(2)}</span>
              </div>
            </div>

            {/* Estimated Net Seller Payout Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-2">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                Estimated Vendor Net Payout
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  ₹{simulation.estimatedSellerPayout.toFixed(2)}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Eligible {formData.settlement_delay_days} days post-delivery
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                Disbursed to seller via Razorpay Route once {formData.settlement_delay_days}-day return & dispute window closes.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-zinc-500 text-center font-medium pt-3 border-t border-slate-100 dark:border-zinc-900">
            Protected by Integer Minor Units (Paise) • Zero banking-point rounding divergence
          </div>
        </div>
      </div>

      {/* ── VERSION HISTORY & AUDIT LOG TABLE ───────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History size={16} className="text-amber-500" />
              <span>Version History & Audit Log</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Historical commercial configurations are immutable. Rollback creates a new corrective version.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
            {versions.length} Total Versions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">
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
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 dark:text-zinc-500 font-bold">
                    No version history recorded yet. Publishing will record Version 1.
                  </td>
                </tr>
              ) : (
                versions.map((v) => {
                  const isActive = v.status === "ACTIVE";
                  const isScheduled = v.status === "SCHEDULED";
                  const isDraft = v.status === "DRAFT";

                  return (
                    <tr key={v.id || v.version} className={isActive ? "bg-amber-500/5 font-bold" : "hover:bg-slate-50 dark:hover:bg-zinc-900/40"}>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">v{v.version}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : isScheduled
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            : isDraft
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500"
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">{v.commission_percentage}%</td>
                      <td className="py-3 px-3">₹{v.fixed_fee_per_order}</td>
                      <td className="py-3 px-3">{v.payment_collection_fee_pct}%</td>
                      <td className="py-3 px-3">₹{v.cod_handling_fee}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold">{v.shipping_paid_by || "CUSTOMER"}</td>
                      <td className="py-3 px-3">{v.settlement_delay_days}d</td>
                      <td className="py-3 px-3 text-[10px] text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {v.effective_from ? new Date(v.effective_from).toLocaleDateString("en-IN") : "-"}
                        {v.effective_to ? ` - ${new Date(v.effective_to).toLocaleDateString("en-IN")}` : " - Active"}
                      </td>
                      <td className="py-3 px-3 text-[11px] max-w-xs truncate text-slate-600 dark:text-zinc-300" title={v.change_reason}>
                        {v.change_reason || "Zebalpha Policy"}
                        <span className="block text-[9px] text-slate-400 dark:text-zinc-500">by {v.published_by || v.created_by || "Super Admin"}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!isActive && (
                          <button
                            onClick={() => {
                              setRollbackModalVersion(v);
                              setRollbackReason(`Rollback to Version ${v.version}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <RotateCcw size={10} />
                            <span>Rollback to v{v.version}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SCHEDULE MODAL ──────────────────────────────────────────────────── */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-amber-500" />
              <span>Schedule Production Activation</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Pick the future timestamp when these commercial fee parameters should become active.
            </p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePublish}
                disabled={publishing || !scheduleDate}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {publishing ? "Scheduling..." : "Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROLLBACK MODAL ──────────────────────────────────────────────────── */}
      {rollbackModalVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-rose-500" />
              <span>Rollback to Version {rollbackModalVersion.version}?</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              This will create a new corrective version duplicating all parameters from Version {rollbackModalVersion.version} and activate it immediately.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400">
                Audit Reason for Rollback
              </label>
              <input
                type="text"
                value={rollbackReason}
                onChange={e => setRollbackReason(e.target.value)}
                placeholder={`Reverting to v${rollbackModalVersion.version}`}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRollbackModalVersion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRollback}
                disabled={publishing}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {publishing ? "Applying..." : `Apply Rollback to v${rollbackModalVersion.version}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

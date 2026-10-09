"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Settings, 
  Tag, 
  Percent, 
  Truck, 
  ShieldCheck, 
  DollarSign, 
  Gift, 
  Plus, 
  Trash2, 
  Power,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Eye,
  AlertCircle,
  RotateCcw
} from "lucide-react";

export default function MarketplaceSettingsView() {
  const [activeTab, setActiveTab] = useState<"general" | "fees" | "offers" | "coupons" | "homepage">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");

  // General & Fees Marketplace Config
  const [marketplaceConfig, setMarketplaceConfig] = useState({
    marketplaceName: "ZEB-ALPHA Clothing",
    supportEmail: "support@zebalpha.com",
    supportPhone: "+91 9876543210",
    deliveryCharge: "40",
    freeShippingThreshold: "999",
    appCharge: "5",
    globalCommissionPct: "10",
    defaultShippingCost: "50",
    codEnabled: true,
    fixedFee: "15",
    collectionFeePct: "2.0",
    reverseShippingFee: "70",
    returnProcessingFee: "20",
    rtoCharge: "50",
    gstRatePct: "18.0",
    settlementDelayDays: "7",
    returnWindowDays: "7",
    premiumCommissionDiscount: "2.5",
    premiumSettlementDelay: "3",
  });

  const [products, setProducts] = useState<any[]>([]);

  // Promotional Coupons State (Persisted in DB `store_settings` key `promotional_coupons`)
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponForm, setNewCouponForm] = useState({
    code: "",
    discount: "",
    type: "Percentage",
    expiry: "",
    minOrderAmount: "0"
  });

  // Special Offers & BOGO State (Persisted in DB `store_settings` key `special_offers_list`)
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [newOfferForm, setNewOfferForm] = useState({
    title: "",
    main_product_id: "",
    bonus_product_id: "",
    discount_type: "BOGO",
    discount_pct: 100,
  });

  // Homepage Banner & Marquee State
  const [herobanners, setHeroBanners] = useState<any[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerAlt, setNewBannerAlt] = useState("");
  const [newBannerLink, setNewBannerLink] = useState("");
  const [marqueeItems, setMarqueeItems] = useState<any[]>([]);
  const [newMarqueeText, setNewMarqueeText] = useState("");
  const [newMarqueeIcon, setNewMarqueeIcon] = useState("badge");

  const notify = (msg: string, type: "success" | "error" = "success", duration = 4000) => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(""), duration);
  };

  // Helper to reliably save key-value pairs through our Next.js API (bypasses Supabase RLS with service_role)
  const saveSettingToDb = async (key: string, value: any) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Server returned ${res.status}`);
      }
      return true;
    } catch (apiErr: any) {
      console.warn(`[Settings] Server API failed for "${key}", attempting direct fallback:`, apiErr);
      const { error: directErr } = await supabase
        .from("store_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (directErr) {
        console.error(`[Settings] Direct fallback also failed:`, directErr);
        throw new Error(apiErr.message || directErr.message || "Failed to persist setting");
      }
      return true;
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      let loadedFromApi = false;

      // 1. Fetch from Next.js server API with service_role
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.settings) {
            loadedFromApi = true;
            const rulesMap = json.settings;

            if (rulesMap.marketplace_rules) {
              setMarketplaceConfig(prev => ({
                ...prev,
                ...rulesMap.marketplace_rules
              }));
            }

            if (rulesMap.marketplace_financial_rules) {
              const fin = rulesMap.marketplace_financial_rules;
              setMarketplaceConfig(prev => ({
                ...prev,
                fixedFee: String(fin.fixed_fee_per_order ?? prev.fixedFee),
                collectionFeePct: String(fin.payment_collection_fee_pct ?? prev.collectionFeePct),
                reverseShippingFee: String(fin.reverse_shipping_fee ?? prev.reverseShippingFee),
                rtoCharge: String(fin.rto_charge ?? prev.rtoCharge),
                gstRatePct: String(fin.gst_on_platform_fees_pct ?? prev.gstRatePct),
                settlementDelayDays: String(fin.settlement_delay_days ?? prev.settlementDelayDays),
                returnWindowDays: String(fin.customer_return_window_days ?? prev.returnWindowDays),
                defaultShippingCost: String(fin.standard_shipping_fee ?? prev.defaultShippingCost),
              }));
            }

            if (rulesMap.promotional_coupons) {
              setCoupons(Array.isArray(rulesMap.promotional_coupons) ? rulesMap.promotional_coupons : []);
            }

            if (rulesMap.special_offers_list) {
              setSpecialOffers(Array.isArray(rulesMap.special_offers_list) ? rulesMap.special_offers_list : []);
            }

            if (rulesMap.hero_banners) {
              setHeroBanners(Array.isArray(rulesMap.hero_banners) ? rulesMap.hero_banners : []);
            }

            if (rulesMap.marquee_banner) {
              setMarqueeItems(Array.isArray(rulesMap.marquee_banner) ? rulesMap.marquee_banner : []);
            }

            if (json.products && Array.isArray(json.products)) {
              setProducts(json.products);
            }
          }
        }
      } catch (apiErr) {
        console.warn("Could not load settings from /api/admin/settings, trying fallback:", apiErr);
      }

      // 2. Direct client query fallback if server route didn't return
      if (!loadedFromApi) {
        const { data: settingsData, error } = await supabase
          .from("store_settings")
          .select("*");

        if (!error && settingsData && settingsData.length > 0) {
          const rulesMap: Record<string, any> = {};
          settingsData.forEach(item => {
            rulesMap[item.key] = item.value;
          });

          if (rulesMap.marketplace_rules) {
            setMarketplaceConfig(prev => ({ ...prev, ...rulesMap.marketplace_rules }));
          }
          if (rulesMap.promotional_coupons) {
            setCoupons(Array.isArray(rulesMap.promotional_coupons) ? rulesMap.promotional_coupons : []);
          }
          if (rulesMap.special_offers_list) {
            setSpecialOffers(Array.isArray(rulesMap.special_offers_list) ? rulesMap.special_offers_list : []);
          }
          if (rulesMap.hero_banners) {
            setHeroBanners(Array.isArray(rulesMap.hero_banners) ? rulesMap.hero_banners : []);
          }
          if (rulesMap.marquee_banner) {
            setMarqueeItems(Array.isArray(rulesMap.marquee_banner) ? rulesMap.marquee_banner : []);
          }
        }

        // Fetch products for selector
        const { data: prodData } = await supabase.from("products").select("id, name, price");
        if (prodData) setProducts(prodData);
      }

      } catch (err: any) {
      console.error("Error loading marketplace settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save General & Fees
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await saveSettingToDb("marketplace_rules", marketplaceConfig);

      // Save complete financial ledger rules
      const financialRules = {
        commission_percentage: Number(marketplaceConfig.globalCommissionPct) || 5.0,
        fixed_fee_per_order: Number(marketplaceConfig.fixedFee) || 15.0,
        payment_collection_fee_pct: Number(marketplaceConfig.collectionFeePct) || 2.0,
        cod_handling_fee: 25.0,
        standard_shipping_fee: Number(marketplaceConfig.defaultShippingCost) || 60.0,
        reverse_shipping_fee: Number(marketplaceConfig.reverseShippingFee) || 70.0,
        rto_charge: Number(marketplaceConfig.rtoCharge) || 50.0,
        gst_on_platform_fees_pct: Number(marketplaceConfig.gstRatePct) || 18.0,
        settlement_delay_days: Number(marketplaceConfig.settlementDelayDays) || 7,
        customer_return_window_days: Number(marketplaceConfig.returnWindowDays) || 7,
        tiers: {
          standard: {
            commission_pct: Number(marketplaceConfig.globalCommissionPct) || 5.0,
            settlement_delay_days: Number(marketplaceConfig.settlementDelayDays) || 7,
          },
          premium: {
            commission_pct: Math.max(0, (Number(marketplaceConfig.globalCommissionPct) || 5.0) - (Number(marketplaceConfig.premiumCommissionDiscount) || 2.5)),
            settlement_delay_days: Number(marketplaceConfig.premiumSettlementDelay) || 3,
          }
        }
      };
      await saveSettingToDb("marketplace_financial_rules", financialRules);

      notify("🎉 Production settings & billing rules saved permanently to database!");
    } catch (err: any) {
      console.error("Save error:", err);
      notify(err.message || "Failed to save settings to database.", "error");
    } finally {
      setSaving(false);
    }
  };

  // --- COUPON HANDLERS ---
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponForm.code.trim() || !newCouponForm.discount.trim()) {
      alert("Please enter coupon code and discount value.");
      return;
    }

    const cleanCode = newCouponForm.code.trim().toUpperCase();
    if (coupons.some(c => c.code?.toUpperCase() === cleanCode)) {
      alert(`Coupon code "${cleanCode}" already exists!`);
      return;
    }

    const formattedDiscount = newCouponForm.type === "Percentage" 
      ? (newCouponForm.discount.includes("%") ? newCouponForm.discount : `${newCouponForm.discount}%`)
      : newCouponForm.type === "Flat Shipping Off"
      ? (newCouponForm.discount.startsWith("₹") ? newCouponForm.discount : `₹${newCouponForm.discount}`)
      : (newCouponForm.discount.startsWith("₹") ? newCouponForm.discount : `₹${newCouponForm.discount}`);

    const newCoupon = {
      id: `coupon_${Date.now()}`,
      code: cleanCode,
      discount: formattedDiscount,
      type: newCouponForm.type,
      expiry: newCouponForm.expiry || "2026-12-31",
      minOrderAmount: Number(newCouponForm.minOrderAmount) || 0,
      active: true,
      created_at: new Date().toISOString()
    };

    const updatedCoupons = [...coupons, newCoupon];

    try {
      await saveSettingToDb("promotional_coupons", updatedCoupons);
      setCoupons(updatedCoupons);
      setNewCouponForm({ code: "", discount: "", type: "Percentage", expiry: "", minOrderAmount: "0" });
      notify(`🎉 Promotional coupon "${cleanCode}" saved to database!`);
    } catch (err: any) {
      notify(err.message || "Failed to save coupon.", "error");
    }
  };

  const handleToggleCouponStatus = async (couponId: string | number) => {
    const updated = coupons.map(c => c.id === couponId ? { ...c, active: !c.active } : c);
    try {
      await saveSettingToDb("promotional_coupons", updated);
      setCoupons(updated);
      notify("Coupon status updated in database.");
    } catch (err: any) {
      notify(err.message || "Failed to update coupon status.", "error");
    }
  };

  const handleDeleteCoupon = async (couponId: string | number) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    const updated = coupons.filter(c => c.id !== couponId);
    try {
      await saveSettingToDb("promotional_coupons", updated);
      setCoupons(updated);
      notify("Coupon deleted permanently from database.");
    } catch (err: any) {
      notify(err.message || "Failed to delete coupon.", "error");
    }
  };

  // --- SPECIAL OFFERS HANDLERS ---
  const handleAddSpecialOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferForm.title || !newOfferForm.main_product_id) {
      alert("Please fill in offer title and select primary product.");
      return;
    }

    const updatedOffers = [
      ...specialOffers,
      {
        id: `offer_${Date.now()}`,
        ...newOfferForm,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    try {
      await saveSettingToDb("special_offers_list", updatedOffers);
      setSpecialOffers(updatedOffers);
      setNewOfferForm({ title: "", main_product_id: "", bonus_product_id: "", discount_type: "BOGO", discount_pct: 100 });
      notify("🎁 Special Offer & BOGO deal created & saved to database!");
    } catch (err: any) {
      notify(err.message || "Failed to save special offer.", "error");
    }
  };

  const handleToggleOfferStatus = async (offerId: string) => {
    const updated = specialOffers.map(o => o.id === offerId ? { ...o, is_active: !o.is_active } : o);
    try {
      await saveSettingToDb("special_offers_list", updated);
      setSpecialOffers(updated);
      notify("Offer status updated in database.");
    } catch (e: any) {
      notify(e.message || "Failed to update offer status.", "error");
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Delete this special offer?")) return;
    const updated = specialOffers.filter(o => o.id !== offerId);
    try {
      await saveSettingToDb("special_offers_list", updated);
      setSpecialOffers(updated);
      notify("Offer deleted from database.");
    } catch (e: any) {
      notify(e.message || "Failed to delete offer.", "error");
    }
  };

  // --- HOMEPAGE BANNER HANDLERS ---
  const handleAddBanner = async () => {
    if (!newBannerUrl.trim()) {
      alert("Please enter a valid image URL for the banner.");
      return;
    }
    const newBanner = {
      id: Date.now(),
      src: newBannerUrl.trim(),
      alt: newBannerAlt.trim() || "Banner Image",
      link: newBannerLink.trim() || "/"
    };
    const updated = [...herobanners, newBanner];
    try {
      await saveSettingToDb("hero_banners", updated);
      setHeroBanners(updated);
      setNewBannerUrl("");
      setNewBannerAlt("");
      setNewBannerLink("");
      notify("✅ Hero banner added! Customer homepage will reflect immediately.");
    } catch (err: any) {
      notify(err.message || "Failed to save banner.", "error");
    }
  };

  const handleDeleteBanner = async (index: number) => {
    const updated = herobanners.filter((_, idx) => idx !== index);
    try {
      await saveSettingToDb("hero_banners", updated);
      setHeroBanners(updated);
      notify("✅ Banner removed.");
    } catch (err: any) {
      notify(err.message || "Failed to delete banner.", "error");
    }
  };

  // --- MARQUEE HANDLERS ---
  const handleAddMarquee = async () => {
    if (!newMarqueeText.trim()) {
      alert("Please enter marquee text.");
      return;
    }
    const updated = [...marqueeItems, { icon: newMarqueeIcon, text: newMarqueeText.trim() }];
    try {
      await saveSettingToDb("marquee_banner", updated);
      setMarqueeItems(updated);
      setNewMarqueeText("");
      setNewMarqueeIcon("badge");
      notify("✅ Moving offer banner text updated in database!");
    } catch (err: any) {
      notify(err.message || "Failed to save marquee text.", "error");
    }
  };

  const handleDeleteMarquee = async (index: number) => {
    const updated = marqueeItems.filter((_, idx) => idx !== index);
    try {
      await saveSettingToDb("marquee_banner", updated);
      setMarqueeItems(updated);
      notify("✅ Marquee text item removed.");
    } catch (err: any) {
      notify(err.message || "Failed to delete marquee text.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Control</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Marketplace Real-Time Production Settings</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Configure delivery charges, app platform fees, seller commission %, promotional coupons & homepage banners.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === "general" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === "fees" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            Fees & Commission
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === "offers" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            Special Offers & BOGO ({specialOffers.length})
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === "coupons" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            Coupons ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab("homepage")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === "homepage" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            🏠 Homepage
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl font-bold text-xs border flex items-center justify-between transition-all ${
          statusType === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
            : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
        }`}>
          <div className="flex items-center gap-2">
            {statusType === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg("")} className="font-black px-2 hover:opacity-75 cursor-pointer">✕</button>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-sm font-black text-slate-600 dark:text-slate-300">Connecting to Database & Loading Production Settings...</span>
        </div>
      ) : (
        <>
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" />
                  General Marketplace Configuration
                </h2>
                <button
                  onClick={loadSettings}
                  title="Reload from DB"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Marketplace Name</label>
                  <input
                    type="text"
                    required
                    value={marketplaceConfig.marketplaceName}
                    onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, marketplaceName: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Support Email</label>
                    <input
                      type="email"
                      required
                      value={marketplaceConfig.supportEmail}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, supportEmail: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Support Phone</label>
                    <input
                      type="text"
                      required
                      value={marketplaceConfig.supportPhone}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, supportPhone: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="py-3.5 px-8 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving to Database..." : "Save General Settings"}
                </button>
              </form>
            </div>
          )}

          {/* FEES & COMMISSION TAB */}
          {activeTab === "fees" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-600" />
                    <span>Real-time Charges & Seller Commission Control</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Set delivery charge, app platform charge, seller commission %, and shipping costs applied real-time during customer checkout and seller payouts.
                  </p>
                </div>
                <button
                  onClick={loadSettings}
                  title="Reload from DB"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Delivery Charge (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.deliveryCharge}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, deliveryCharge: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Default delivery fee added on order checkout</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Free Delivery Threshold (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.freeShippingThreshold}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, freeShippingThreshold: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Cart subtotal amount to waive delivery charge</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>App Charge / Platform Fee (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.appCharge}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, appCharge: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Fixed convenience fee charged per completed transaction</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <span>Seller Global Commission (%)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={marketplaceConfig.globalCommissionPct}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, globalCommissionPct: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Default marketplace commission deducted from seller payout</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Default Base Shipping Cost (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.defaultShippingCost}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, defaultShippingCost: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Base shipping & logistics cost allocated per parcel dispatch</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Fixed Closing Fee (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.fixedFee}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, fixedFee: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Fixed marketplace closing fee charged per order item</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <span>Payment Collection Fee (%)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={marketplaceConfig.collectionFeePct}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, collectionFeePct: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Payment gateway collection fee (Prepaid orders)</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-500" />
                      <span>Reverse Logistics Courier Fee (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.reverseShippingFee}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, reverseShippingFee: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Reverse courier fee charged on customer returns</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>RTO Handling Charge (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.rtoCharge}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, rtoCharge: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Courier penalty charge on Return to Origin</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-indigo-500" />
                      <span>Statutory GST on Fees (%)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.gstRatePct}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, gstRatePct: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">GST on Commission, Fixed fee, and Shipping service charges</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span>Settlement Escrow Delay (Days)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.settlementDelayDays}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, settlementDelayDays: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Days after order delivery before payout becomes eligible</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-purple-500" />
                      <span>Customer Return Window (Days)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={marketplaceConfig.returnWindowDays}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, returnWindowDays: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Window after delivery during which customer can initiate return</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span>Premium Tier Commission Discount (%)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.5"
                      value={marketplaceConfig.premiumCommissionDiscount}
                      onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, premiumCommissionDiscount: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Discount off standard commission for Premium Tier sellers</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Cash On Delivery (COD)</span>
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setMarketplaceConfig({ ...marketplaceConfig, codEnabled: !marketplaceConfig.codEnabled })}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                          marketplaceConfig.codEnabled
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {marketplaceConfig.codEnabled ? "✅ COD Enabled" : "❌ COD Disabled"}
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {marketplaceConfig.codEnabled ? "Customers can choose Pay on Delivery" : "Online prepaid only"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="py-3.5 px-8 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving to Database..." : "Save Production Charges & Commission"}
                </button>
              </form>
            </div>
          )}

          {/* SPECIAL OFFERS & BOGO TAB */}
          {activeTab === "offers" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    <span>Create Special Offer & BOGO Deal</span>
                  </h2>
                  <button
                    onClick={loadSettings}
                    title="Reload from DB"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddSpecialOffer} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Offer Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Buy 1 Oversized Tee Get 1 Free (BOGO)!"
                      value={newOfferForm.title}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, title: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Offer Type</label>
                    <select
                      value={newOfferForm.discount_type}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, discount_type: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="BOGO">Buy 1 Get 1 Free (BOGO)</option>
                      <option value="PERCENTAGE">Percentage Discount (%)</option>
                      <option value="BUNDLE">Exclusive Cardholder Bundle</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Primary Product *</label>
                    <select
                      required
                      value={newOfferForm.main_product_id}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, main_product_id: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Select Main Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Bonus Free / Discounted Product</label>
                    <select
                      value={newOfferForm.bonus_product_id}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, bonus_product_id: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Select Bonus Product (Optional) --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest shadow-md cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create & Deploy Offer</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Active Special Offers & BOGO Deals ({specialOffers.length})</h3>
                {specialOffers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs italic">No active special offers configured in database.</div>
                ) : (
                  <div className="space-y-3">
                    {specialOffers.map(offer => (
                      <div key={offer.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black uppercase">{offer.discount_type}</span>
                            <h4 className="font-black text-slate-900 dark:text-white text-sm">{offer.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Primary: {products.find(p => p.id === offer.main_product_id)?.name || offer.main_product_id}
                            {offer.bonus_product_id && ` | Bonus: ${products.find(p => p.id === offer.bonus_product_id)?.name || offer.bonus_product_id}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleOfferStatus(offer.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                              offer.is_active !== false 
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" 
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                            }`}
                          >
                            {offer.is_active !== false ? "Active" : "Inactive"}
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COUPONS TAB */}
          {activeTab === "coupons" && (
            <div className="space-y-6">
              {/* Create Coupon Form */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-600" />
                    <span>Create New Promotional Coupon</span>
                  </h2>
                  <button
                    onClick={loadSettings}
                    title="Reload from DB"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WELCOME10, FESTIVE50"
                      value={newCouponForm.code}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, code: e.target.value.toUpperCase() })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-mono text-xs font-black outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Discount Value *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10%, 100, 50"
                      value={newCouponForm.discount}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, discount: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Discount Type</label>
                    <select
                      value={newCouponForm.type}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, type: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Flat Amount">Flat Amount (₹)</option>
                      <option value="Flat Shipping Off">Flat Shipping Off</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Expiry Date</label>
                    <input
                      type="date"
                      value={newCouponForm.expiry}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, expiry: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="0 for no minimum"
                      value={newCouponForm.minOrderAmount}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, minOrderAmount: e.target.value })}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-1 pt-6 flex items-center">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create & Deploy Coupon</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Coupons List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <span>Real Promotional Coupons in Database ({coupons.length})</span>
                  </h3>
                  <button 
                    onClick={loadSettings}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    title="Refresh List"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {coupons.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs italic">
                    No promotional coupons created yet. Use the form above to add your first discount coupon.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {coupons.map((c) => (
                      <div key={c.id} className="py-3.5 flex items-center justify-between text-xs font-bold gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-emerald-600 text-sm tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                              {c.code}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200 font-extrabold">{c.discount}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">({c.type})</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Expires: {c.expiry || "No Expiry"}
                            </span>
                            {c.minOrderAmount > 0 && (
                              <span>• Min Order: ₹{c.minOrderAmount}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleCouponStatus(c.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                              c.active !== false
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{c.active !== false ? "Active" : "Inactive"}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HOMEPAGE TAB */}
          {activeTab === "homepage" && (
            <div className="space-y-6">
              {/* Hero Banners Manager */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      🖼️ Hero Banner Carousel
                    </h2>
                    <p className="text-xs font-bold text-slate-500">Add banner image URLs to show on the customer homepage carousel. Changes reflect instantly.</p>
                  </div>
                  <button
                    onClick={loadSettings}
                    title="Reload from DB"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="url"
                      placeholder="Image URL (e.g. https://... or /banner.jpg)"
                      value={newBannerUrl}
                      onChange={e => setNewBannerUrl(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Alt text / description"
                      value={newBannerAlt}
                      onChange={e => setNewBannerAlt(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Target Link (e.g. /category/hoodies)"
                      value={newBannerLink}
                      onChange={e => setNewBannerLink(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  {newBannerUrl && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="w-24 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 shrink-0">
                        <img 
                          src={newBannerUrl} 
                          alt="Banner Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">Live Image Preview</span>
                    </div>
                  )}

                  <button
                    onClick={handleAddBanner}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shrink-0 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
                  >
                    + Add Banner to Carousel
                  </button>
                </div>

                {herobanners.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Current Banners ({herobanners.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {herobanners.map((b: any, i: number) => (
                        <div key={b.id || i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
                          <img 
                            src={b.src} 
                            alt={b.alt} 
                            className="w-20 h-14 object-cover rounded-xl shrink-0 border border-slate-300 dark:border-slate-700" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{b.alt}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">{b.src}</p>
                            {b.link && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex items-center gap-1 mt-0.5">
                                <ExternalLink size={10} /> {b.link}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteBanner(i)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 text-[10px] font-black hover:bg-rose-100 cursor-pointer transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">No custom banners in database yet. Customer homepage uses default fallback banners.</p>
                )}
              </div>

              {/* Marquee Banner Manager */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      📢 Moving Offer Banner Text
                    </h2>
                    <p className="text-xs font-bold text-slate-500">Manage the scrolling marquee text items shown at the top of the customer storefront.</p>
                  </div>
                  <button
                    onClick={loadSettings}
                    title="Reload from DB"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. Free Delivery on orders above ₹999 | 100% Premium Bio-Washed Cotton"
                      value={newMarqueeText}
                      onChange={e => setNewMarqueeText(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <select
                      value={newMarqueeIcon}
                      onChange={e => setNewMarqueeIcon(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="badge">✅ Badge (Quality Verified)</option>
                      <option value="truck">🚚 Truck (Fast Delivery)</option>
                      <option value="tag">🏷️ Tag (Special Offer)</option>
                      <option value="leaf">🌿 Leaf (Organic / Sustainable)</option>
                      <option value="chef">👨‍🍳 Star (Curated Collection)</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddMarquee}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shrink-0 self-start cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
                  >
                    + Add Marquee Text
                  </button>
                </div>

                {marqueeItems.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Current Marquee Items ({marqueeItems.length})</p>
                    <div className="space-y-2">
                      {marqueeItems.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{m.icon === "truck" ? "🚚" : m.icon === "tag" ? "🏷️" : m.icon === "leaf" ? "🌿" : m.icon === "chef" ? "⭐" : "✅"}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{m.text}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteMarquee(i)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 text-[10px] font-black hover:bg-rose-100 cursor-pointer transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">No custom marquee items in database yet. Customer storefront uses default scrolling items.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

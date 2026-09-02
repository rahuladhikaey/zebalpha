"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Settings, 
  Tag, 
  Percent, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  Gift, 
  Sparkles, 
  CreditCard,
  Plus,
  RefreshCw
} from "lucide-react";

export default function MarketplaceSettingsView() {
  const [activeTab, setActiveTab] = useState<"general" | "fees" | "offers" | "coupons" | "homepage">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const [marketplaceConfig, setMarketplaceConfig] = useState({
    marketplaceName: "Asali Swad Marketplace",
    supportEmail: "support@asaliswad.com",
    supportPhone: "+91 9876543210",
    deliveryCharge: "40",
    freeShippingThreshold: "999",
    appCharge: "5",
    globalCommissionPct: "10",
    defaultShippingCost: "50",
    codEnabled: true,
  });

  const [products, setProducts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([
    { id: 1, code: "WELCOME10", discount: "10%", type: "Percentage", expiry: "2026-12-31", active: true },
    { id: 2, code: "FREESHIP", discount: "₹99", type: "Flat Shipping Off", expiry: "2026-10-15", active: true },
  ]);

  // Special Offers & BOGO State
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
  const [marqueeItems, setMarqueeItems] = useState<any[]>([]);
  const [newMarqueeText, setNewMarqueeText] = useState("");
  const [newMarqueeIcon, setNewMarqueeIcon] = useState("badge");

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Fetch store settings from Supabase DB
      const { data: settingsData } = await supabase
        .from("store_settings")
        .select("*");

      if (settingsData && settingsData.length > 0) {
        const rulesMap: Record<string, any> = {};
        settingsData.forEach(item => {
          rulesMap[item.key] = item.value;
        });

        if (rulesMap.marketplace_rules) {
          setMarketplaceConfig(prev => ({
            ...prev,
            ...rulesMap.marketplace_rules
          }));
        }

        if (rulesMap.special_offers_list) {
          setSpecialOffers(rulesMap.special_offers_list || []);
        }

        if (rulesMap.hero_banners) {
          setHeroBanners(rulesMap.hero_banners || []);
        }

        if (rulesMap.marquee_banner) {
          setMarqueeItems(rulesMap.marquee_banner || []);
        }
      }

      // Fetch products for BOGO offer selector
      const { data: prodData } = await supabase.from("products").select("id, name, price");
      setProducts(prodData || []);
    } catch (err: any) {
      console.error("Error loading marketplace settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");

    try {
      // Save as 'marketplace_rules' (superadmin internal usage)
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          key: "marketplace_rules",
          value: marketplaceConfig,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also save as 'billing' key so Customer checkout/cart picks up these values
      const billingPayload = {
        deliveryFee: Number(marketplaceConfig.deliveryCharge) || 29,
        freeDeliveryThreshold: Number(marketplaceConfig.freeShippingThreshold) || 999,
        packagingFee: Number(marketplaceConfig.appCharge) || 9,
        tax: 3
      };
      await supabase
        .from("store_settings")
        .upsert({
          key: "billing",
          value: billingPayload,
          updated_at: new Date().toISOString()
        });

      setStatusMsg("🎉 Production marketplace charges, commission % & rules updated in real-time DB! Customer checkout will reflect these changes immediately.");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save settings to database.");
    } finally {
      setSaving(false);
    }
  };

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
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          key: "special_offers_list",
          value: updatedOffers,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSpecialOffers(updatedOffers);
      setNewOfferForm({ title: "", main_product_id: "", bonus_product_id: "", discount_type: "BOGO", discount_pct: 100 });
      setStatusMsg("🎁 New Special Offer & BOGO deal created in production DB!");
    } catch (err: any) {
      alert(err.message || "Failed to save special offer.");
    }
  };

  const handleToggleOfferStatus = async (offerId: string) => {
    const updated = specialOffers.map(o => o.id === offerId ? { ...o, is_active: !o.is_active } : o);
    try {
      await supabase.from("store_settings").upsert({
        key: "special_offers_list",
        value: updated,
        updated_at: new Date().toISOString()
      });
      setSpecialOffers(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    const updated = specialOffers.filter(o => o.id !== offerId);
    try {
      await supabase.from("store_settings").upsert({
        key: "special_offers_list",
        value: updated,
        updated_at: new Date().toISOString()
      });
      setSpecialOffers(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Control</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Marketplace Real-Time Production Settings</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Configure delivery charges, app platform fees, seller commission %, shipping costs & Special Offers/BOGO.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === "general" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === "fees" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}
          >
            Fees & Commission
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === "offers" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}
          >
            Special Offers & BOGO ({specialOffers.length})
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === "coupons" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}
          >
            Coupons ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab("homepage")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === "homepage" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}
          >
            🏠 Homepage
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-emerald-800">✕</button>
        </div>
      )}

      {/* GENERAL TAB */}
      {activeTab === "general" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            General Marketplace Configuration
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Marketplace Name</label>
              <input
                type="text"
                value={marketplaceConfig.marketplaceName}
                onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, marketplaceName: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Support Email</label>
                <input
                  type="email"
                  value={marketplaceConfig.supportEmail}
                  onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, supportEmail: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Support Phone</label>
                <input
                  type="text"
                  value={marketplaceConfig.supportPhone}
                  onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, supportPhone: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-3 px-6 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              {saving ? "Saving..." : "Save General Settings"}
            </button>
          </form>
        </div>
      )}

      {/* FEES & COMMISSION TAB */}
      {activeTab === "fees" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-3xl space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-emerald-600" />
              <span>Real-time Charges & Seller Commission Control</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Set delivery charge, app platform charge, seller commission %, and shipping costs applied real-time during customer checkout and seller payouts.
            </p>
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
                  value={marketplaceConfig.globalCommissionPct}
                  onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, globalCommissionPct: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Default marketplace commission deducted from seller payout</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Default Base Shipping Cost (₹)</span>
                </label>
                <input
                  type="number"
                  value={marketplaceConfig.defaultShippingCost}
                  onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, defaultShippingCost: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 text-sm font-black outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Base shipping & logistics cost allocated per parcel dispatch</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-3.5 px-8 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
            >
              {saving ? "Saving Changes..." : "Save Production Charges & Commission"}
            </button>
          </form>
        </div>
      )}

      {/* SPECIAL OFFERS & BOGO TAB */}
      {activeTab === "offers" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              <span>Create Special Offer & BOGO Deal</span>
            </h2>

            <form onSubmit={handleAddSpecialOffer} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Offer Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buy 1 Pure Honey Get 1 Spice Free!"
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
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Deploy Offer</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Active Special Offers & BOGO Deals</h3>
            {specialOffers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">No active special offers configured.</div>
            ) : (
              <div className="space-y-3">
                {specialOffers.map(offer => (
                  <div key={offer.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">{offer.discount_type}</span>
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
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${offer.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                      >
                        {offer.is_active ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Delete Offer"
                      >
                        ✕
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            Promotional Coupons & Discounts
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {coupons.map(c => (
              <div key={c.id} className="py-3 flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="font-mono font-black text-emerald-600 text-sm">{c.code}</span>
                  <p className="text-slate-500 font-medium">{c.discount} ({c.type}) • Expires: {c.expiry}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOMEPAGE TAB */}
      {activeTab === "homepage" && (
        <div className="space-y-6">
          {/* Hero Banners Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              🖼️ Hero Banner Carousel
            </h2>
            <p className="text-xs font-bold text-slate-500">Add banner image URLs to show on the customer homepage carousel. Changes reflect instantly.</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  placeholder="Image URL (e.g., https://supabase.co/...)"
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
              </div>
              <button
                onClick={async () => {
                  if (!newBannerUrl.trim()) return;
                  const updated = [...herobanners, { id: Date.now(), src: newBannerUrl.trim(), alt: newBannerAlt.trim() || "Banner Image" }];
                  setHeroBanners(updated);
                  setNewBannerUrl("");
                  setNewBannerAlt("");
                  await supabase.from("store_settings").upsert({ key: "hero_banners", value: updated, updated_at: new Date().toISOString() });
                  setStatusMsg("✅ Hero banners updated! Customer homepage will reflect immediately.");
                  setTimeout(() => setStatusMsg(""), 3000);
                }}
                className="px-5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shrink-0 self-start"
              >
                + Add Banner
              </button>
            </div>

            {herobanners.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Current Banners ({herobanners.length})</p>
                {herobanners.map((b: any, i: number) => (
                  <div key={b.id || i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3">
                    <img src={b.src} alt={b.alt} className="w-16 h-10 object-cover rounded-xl shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{b.alt}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">{b.src}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const updated = herobanners.filter((_, idx) => idx !== i);
                        setHeroBanners(updated);
                        await supabase.from("store_settings").upsert({ key: "hero_banners", value: updated, updated_at: new Date().toISOString() });
                        setStatusMsg("✅ Banner removed.");
                        setTimeout(() => setStatusMsg(""), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400 italic">No custom banners added yet. Customer homepage uses default local images.</p>
            )}
          </div>

          {/* Marquee Banner Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              📢 Moving Offer Banner Text
            </h2>
            <p className="text-xs font-bold text-slate-500">Manage the scrolling marquee text items shown at the top of the customer homepage.</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="e.g., Free Delivery on orders above ₹499"
                  value={newMarqueeText}
                  onChange={e => setNewMarqueeText(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
                <select
                  value={newMarqueeIcon}
                  onChange={e => setNewMarqueeIcon(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                >
                  <option value="badge">✅ Badge (Quality)</option>
                  <option value="chef">👨‍🍳 Chef (Curated)</option>
                  <option value="leaf">🌿 Leaf (Fresh)</option>
                  <option value="truck">🚚 Truck (Delivery)</option>
                  <option value="tag">🏷️ Tag (Offer)</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!newMarqueeText.trim()) return;
                  const updated = [...marqueeItems, { icon: newMarqueeIcon, text: newMarqueeText.trim() }];
                  setMarqueeItems(updated);
                  setNewMarqueeText("");
                  setNewMarqueeIcon("badge");
                  await supabase.from("store_settings").upsert({ key: "marquee_banner", value: updated, updated_at: new Date().toISOString() });
                  setStatusMsg("✅ Marquee banner updated! Customer homepage will reflect immediately.");
                  setTimeout(() => setStatusMsg(""), 3000);
                }}
                className="px-5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shrink-0 self-start"
              >
                + Add Text
              </button>
            </div>

            {marqueeItems.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Current Marquee Items ({marqueeItems.length})</p>
                {marqueeItems.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-2xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.icon === "chef" ? "👨‍🍳" : m.icon === "leaf" ? "🌿" : m.icon === "truck" ? "🚚" : m.icon === "tag" ? "🏷️" : "✅"}</span>
                      <span className="text-xs font-bold text-slate-700">{m.text}</span>
                    </div>
                    <button
                      onClick={async () => {
                        const updated = marqueeItems.filter((_, idx) => idx !== i);
                        setMarqueeItems(updated);
                        await supabase.from("store_settings").upsert({ key: "marquee_banner", value: updated, updated_at: new Date().toISOString() });
                        setStatusMsg("✅ Marquee item removed.");
                        setTimeout(() => setStatusMsg(""), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400 italic">No custom marquee items. Customer homepage uses default text.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

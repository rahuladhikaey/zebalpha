"use client";

import { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabaseClient";
import { 
  CreditCard, 
  Coins, 
  Calendar, 
  Gift, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Mail, 
  Phone, 
  Sparkles, 
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";

export default function AsCardsLoyaltyView() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"cards" | "offers">("cards");
  const [statusMessage, setStatusMessage] = useState("");

  // New Card Modal State
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    name: "",
    email: "",
    phone: "",
    card_type: "Alpha Silver",
    coins: 250,
    expires_in_days: 365,
  });

  // Special Offer / BOGO State
  const [selectedMainProduct, setSelectedMainProduct] = useState<string>("");
  const [selectedOfferProducts, setSelectedOfferProducts] = useState<string[]>([]);
  const [activeOffer, setActiveOffer] = useState<{
    mainProductId: string;
    offerProductIds: string[];
    isActive: boolean;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Real Card Applications from Secure Admin API
      const cardsRes = await fetch("/api/admin/cards");
      const cardsJson = await cardsRes.json();
      if (cardsJson.success) {
        setApplications(cardsJson.data || []);
      } else {
        console.warn("API card_applications fetch notice:", cardsJson.message);
        setApplications([]);
      }

      // 2. Fetch Products
      const { data: pData } = await supabaseAdmin.from("products").select("id, name, price");
      setProducts(pData || []);

      // 3. Fetch Active Special Offer / BOGO from store_settings
      const { data: offerData } = await supabaseAdmin
        .from("store_settings")
        .select("value")
        .eq("key", "special_offers_bogo")
        .maybeSingle();

      if (offerData?.value) {
        setActiveOffer(offerData.value);
        if (offerData.value.mainProductId) {
          setSelectedMainProduct(offerData.value.mainProductId.toString());
          setSelectedOfferProducts(offerData.value.offerProductIds || []);
        }
      }
    } catch (e: any) {
      console.error("Error loading Alpha Cards real data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription for zero-delay card applications updates
    const channel = supabase
      .channel("admin-card-apps-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "card_applications" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };

      // Auto-assign card number and expiry when approving
      if (status === "APPROVED") {
        const existing = applications.find(a => a.id === appId);
        if (!existing?.card_number) {
          updates.card_number = `ALP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100000 + Math.random() * 900000)}`;
        }
        if (!existing?.expires_at) {
          updates.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        }
        if (!existing?.coins || existing.coins === 0) {
          updates.coins = 250;
        }
      }

      const response = await fetch("/api/admin/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, updates })
      });
      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to update status");

      setApplications(applications.map(app => app.id === appId ? { ...app, ...updates } : app));
      setStatusMessage(`💳 Alpha Card application ${status === "APPROVED" ? `approved! Card No: ${updates.card_number || "existing"}` : `marked as ${status}`} in real-time database.`);
    } catch (err: any) {
      alert(err.message || "Failed to update status in database.");
    }
  };

  const handleUpdateRenewDate = async (appId: string, dateStr: string) => {
    try {
      const expiresAt = new Date(dateStr).toISOString();
      const response = await fetch("/api/admin/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, updates: { expires_at: expiresAt, updated_at: new Date().toISOString() } })
      });
      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to update expiration date");

      setApplications(applications.map(app => app.id === appId ? { ...app, expires_at: expiresAt } : app));
      setStatusMessage("📅 Expiration date updated in real-time database.");
    } catch (err: any) {
      alert(err.message || "Failed to update expiration date.");
    }
  };

  const handleUpdateCoins = async (appId: string, coinsVal: number) => {
    try {
      const response = await fetch("/api/admin/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, updates: { coins: coinsVal, updated_at: new Date().toISOString() } })
      });
      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to update coins");

      setApplications(applications.map(app => app.id === appId ? { ...app, coins: coinsVal } : app));
      setStatusMessage("🪙 Alpha Coins balance updated in database.");
    } catch (err: any) {
      alert(err.message || "Failed to update coins.");
    }
  };

  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cardNumber = `ALP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100000 + Math.random() * 900000)}`;
      const expiresAt = new Date(Date.now() + newCardForm.expires_in_days * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCardForm.name,
          email: newCardForm.email,
          phone: newCardForm.phone,
          card_type: newCardForm.card_type,
          card_number: cardNumber,
          coins: newCardForm.coins,
          status: "APPROVED",
          expires_at: expiresAt,
          applied_at: new Date().toISOString()
        })
      });
      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to issue new card");
      const data = resJson.data;

      setShowNewCardModal(false);
      setNewCardForm({ name: "", email: "", phone: "", card_type: "Alpha Silver", coins: 250, expires_in_days: 365 });
      setStatusMessage(`🎉 Issued new Alpha Card (${cardNumber}) to ${data.name}!`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue new card.");
    }
  };

  const handleSaveActiveOffer = async () => {
    if (!selectedMainProduct) {
      alert("Please select a primary main product for the offer.");
      return;
    }
    const offerPayload = {
      mainProductId: selectedMainProduct,
      offerProductIds: selectedOfferProducts,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    try {
      const { error } = await supabaseAdmin
        .from("store_settings")
        .upsert({
          key: "special_offers_bogo",
          value: offerPayload,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setActiveOffer(offerPayload);
      setStatusMessage("🎁 Cardholder exclusive BOGO & bundle offer persisted to production database!");
    } catch (err: any) {
      alert(err.message || "Failed to save offer settings.");
    }
  };

  const handleToggleOfferProduct = (productId: string) => {
    if (selectedOfferProducts.includes(productId)) {
      setSelectedOfferProducts(selectedOfferProducts.filter((id) => id !== productId));
    } else {
      setSelectedOfferProducts([...selectedOfferProducts, productId]);
    }
  };

  const filteredApps = applications.filter((app) => {
    const query = searchQuery.toLowerCase();
    return (
      (app.name || "").toLowerCase().includes(query) ||
      (app.email || "").toLowerCase().includes(query) ||
      (app.phone || "").toLowerCase().includes(query) ||
      (app.card_number || app.cardNumber || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950 border border-zinc-800 text-white p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <CreditCard className="w-4 h-4 text-white" />
            <span>ZEB-ALPHA PRIVILEGE CLUB (Real-time DB Active)</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Alpha Cards & Loyalty Program</h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            Approve Alpha Card applications, adjust reward coins, manage card validity, and activate member-exclusive promotions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-black text-xs font-black hover:bg-zinc-200 shadow-xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Alpha Card</span>
          </button>
          <div className="flex items-center bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab("cards")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "cards" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
              }`}
            >
              Alpha Cards ({applications.length})
            </button>
            <button
              onClick={() => setActiveTab("offers")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "offers" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
              }`}
            >
              Special Offers & BOGO
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-white text-xs font-bold flex items-center justify-between shadow-xl">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {activeTab === "cards" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member applications by Name, Email, Phone, or Alpha Card Number..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white outline-none focus:border-white transition-colors"
              />
            </div>
            <button
              onClick={loadData}
              className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Refresh Real-time Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase font-black tracking-wider text-zinc-400">
                    <th className="px-6 py-4">Cardholder</th>
                    <th className="px-6 py-4">Card Details</th>
                    <th className="px-6 py-4">Alpha Coins</th>
                    <th className="px-6 py-4">Renewal / Expiry</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-xs font-medium text-zinc-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-bold">
                        Loading Alpha Card applications from database...
                      </td>
                    </tr>
                  ) : filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-bold">
                        No Alpha Card applications found in database.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{app.name}</div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{app.email || "N/A"}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{app.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-black text-[10px] uppercase">
                            {app.card_type || app.cardType || "Alpha Privilege"}
                          </span>
                          <div className="text-[11px] text-zinc-400 font-mono mt-1">
                            {app.card_number || app.cardNumber || "Pending Assignment"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-white" />
                            <input
                              type="number"
                              value={app.coins || 0}
                              onChange={(e) => handleUpdateCoins(app.id, Number(e.target.value))}
                              className="w-20 bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-white"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <input
                              type="date"
                              value={(app.expires_at || app.expiresAt) ? (app.expires_at || app.expiresAt).split("T")[0] : ""}
                              onChange={(e) => handleUpdateRenewDate(app.id, e.target.value)}
                              className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2 py-1 text-xs font-medium outline-none focus:border-white"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            app.status === "APPROVED" 
                              ? "bg-white text-black font-extrabold"
                              : app.status === "REJECTED"
                              ? "bg-rose-950/80 border border-rose-800 text-rose-300"
                              : "bg-zinc-900 border border-zinc-700 text-zinc-300"
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleUpdateStatus(app.id, "APPROVED")}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                            title="Approve Alpha Card"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(app.id, "REJECTED")}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-rose-950 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Reject Application"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-6 space-y-6 shadow-2xl">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-white" />
              <span>Alpha Cardholder Exclusive Bundle & BOGO Builder</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select an anchor main product and map bonus offer products that Alpha Cardholders unlock at checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-400">
                1. Primary Anchor Product
              </label>
              <select
                value={selectedMainProduct}
                onChange={(e) => setSelectedMainProduct(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-white transition-colors cursor-pointer font-bold"
              >
                <option value="">-- Select Main Anchor Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-400">
                2. Select Bonus Bundle Products
              </label>
              <div className="max-h-56 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-2">
                {products.map((p) => {
                  const isSelected = selectedOfferProducts.includes(p.id.toString());
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleOfferProduct(p.id.toString())}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isSelected
                          ? "bg-white text-black border-white"
                          : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[11px] opacity-70">₹{p.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              onClick={handleSaveActiveOffer}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs transition-all active:scale-95 shadow-xl shadow-white/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Save & Activate Alpha Loyalty Offer</span>
            </button>
          </div>
        </div>
      )}

      {/* Issue New Card Modal */}
      {showNewCardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-white" />
                <span>Issue New Alpha Privilege Card</span>
              </h3>
              <button onClick={() => setShowNewCardModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateNewCard} className="space-y-3 text-xs font-bold">
              <div>
                <label className="text-[10px] uppercase text-zinc-400">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Cardholder Name"
                  value={newCardForm.name}
                  onChange={(e) => setNewCardForm({ ...newCardForm, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-zinc-400">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={newCardForm.phone}
                    onChange={(e) => setNewCardForm({ ...newCardForm, phone: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newCardForm.email}
                    onChange={(e) => setNewCardForm({ ...newCardForm, email: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-zinc-400">Initial Alpha Coins</label>
                  <input
                    type="number"
                    value={newCardForm.coins}
                    onChange={(e) => setNewCardForm({ ...newCardForm, coins: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400">Validity (Days)</label>
                  <input
                    type="number"
                    value={newCardForm.expires_in_days}
                    onChange={(e) => setNewCardForm({ ...newCardForm, expires_in_days: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCardModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-white text-black font-black hover:bg-zinc-200 shadow-xl cursor-pointer"
                >
                  Issue Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

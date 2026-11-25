"use client";

import { useEffect, useState, useCallback } from "react";

type SubTab = "overview" | "orders" | "products" | "sellers" | "pincodes" | "categories";

export default function GoAlphaCommandCenterView() {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Add new pincode form
  const [newPin, setNewPin] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCorridor, setNewCorridor] = useState("Sealdah-Krishnanagar");

  // Create Main Category & Subcategory forms
  const [newMainCatName, setNewMainCatName] = useState("");
  const [newMainCatDesc, setNewMainCatDesc] = useState("");
  const [newSubGroup, setNewSubGroup] = useState("Women's Innerwear");
  const [newSubName, setNewSubName] = useState("");
  const [newSubKeywords, setNewSubKeywords] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/go-alpha", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const patchAction = async (payload: Record<string, any>) => {
    await fetch("/api/go-alpha", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadData();
  };

  const handleAddPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/go-alpha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_pincode",
        pincode: newPin,
        area_name: newArea,
        city: newCity,
        corridor_name: newCorridor,
      }),
    });
    if (res.ok) {
      setNewPin("");
      setNewArea("");
      setNewCity("");
      await loadData();
    }
  };

  const handleCreateMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/go-alpha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_main_category",
        name: newMainCatName,
        description: newMainCatDesc,
      }),
    });
    if (res.ok) {
      setNewMainCatName("");
      setNewMainCatDesc("");
      await loadData();
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/go-alpha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_subcategory",
        category_group: newSubGroup,
        name: newSubName,
        keywords: newSubKeywords,
      }),
    });
    if (res.ok) {
      setNewSubName("");
      setNewSubKeywords("");
      await loadData();
    }
  };

  const stats = data?.stats || {
    totalRevenue: 0,
    totalCommission: 0,
    totalOrders: 0,
    activeUsers: 0,
    activeProducts: 0,
    totalSellers: 0,
    activePincodes: 0,
    onTimeSlaPct: 100,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-950/60 via-zinc-950 to-zinc-950 p-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-400">
            ⚡ Isolated Quick Commerce Engine (go_alpha schema)
          </span>
          <h1 className="mt-2 text-2xl font-black text-white">GOα Quick Commerce Command Center</h1>
          <p className="text-xs text-zinc-400">
            100% isolated from ZebAlpha — separate orders, revenue, sellers, users, and 5–6 hr SLA tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="rounded-xl bg-white px-4 py-2 text-xs font-black text-black hover:bg-zinc-200 cursor-pointer"
        >
          Refresh Live Data
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "overview", label: "Overview & Revenue" },
            { id: "orders", label: `GOα Orders (${(data?.orders || []).length})` },
            { id: "products", label: `Live Products (${(data?.products || []).length})` },
            { id: "sellers", label: `GOα Sellers (${(data?.sellers || []).length})` },
            { id: "pincodes", label: `Pincode Corridors (${(data?.pincodes || []).length})` },
            { id: "categories", label: `Allowed Subcategories (${(data?.subcategories || []).length})` },
          ] as Array<{ id: SubTab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${subTab === t.id
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="p-8 text-xs text-zinc-400">Loading GOα Quick Commerce data...</div>
      ) : (
        <>
          {subTab === "overview" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "GOα Total GMV / Revenue", value: `₹${stats.totalRevenue.toFixed(0)}`, sub: `Commission: ₹${stats.totalCommission.toFixed(0)}` },
                { label: "GOα Orders (5–6 Hr)", value: stats.totalOrders, sub: `On-Time SLA: ${stats.onTimeSlaPct}%` },
                { label: "Active GOα Users", value: stats.activeUsers, sub: "Unique express buyers" },
                { label: "GOα Live Catalog & Zones", value: `${stats.activeProducts} Items`, sub: `${stats.totalSellers} Sellers • ${stats.activePincodes} Pincodes` },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{kpi.value}</p>
                  <p className="mt-1 text-xs text-orange-400 font-semibold">{kpi.sub}</p>
                </div>
              ))}
            </div>
          )}

          {subTab === "orders" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-black">Order #</th>
                    <th className="px-4 py-3 font-black">Customer</th>
                    <th className="px-4 py-3 font-black">Pincode</th>
                    <th className="px-4 py-3 font-black">Amount</th>
                    <th className="px-4 py-3 font-black">Promised By (6 Hr)</th>
                    <th className="px-4 py-3 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {(data?.orders || []).map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 font-black text-white">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{o.customer_name}</div>
                        <div className="text-[11px] text-zinc-400">{o.phone}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-orange-400">{o.delivery_pincode}</td>
                      <td className="px-4 py-3 font-black text-emerald-400">₹{o.total_amount}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {o.promised_delivery_at ? new Date(o.promised_delivery_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.order_status}
                          onChange={(e) => patchAction({ action: "update_order_status", id: o.id, order_status: e.target.value })}
                          className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs font-bold text-white"
                        >
                          {["PLACED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {(data?.orders || []).length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No GOα orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {subTab === "products" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-black">Product</th>
                    <th className="px-4 py-3 font-black">Category</th>
                    <th className="px-4 py-3 font-black">Price</th>
                    <th className="px-4 py-3 font-black">Stock</th>
                    <th className="px-4 py-3 font-black">Pickup Pincode</th>
                    <th className="px-4 py-3 font-black text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {(data?.products || []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 flex items-center gap-2.5">
                        <img src={p.image_url || "/official-logo.png"} alt={p.title} className="h-9 w-9 rounded-lg object-cover bg-zinc-900" />
                        <span className="font-bold text-white">{p.title}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{p.category_group}</td>
                      <td className="px-4 py-3 font-black text-white">₹{p.go_alpha_price}</td>
                      <td className="px-4 py-3 text-zinc-300">{p.go_alpha_stock}</td>
                      <td className="px-4 py-3 font-bold text-orange-400">{p.pickup_pincode}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => patchAction({ action: "toggle_product", id: p.id, is_active: !p.is_active })}
                          className={`rounded-lg px-3 py-1 text-[11px] font-black cursor-pointer ${p.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                            }`}
                        >
                          {p.is_active ? "ACTIVE" : "PAUSED"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subTab === "sellers" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-black">Store Name</th>
                    <th className="px-4 py-3 font-black">Pickup Pincode</th>
                    <th className="px-4 py-3 font-black">Serviceable Pincodes</th>
                    <th className="px-4 py-3 font-black text-right">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {(data?.sellers || []).map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-bold text-white">{s.store_name}</td>
                      <td className="px-4 py-3 font-bold text-orange-400">{s.pickup_pincode}</td>
                      <td className="px-4 py-3 text-zinc-400">{(s.serviceable_pincodes || []).join(", ")}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => patchAction({ action: "toggle_seller", id: s.id, is_approved: !s.is_approved })}
                          className={`rounded-lg px-3 py-1 text-[11px] font-black cursor-pointer ${s.is_approved ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            }`}
                        >
                          {s.is_approved ? "APPROVED" : "SUSPENDED"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subTab === "pincodes" && (
            <div className="space-y-4">
              <form onSubmit={handleAddPincode} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 grid sm:grid-cols-5 gap-3">
                <input
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Pincode (e.g. 741101)"
                  className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Area Name"
                  className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="City / District"
                  className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
                <input
                  value={newCorridor}
                  onChange={(e) => setNewCorridor(e.target.value)}
                  placeholder="Corridor Name"
                  className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
                <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                  + Add Pincode
                </button>
              </form>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-black">Pincode</th>
                      <th className="px-4 py-3 font-black">Area</th>
                      <th className="px-4 py-3 font-black">City</th>
                      <th className="px-4 py-3 font-black">Corridor</th>
                      <th className="px-4 py-3 font-black text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {(data?.pincodes || []).map((p: any) => (
                      <tr key={p.pincode}>
                        <td className="px-4 py-2.5 font-black text-orange-400">{p.pincode}</td>
                        <td className="px-4 py-2.5 font-bold text-white">{p.area_name}</td>
                        <td className="px-4 py-2.5 text-zinc-300">{p.city}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{p.corridor_name}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => patchAction({ action: "toggle_pincode", pincode: p.pincode, is_active: !p.is_active })}
                              className={`rounded-lg px-3 py-1 text-[10px] font-black cursor-pointer ${p.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                                }`}
                            >
                              {p.is_active ? "ACTIVE" : "OFF"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete pincode ${p.pincode} (${p.area_name})?`)) {
                                  void patchAction({ action: "delete_pincode", pincode: p.pincode });
                                }
                              }}
                              className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[10px] font-black text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === "categories" && (
            <div className="space-y-6">
              {/* Create Main Category */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                <h3 className="text-sm font-black text-white">1. Main Categories ({(data?.mainCategories || []).length})</h3>
                <form onSubmit={handleCreateMainCategory} className="grid sm:grid-cols-3 gap-3">
                  <input
                    required
                    value={newMainCatName}
                    onChange={(e) => setNewMainCatName(e.target.value)}
                    placeholder="Main Category Name (e.g. Women's Innerwear)"
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={newMainCatDesc}
                    onChange={(e) => setNewMainCatDesc(e.target.value)}
                    placeholder="Short Description (optional)"
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                  <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                    + Create Main Category
                  </button>
                </form>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(data?.mainCategories || []).map((mc: any) => (
                    <div key={mc.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                      <div>
                        <p className="text-sm font-black text-white">{mc.name}</p>
                        {mc.description && <p className="text-[11px] text-zinc-400 line-clamp-1">{mc.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => patchAction({ action: "toggle_main_category", id: mc.id, is_active: !mc.is_active })}
                        className={`rounded-xl px-3 py-1.5 text-[11px] font-black cursor-pointer ${mc.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                          }`}
                      >
                        {mc.is_active ? "ACTIVE" : "OFF"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Subcategory */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                <h3 className="text-sm font-black text-white">2. Allowed Subcategories ({(data?.subcategories || []).length})</h3>
                <form onSubmit={handleCreateSubcategory} className="grid sm:grid-cols-4 gap-3">
                  <select
                    value={newSubGroup}
                    onChange={(e) => setNewSubGroup(e.target.value)}
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  >
                    {Array.from(
                      new Set([
                        "Women's Innerwear",
                        "Men's Innerwear",
                        "Men's Dailywear",
                        "Fashion Accessories",
                        "Everyday Essentials",
                        ...((data?.mainCategories || []).map((m: any) => m.name)),
                      ])
                    ).map((grp) => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                  </select>
                  <input
                    required
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="Subcategory Name (e.g. Sports Bras)"
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={newSubKeywords}
                    onChange={(e) => setNewSubKeywords(e.target.value)}
                    placeholder="Keywords (comma-separated, e.g. bra, sports bra)"
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                  <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                    + Create Subcategory
                  </button>
                </form>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(data?.subcategories || []).map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-orange-400">{sub.category_group}</p>
                        <p className="text-sm font-black text-white">{sub.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => patchAction({ action: "toggle_subcategory", id: sub.id, is_active: !sub.is_active })}
                        className={`rounded-xl px-3 py-1.5 text-[11px] font-black cursor-pointer ${sub.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                          }`}
                      >
                        {sub.is_active ? "ALLOWED" : "DISABLED"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

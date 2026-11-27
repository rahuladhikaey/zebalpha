"use client";

import { useEffect, useState, useCallback } from "react";

type SubTab = "overview" | "orders" | "products" | "sellers" | "pincodes" | "categories";

const MAX_ICON_BYTES = 16 * 1024; // 16 KB crisp retina icon

async function compressIconTo16KB(file: File): Promise<{ dataUrl: string; kb: number }> {
  // If already <= 16 KB SVG/WebP/PNG, keep directly as data URL
  if (file.size <= MAX_ICON_BYTES) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read icon"));
      reader.readAsDataURL(file);
    });
    return { dataUrl, kb: Number((file.size / 1024).toFixed(1)) };
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Invalid image file"));
      i.src = bitmapUrl;
    });

    const sizes = [256, 192, 160, 128, 96];
    const qualities = [0.92, 0.85, 0.78, 0.68, 0.55, 0.42];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    let bestDataUrl = "";
    for (const dim of sizes) {
      canvas.width = dim;
      canvas.height = dim;
      ctx.clearRect(0, 0, dim, dim);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const scale = Math.max(dim / img.width, dim / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (dim - w) / 2, (dim - h) / 2, w, h);

      for (const q of qualities) {
        const candidate = canvas.toDataURL("image/webp", q);
        const approxBytes = Math.ceil((candidate.length - (candidate.indexOf(",") + 1)) * 0.75);
        bestDataUrl = candidate;
        if (approxBytes <= MAX_ICON_BYTES) {
          return { dataUrl: candidate, kb: Number((approxBytes / 1024).toFixed(1)) };
        }
      }
    }
    const finalBytes = Math.ceil((bestDataUrl.length - (bestDataUrl.indexOf(",") + 1)) * 0.75);
    return { dataUrl: bestDataUrl, kb: Number((finalBytes / 1024).toFixed(1)) };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export default function ZebQuickCommandCenterView() {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Add new pincode form & live hyperlocal radius controls
  const [newPin, setNewPin] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCorridor, setNewCorridor] = useState("Sealdah-Krishnanagar");
  const [radiusInput, setRadiusInput] = useState<number>(25);
  const [savingRadius, setSavingRadius] = useState(false);
  const [syncingCoords, setSyncingCoords] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Create Main Category & Subcategory forms
  const [newMainCatName, setNewMainCatName] = useState("");
  const [newMainCatDesc, setNewMainCatDesc] = useState("");
  const [newMainCatImg, setNewMainCatImg] = useState("");
  const [newMainCatIconKb, setNewMainCatIconKb] = useState<number | null>(null);
  const [newMainCatTheme, setNewMainCatTheme] = useState("#F8CB46");
  const [newSubGroup, setNewSubGroup] = useState("Women's Innerwear");
  const [newSubName, setNewSubName] = useState("");
  const [newSubKeywords, setNewSubKeywords] = useState("");
  const [newSubImg, setNewSubImg] = useState("");
  const [editingMainCat, setEditingMainCat] = useState<any | null>(null);
  const [editingSubCat, setEditingSubCat] = useState<any | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/zeb-quick?_t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
      if (typeof json?.deliveryRadiusKm === "number") {
        setRadiusInput(json.deliveryRadiusKm);
      }
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const patchAction = async (payload: Record<string, any>) => {
    await fetch("/api/zeb-quick", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadData();
  };

  const handleAddPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeoNotice(null);
    const res = await fetch("/api/zeb-quick", {
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
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setGeoNotice(
        json.geocoded
          ? `Added ${newPin} with GPS (${Number(json.lat).toFixed(4)}, ${Number(json.lng).toFixed(4)}).`
          : `Added ${newPin}. Click "Sync Missing GPS" if coordinates didn't auto-resolve.`
      );
      setNewPin("");
      setNewArea("");
      setNewCity("");
      await loadData();
    }
  };

  const handleSaveRadius = async (targetKm?: number) => {
    const km = Math.round(Number(targetKm ?? radiusInput));
    if (!Number.isFinite(km) || km < 1 || km > 100) return;
    setSavingRadius(true);
    setGeoNotice(null);
    try {
      const res = await fetch("/api/zeb-quick", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_delivery_radius", radius_km: km }),
      });
      if (res.ok) {
        setRadiusInput(km);
        setGeoNotice(`ZebQuick delivery radius updated to ${km} km across all active pincodes.`);
        await loadData();
      }
    } finally {
      setSavingRadius(false);
    }
  };

  const handleSyncMissingCoords = async () => {
    setSyncingCoords(true);
    setGeoNotice(null);
    try {
      const res = await fetch("/api/zeb-quick", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_missing_coords" }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setGeoNotice(
          `GPS sync complete: ${json.updatedPins || 0} pincodes and ${json.updatedSellers || 0} sellers updated.`
        );
        await loadData();
      }
    } finally {
      setSyncingCoords(false);
    }
  };

  const handleCreateMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/zeb-quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_main_category",
        name: newMainCatName,
        description: newMainCatDesc,
        image_url: newMainCatImg,
        theme_color: newMainCatTheme,
      }),
    });
    if (res.ok) {
      setNewMainCatName("");
      setNewMainCatDesc("");
      setNewMainCatImg("");
      setNewMainCatTheme("#F8CB46");
      await loadData();
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/zeb-quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_subcategory",
        category_group: newSubGroup,
        name: newSubName,
        keywords: newSubKeywords,
        image_url: newSubImg,
      }),
    });
    if (res.ok) {
      setNewSubName("");
      setNewSubKeywords("");
      setNewSubImg("");
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
            ⚡ Isolated Quick Commerce Engine (zeb_quick schema)
          </span>
          <h1 className="mt-2 text-2xl font-black text-white">ZebQuick Quick Commerce Command Center</h1>
          <p className="text-xs text-zinc-400">
            100% isolated from ZebAlpha — separate orders, revenue, sellers, users, and 5–6 hr SLA tracking.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-black hover:bg-zinc-200 disabled:opacity-70 cursor-pointer transition"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Refreshing..." : "Refresh Live Data"}
          </button>
          {lastSyncedAt && (
            <span className="text-[10px] font-bold text-zinc-400">
              Synced: {lastSyncedAt}
            </span>
          )}
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "overview", label: "Overview & Revenue" },
            { id: "orders", label: `ZebQuick Orders (${(data?.orders || []).length})` },
            { id: "products", label: `Live Products (${(data?.products || []).length})` },
            { id: "sellers", label: `ZebQuick Sellers (${(data?.sellers || []).length + (data?.eligibleNotLiveSellers || []).length})` },
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
        <div className="p-8 text-xs text-zinc-400">Loading ZebQuick Quick Commerce data...</div>
      ) : (
        <>
          {subTab === "overview" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "ZebQuick Total GMV / Revenue", value: `₹${stats.totalRevenue.toFixed(0)}`, sub: `Commission: ₹${stats.totalCommission.toFixed(0)}` },
                { label: "ZebQuick Orders (5–6 Hr)", value: stats.totalOrders, sub: `On-Time SLA: ${stats.onTimeSlaPct}%` },
                { label: "Active ZebQuick Users", value: stats.activeUsers, sub: "Unique express buyers" },
                { label: "ZebQuick Live Catalog & Zones", value: `${stats.activeProducts} Items`, sub: `${stats.totalSellers} Sellers • ${stats.activePincodes} Pincodes` },
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
                    <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No ZebQuick orders yet.</td></tr>
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
                      <td className="px-4 py-3 font-black text-white">₹{p.zeb_quick_price}</td>
                      <td className="px-4 py-3 text-zinc-300">{p.zeb_quick_stock}</td>
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
            <div className="space-y-6">
              {/* Eligible Sellers by Pincode with 0 Live ZebQuick Products */}
              <div className="rounded-2xl border border-amber-500/30 bg-zinc-950 overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 bg-amber-500/5">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Eligible ZebQuick Sellers — No Products Live Yet ({(data?.eligibleNotLiveSellers || []).length})
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Sellers whose registered pickup pincode is active in ZebQuick corridors, but have not activated any ZebQuick products yet.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-black">Store &amp; Owner</th>
                        <th className="px-4 py-3 font-black">Contact Details</th>
                        <th className="px-4 py-3 font-black">Pickup Address &amp; Pincode</th>
                        <th className="px-4 py-3 font-black">Catalog</th>
                        <th className="px-4 py-3 font-black text-right">ZebQuick Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {(data?.eligibleNotLiveSellers || []).map((es: any) => (
                        <tr key={es.id}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{es.store_name}</div>
                            {es.owner_name && <div className="text-[11px] text-zinc-400">Owner: {es.owner_name}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-200">{es.email || "—"}</div>
                            <div className="text-[11px] text-zinc-400">{es.phone || "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-orange-400">
                              {es.pickup_pincode} • {es.area_name || es.city}
                            </div>
                            <div className="text-[11px] text-zinc-400 line-clamp-1">
                              {es.pickup_address || es.city} ({es.corridor_name})
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-zinc-200">{es.total_zeb_products} ZebAlpha</div>
                            <div className="text-[11px] text-amber-400 font-bold">0 ZebQuick Live</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-black text-amber-300">
                              ELIGIBLE • NO PRODUCTS LIVE
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(data?.eligibleNotLiveSellers || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-zinc-500">
                            All eligible corridor sellers already have live ZebQuick products, or no matching pincode sellers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active / Onboarded ZebQuick Sellers */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-3.5">
                  <h3 className="text-sm font-black text-white">
                    Onboarded ZebQuick Sellers ({(data?.sellers || []).length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-800 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-black">Store &amp; Owner</th>
                        <th className="px-4 py-3 font-black">Contact</th>
                        <th className="px-4 py-3 font-black">Pickup Pincode &amp; Address</th>
                        <th className="px-4 py-3 font-black">Live ZebQuick Products</th>
                        <th className="px-4 py-3 font-black text-right">Approval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {(data?.sellers || []).map((s: any) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{s.store_name}</div>
                            {s.owner_name && <div className="text-[11px] text-zinc-400">{s.owner_name}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-200">{s.email || "—"}</div>
                            <div className="text-[11px] text-zinc-400">{s.phone || "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-orange-400">{s.pickup_pincode}</div>
                            <div className="text-[11px] text-zinc-400 line-clamp-1">{s.pickup_address || s.city}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-400">
                            {s.live_go_products ?? 0} Live
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => patchAction({ action: "toggle_seller", id: s.id, is_approved: !s.is_approved })}
                              className={`rounded-lg px-3 py-1 text-[11px] font-black cursor-pointer ${
                                s.is_approved ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
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
              </div>
            </div>
          )}

          {subTab === "pincodes" && (
            <div className="space-y-4">
              {/* Hyperlocal GPS Delivery Radius Control */}
              <div className="rounded-2xl border border-orange-500/30 bg-zinc-950 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white">Hyperlocal GPS Delivery Radius</h3>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-black text-emerald-300">
                        Live: {data?.deliveryRadiusKm ?? 25} km
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      A seller&apos;s ZebQuick products automatically show in every active pincode within this GPS radius (cross-prefix 700xxx / 743xxx / 741xxx supported).
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={syncingCoords}
                    onClick={() => void handleSyncMissingCoords()}
                    className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-black text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer"
                  >
                    {syncingCoords ? "Syncing GPS..." : "Sync Missing GPS"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[10, 15, 20, 25, 30].map((km) => (
                    <button
                      key={km}
                      type="button"
                      disabled={savingRadius}
                      onClick={() => void handleSaveRadius(km)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                        (data?.deliveryRadiusKm ?? 25) === km
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-orange-400"
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={radiusInput}
                      onChange={(e) => setRadiusInput(Number(e.target.value))}
                      className="w-20 rounded-xl bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 text-xs font-bold text-white"
                    />
                    <span className="text-xs text-zinc-400 font-bold">km</span>
                    <button
                      type="button"
                      disabled={savingRadius}
                      onClick={() => void handleSaveRadius()}
                      className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                    >
                      {savingRadius ? "Saving..." : "Save Radius"}
                    </button>
                  </div>
                </div>

                {geoNotice && (
                  <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-[11px] font-bold text-emerald-300">
                    {geoNotice}
                  </p>
                )}
              </div>

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
                  + Add Pincode (Auto-GPS)
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
                      <th className="px-4 py-3 font-black">GPS Coords</th>
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
                        <td className="px-4 py-2.5">
                          {p.lat && p.lng ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                              {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              Missing GPS
                            </span>
                          )}
                        </td>
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
                <form onSubmit={handleCreateMainCategory} className="grid sm:grid-cols-5 gap-3">
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
                  <div className="flex items-center gap-2">
                    <input
                      value={newMainCatImg}
                      onChange={(e) => {
                        setNewMainCatImg(e.target.value);
                        setNewMainCatIconKb(null);
                      }}
                      placeholder="Icon URL or upload ≤16KB"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                    />
                    <label className="shrink-0 rounded-xl border border-amber-500/50 bg-amber-500/15 px-2.5 py-2 text-[10.5px] font-black text-amber-300 cursor-pointer hover:bg-amber-500/25">
                      {newMainCatIconKb ? `${newMainCatIconKb}KB` : "≤16KB"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const { dataUrl, kb } = await compressIconTo16KB(f);
                          setNewMainCatImg(dataUrl);
                          setNewMainCatIconKb(kb);
                        }}
                      />
                    </label>
                  </div>
                  <select
                    value={newMainCatTheme}
                    onChange={(e) => setNewMainCatTheme(e.target.value)}
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  >
                    <option value="#F8CB46">Theme: Blinkit Yellow</option>
                    <option value="#1E293B">Theme: Electronics Dark</option>
                    <option value="#BAE6FD">Theme: Winter Icy Blue</option>
                    <option value="#FBCFE8">Theme: Rose Beauty</option>
                    <option value="#A7F3D0">Theme: Fresh Mint</option>
                  </select>
                  <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                    + Create Main Category
                  </button>
                </form>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(data?.mainCategories || []).map((mc: any) => (
                    <div key={mc.id} className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <label
                          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 cursor-pointer group"
                          style={{
                            borderColor: mc.theme_color || "#F8CB46",
                            backgroundColor: mc.image_url ? "#ffffff" : mc.theme_color || "#F8CB46",
                          }}
                          title="Click to upload ≤16KB icon (auto-resized)"
                        >
                          {mc.image_url ? (
                            <img src={mc.image_url} alt={mc.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-zinc-950">+16K</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const { dataUrl } = await compressIconTo16KB(f);
                              await patchAction({ action: "update_main_icon", id: mc.id, image_url: dataUrl });
                            }}
                          />
                        </label>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">{mc.name}</p>
                          {mc.description && <p className="text-[11px] text-zinc-400 line-clamp-1">{mc.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingMainCat({
                              id: mc.id,
                              name: mc.name || "",
                              description: mc.description || "",
                              theme_color: mc.theme_color || "#F8CB46",
                              image_url: mc.image_url || "",
                            })
                          }
                          className="rounded-xl bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                          title="Edit Main Category"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete main category "${mc.name}"?`)) {
                              void patchAction({ action: "delete_main_category", id: mc.id });
                            }
                          }}
                          className="rounded-xl bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                          title="Delete Main Category"
                        >
                          Del
                        </button>
                        <button
                          type="button"
                          onClick={() => patchAction({ action: "toggle_main_category", id: mc.id, is_active: !mc.is_active })}
                          className={`rounded-xl px-3 py-1.5 text-[11px] font-black cursor-pointer shrink-0 ${mc.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                            }`}
                        >
                          {mc.is_active ? "ACTIVE" : "OFF"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Subcategory */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                <h3 className="text-sm font-black text-white">2. Allowed Subcategories ({(data?.subcategories || []).length})</h3>
                <form onSubmit={handleCreateSubcategory} className="grid sm:grid-cols-5 gap-3">
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
                    placeholder="Keywords (comma-separated)"
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={newSubImg}
                    onChange={(e) => setNewSubImg(e.target.value)}
                    placeholder="Thumbnail Image URL (optional)"
                    className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                  <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                    + Create Subcategory
                  </button>
                </form>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(data?.subcategories || []).map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <label
                          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 cursor-pointer"
                          title="Click to upload ≤16KB subcategory icon"
                        >
                          {sub.image_url ? (
                            <img src={sub.image_url} alt={sub.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-black text-zinc-400">+16K</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const { dataUrl } = await compressIconTo16KB(f);
                              await patchAction({ action: "update_subcategory_icon", id: sub.id, image_url: dataUrl });
                            }}
                          />
                        </label>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-orange-400">{sub.category_group}</p>
                          <p className="text-sm font-black text-white truncate">{sub.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSubCat({
                              id: sub.id,
                              category_group: sub.category_group || "Women's Innerwear",
                              name: sub.name || "",
                              keywords: Array.isArray(sub.keywords) ? sub.keywords.join(", ") : "",
                              image_url: sub.image_url || "",
                            })
                          }
                          className="rounded-xl bg-zinc-800 px-2 py-1.5 text-[10px] font-bold text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                          title="Edit Subcategory"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete subcategory "${sub.name}"?`)) {
                              void patchAction({ action: "delete_subcategory", id: sub.id });
                            }
                          }}
                          className="rounded-xl bg-rose-500/15 px-2 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                          title="Delete Subcategory"
                        >
                          Del
                        </button>
                        <button
                          type="button"
                          onClick={() => patchAction({ action: "toggle_featured_subcategory", id: sub.id, is_featured: !sub.is_featured })}
                          className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black cursor-pointer ${sub.is_featured ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-zinc-800 text-zinc-500"
                            }`}
                          title="Show in Featured strip on Main Category Tab"
                        >
                          {sub.is_featured ? "★ FEATURED" : "☆"}
                        </button>
                        <button
                          type="button"
                          onClick={() => patchAction({ action: "toggle_subcategory", id: sub.id, is_active: !sub.is_active })}
                          className={`rounded-xl px-3 py-1.5 text-[11px] font-black cursor-pointer ${sub.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                            }`}
                        >
                          {sub.is_active ? "ALLOWED" : "DISABLED"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Edit Main Category Modal */}
      {editingMainCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await patchAction({
                action: "update_main_category",
                id: editingMainCat.id,
                name: editingMainCat.name,
                description: editingMainCat.description,
                theme_color: editingMainCat.theme_color,
                image_url: editingMainCat.image_url,
              });
              setEditingMainCat(null);
            }}
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-3.5 text-white shadow-2xl"
          >
            <h3 className="text-base font-black">Edit Main Category</h3>
            <input
              required
              value={editingMainCat.name}
              onChange={(e) => setEditingMainCat({ ...editingMainCat, name: e.target.value })}
              placeholder="Main Category Name"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
            />
            <input
              value={editingMainCat.description}
              onChange={(e) => setEditingMainCat({ ...editingMainCat, description: e.target.value })}
              placeholder="Short Description"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
            />
            <select
              value={editingMainCat.theme_color}
              onChange={(e) => setEditingMainCat({ ...editingMainCat, theme_color: e.target.value })}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
            >
              <option value="#F8CB46">Theme: Blinkit Yellow</option>
              <option value="#1E293B">Theme: Electronics Dark</option>
              <option value="#BAE6FD">Theme: Winter Icy Blue</option>
              <option value="#FBCFE8">Theme: Rose Beauty</option>
              <option value="#A7F3D0">Theme: Fresh Mint</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                value={editingMainCat.image_url}
                onChange={(e) => setEditingMainCat({ ...editingMainCat, image_url: e.target.value })}
                placeholder="Icon URL or upload ≤16KB"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
              />
              <label className="shrink-0 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-[11px] font-black text-amber-300 cursor-pointer">
                ≤16KB
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const { dataUrl } = await compressIconTo16KB(f);
                    setEditingMainCat({ ...editingMainCat, image_url: dataUrl });
                  }}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMainCat(null)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {editingSubCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await patchAction({
                action: "update_subcategory",
                id: editingSubCat.id,
                category_group: editingSubCat.category_group,
                name: editingSubCat.name,
                keywords: editingSubCat.keywords,
                image_url: editingSubCat.image_url,
              });
              setEditingSubCat(null);
            }}
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-3.5 text-white shadow-2xl"
          >
            <h3 className="text-base font-black">Edit Subcategory</h3>
            <select
              value={editingSubCat.category_group}
              onChange={(e) => setEditingSubCat({ ...editingSubCat, category_group: e.target.value })}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
            >
              {Array.from(
                new Set([
                  ...((data?.mainCategories || []).map((m: any) => m.name)),
                  editingSubCat.category_group,
                ])
              )
                .filter(Boolean)
                .map((grp: any) => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
            </select>
            <input
              required
              value={editingSubCat.name}
              onChange={(e) => setEditingSubCat({ ...editingSubCat, name: e.target.value })}
              placeholder="Subcategory Name"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
            />
            <input
              value={editingSubCat.keywords}
              onChange={(e) => setEditingSubCat({ ...editingSubCat, keywords: e.target.value })}
              placeholder="Keywords (comma-separated)"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
            />
            <div className="flex items-center gap-2">
              <input
                value={editingSubCat.image_url}
                onChange={(e) => setEditingSubCat({ ...editingSubCat, image_url: e.target.value })}
                placeholder="Thumbnail URL or upload ≤16KB"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
              />
              <label className="shrink-0 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-[11px] font-black text-amber-300 cursor-pointer">
                ≤16KB
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const { dataUrl } = await compressIconTo16KB(f);
                    setEditingSubCat({ ...editingSubCat, image_url: dataUrl });
                  }}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSubCat(null)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

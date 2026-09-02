"use client";

import { useState, useEffect } from "react";
import { supabaseA, supabaseB } from "@shared/utils/supabaseClient";
import { 
  MapPin, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Package,
  Search,
  Clock,
  Send,
  User,
  Building2,
  Receipt,
  FileText,
  X
} from "lucide-react";

export default function ShippingLogisticsView() {
  const [loading, setLoading] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sellerFilter, setSellerFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    tracking_number: "",
    courier_name: "Shiprocket / Delhivery",
    status: "SHIPPED"
  });
  const [statusMessage, setStatusMessage] = useState("");

  const loadShippingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Seller Pickup Warehouses & Sellers
      let sellersList: any[] = [];
      try {
        const sRes = await fetch("/api/admin/sellers");
        const sJson = await sRes.json();
        if (sJson.success && Array.isArray(sJson.data)) {
          sellersList = sJson.data;
        }
      } catch (_) {}

      const [locRes, ordersRes] = await Promise.all([
        supabaseB.from("seller_pickup_locations").select("*"),
        supabaseA.from("orders").select("*").order("created_at", { ascending: false })
      ]);

      setPickupLocations(locRes.data || []);
      setSellers(sellersList);
      setDispatches(ordersRes.data || []);
    } catch (e: any) {
      console.warn("Notice loading shipping logistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShippingData();

    // Zero-delay Supabase Realtime channel for dispatch updates
    const channel = supabaseA
      .channel("logistics-dispatches-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadShippingData())
      .subscribe();

    return () => {
      supabaseA.removeChannel(channel);
    };
  }, []);

  const handleUpdateDispatchStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabaseA
        .from("orders")
        .update({ 
          order_status: newStatus,
          updated_at: new Date().toISOString() 
        })
        .eq("id", orderId);

      if (error) throw error;

      setDispatches(dispatches.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
      setStatusMessage(`📦 Order status updated to ${newStatus} in real-time database.`);
    } catch (err: any) {
      alert(err.message || "Failed to update dispatch status.");
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const { error } = await supabaseA
        .from("orders")
        .update({
          tracking_number: trackingForm.tracking_number,
          courier_name: trackingForm.courier_name,
          order_status: trackingForm.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      setSelectedOrder(null);
      setTrackingForm({ tracking_number: "", courier_name: "Shiprocket / Delhivery", status: "SHIPPED" });
      setStatusMessage("🚀 Tracking details attached & order dispatched in real-time DB!");
      loadShippingData();
    } catch (err: any) {
      alert(err.message || "Failed to save tracking details.");
    }
  };

  const filteredDispatches = dispatches.filter(o => {
    const matchesStatus = statusFilter === "ALL" || (o.order_status || "").toUpperCase() === statusFilter.toUpperCase();
    
    // Match seller by seller_id, seller_name, or seller matching object
    const matchesSeller = sellerFilter === "ALL" || 
      o.seller_id === sellerFilter || 
      (sellers.find(s => s.id === sellerFilter)?.business_name && o.seller_name === sellers.find(s => s.id === sellerFilter)?.business_name);

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (o.order_number || o.id || "").toLowerCase().includes(query) ||
      (o.customer_name || o.shipping_address?.name || "").toLowerCase().includes(query) ||
      (o.seller_name || "").toLowerCase().includes(query) ||
      (o.tracking_number || "").toLowerCase().includes(query);

    return matchesStatus && matchesSeller && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Logistics Hub (Real-Time DB Active)</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Shipping, Order Dispatches & Seller Logistics</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Filter dispatches by specific sellers, view seller pickup locations, customer delivery addresses, full order statements, & attach tracking.
          </p>
        </div>

        <button
          onClick={loadShippingData}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white shadow-sm hover:bg-zinc-800 self-start cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-white ${loading ? "animate-spin" : ""}`} />
          <span>Sync Logistics</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900 text-white font-bold text-xs border border-zinc-700 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Integration Banner */}
      <div className="bg-zinc-950 text-white rounded-3xl p-6 border border-zinc-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white text-black flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-base">Shiprocket & Courier API Engine</h3>
            <p className="text-xs text-zinc-400 font-medium">Status: Connected & Operational (Auto-manifesting active)</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="text-right">
            <div className="text-lg font-black text-white">{dispatches.length}</div>
            <div className="text-[10px] uppercase text-zinc-400">Total Orders</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-white">
              {dispatches.filter(o => ["SHIPPED", "OUT_FOR_DELIVERY", "PACKED", "READY_TO_SHIP"].includes((o.order_status || "").toUpperCase())).length}
            </div>
            <div className="text-[10px] uppercase text-zinc-400">In Dispatch</div>
          </div>
        </div>
      </div>

      {/* Order Dispatches Realtime Table */}
      <div className="bg-zinc-950 rounded-3xl p-6 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-white" />
            <span>Order Dispatches & Seller Pickup Statements</span>
          </h2>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search order #, customer, seller, tracking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter by Specific Seller */}
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Sellers ({sellers.length})</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  Seller: {s.business_name || s.full_name || s.owner_name || "Merchant"}
                </option>
              ))}
            </select>

            {/* Filter by Pipeline Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PLACED">Placed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PACKED">Packed</option>
              <option value="READY_TO_SHIP">Ready to Ship</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-400">
                <th className="px-6 py-4">Order ID & Date</th>
                <th className="px-6 py-4">Seller & Pickup Address</th>
                <th className="px-6 py-4">Customer & Phone</th>
                <th className="px-6 py-4">Amount & Statement</th>
                <th className="px-6 py-4">Tracking & Courier</th>
                <th className="px-6 py-4">Dispatch Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Loading order dispatches from database...
                  </td>
                </tr>
              ) : filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No matching order dispatches found.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map(order => {
                  const matchedSeller = sellers.find(s => s.id === order.seller_id || s.seller_id === order.seller_id || s.business_name === order.seller_name);
                  const sellerPickupText = matchedSeller?.pickup_address || matchedSeller?.pickup_location || matchedSeller?.city || "Standard Seller Warehouse";

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-slate-900 dark:text-white">{order.order_number || order.id}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </div>
                      </td>

                      {/* Seller & Pickup Address Column */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{order.seller_name || matchedSeller?.business_name || matchedSeller?.full_name || "Merchant"}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5" title={sellerPickupText}>
                          📍 {sellerPickupText}
                        </div>
                      </td>

                      {/* Customer Details Column */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {order.customer_name || order.shipping_address?.name || "Customer"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          📞 {order.phone || order.shipping_address?.phone || "No phone"}
                        </div>
                      </td>

                      {/* Financial Statement Column */}
                      <td className="px-6 py-4">
                        <div className="font-black text-emerald-600 text-sm">₹{order.total_amount || 0}</div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                          {order.payment_method || "COD"} • {order.payment_status || "PENDING"}
                        </span>
                      </td>

                      {/* Courier & Tracking Column */}
                      <td className="px-6 py-4">
                        {order.tracking_number ? (
                          <div>
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{order.tracking_number}</div>
                            <div className="text-[11px] text-slate-400">{order.courier_name || "Express Courier"}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          (order.order_status || "").toUpperCase() === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : (order.order_status || "").toUpperCase() === "SHIPPED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : (order.order_status || "").toUpperCase() === "PACKED"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {order.order_status || "PENDING"}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setTrackingForm({
                              tracking_number: order.tracking_number || "",
                              courier_name: order.courier_name || "Shiprocket / Delhivery",
                              status: order.order_status === "PENDING" ? "SHIPPED" : order.order_status
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-black text-xs hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                          title="View Full Statement & Dispatch"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch & Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seller Pickup Locations Directory */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <span>Seller Warehouses & Pickup Hubs</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs">Loading pickup locations...</div>
        ) : pickupLocations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs">No registered seller pickup locations found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pickupLocations.map(loc => (
              <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{loc.name || "Main Warehouse"}</h4>
                  {loc.is_default && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Default Pickup
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{loc.address_line1}, {loc.city}, {loc.state} - {loc.pincode}</p>
                <p className="text-[11px] text-slate-400 font-bold">Contact: {loc.phone} | {loc.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprehensive Dispatch & Order Statement Modal */}
      {selectedOrder && (() => {
        const matchedSeller = sellers.find(s => s.id === selectedOrder.seller_id || s.seller_id === selectedOrder.seller_id || s.business_name === selectedOrder.seller_name);
        const sellerPickupAddressStr = matchedSeller?.pickup_address || matchedSeller?.pickup_location || matchedSeller?.address || matchedSeller?.city || "Standard Merchant Warehouse";
        const sellerPhone = matchedSeller?.mobile_number || matchedSeller?.phone_number || "N/A";
        const customerAddressStr = typeof selectedOrder.shipping_address === "object"
          ? `${selectedOrder.shipping_address?.address_line1 || ""}, ${selectedOrder.shipping_address?.city || ""}, ${selectedOrder.shipping_address?.state || ""} - ${selectedOrder.shipping_address?.pincode || ""}`
          : selectedOrder.shipping_address || selectedOrder.address || "Address not provided";

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Dispatch & Logistics Statement</span>
                  <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    <span>Order #{selectedOrder.order_number || selectedOrder.id}</span>
                  </h3>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Info & Addresses */}
              <div className="space-y-4 text-xs font-bold">
                
                {/* 1. Seller Pickup Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Seller Pickup Address & Contact
                    </span>
                    <span className="text-[10px] font-black text-slate-400">Merchant Hub</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {selectedOrder.seller_name || matchedSeller?.business_name || matchedSeller?.full_name || "Merchant"}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    📍 {sellerPickupAddressStr}
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">📞 Phone: {sellerPhone}</p>
                </div>

                {/* 2. Customer Delivery Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Customer Delivery Address
                    </span>
                    <span className="text-[10px] font-black text-slate-400">Destination</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {selectedOrder.customer_name || selectedOrder.shipping_address?.name || "Customer"}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    🏠 {customerAddressStr}
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">📞 Phone: {selectedOrder.phone || selectedOrder.shipping_address?.phone || "N/A"}</p>
                </div>

                {/* 3. Items & Financial Statement */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Order Statement & Items Breakdown
                  </span>
                  
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(selectedOrder.items || selectedOrder.product_details || []).map((it: any, idx: number) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{it.name || it.title || "Product Item"} x {it.quantity || it.qty || 1}</span>
                        <span className="font-mono font-bold text-emerald-600">₹{(Number(it.price || 0) * Number(it.quantity || it.qty || 1)).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-black">
                    <span className="text-slate-600 dark:text-slate-400">Grand Total Amount</span>
                    <span className="text-emerald-600 text-sm font-black">₹{selectedOrder.total_amount} ({selectedOrder.payment_method || "COD"} • {selectedOrder.payment_status || "PENDING"})</span>
                  </div>
                </div>

                {/* 4. Tracking & Courier Form */}
                <form onSubmit={handleSaveTracking} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4">
                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Attach Tracking AWB & Update Dispatch Status
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 block mb-1">Tracking AWB Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AWB-994810294"
                        value={trackingForm.tracking_number}
                        onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-slate-400 block mb-1">Courier Partner</label>
                      <input
                        type="text"
                        value={trackingForm.courier_name}
                        onChange={(e) => setTrackingForm({ ...trackingForm, courier_name: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block mb-1">Pipeline Status</label>
                    <select
                      value={trackingForm.status}
                      onChange={(e) => setTrackingForm({ ...trackingForm, status: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="PACKED">PACKED (Ready at warehouse)</option>
                      <option value="READY_TO_SHIP">READY TO SHIP (Shiprocket Created)</option>
                      <option value="SHIPPED">SHIPPED (In Transit)</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                    >
                      Close Statement
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-md"
                    >
                      Save & Confirm Dispatch
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


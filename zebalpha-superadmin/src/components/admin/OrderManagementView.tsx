"use client";

import { useState, useEffect } from "react";
import { supabaseA as supabase } from "@shared/utils/supabaseClient";
import { 
  ShoppingBag, 
  Search, 
  Eye, 
  X, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Package, 
  MapPin, 
  CreditCard,
  User,
  Trash2,
  Building2,
  Sparkles,
  Shirt,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Send
} from "lucide-react";

export default function OrderManagementView() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Tracking edit state inside drawer
  const [editingTracking, setEditingTracking] = useState(false);
  const [courierInput, setCourierInput] = useState("");
  const [awbInput, setAwbInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, sellersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("sellers").select("*"),
        supabase.from("products").select("id, name, seller_id, image_url, price, sku")
      ]);

      setOrders(ordersRes.data || []);
      setSellers(sellersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (e: any) {
      console.error("Error loading order management data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime WebSockets for zero-refresh order monitoring
    const channel = supabase
      .channel("admin-orders-realtime-enhanced")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!window.confirm("Are you sure you want to permanently delete this order record? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;

      alert("✅ Order deleted successfully!");
      setOrders(orders.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete order.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string | number, newStatus: string) => {
    try {
      const updates: any = { 
        order_status: newStatus.toLowerCase(), 
        updated_at: new Date().toISOString() 
      };

      // Auto-assign tracking details if moving to ready_to_ship or dispatched and missing AWB
      if (["ready_to_ship", "dispatched", "shipped", "in_transit"].includes(newStatus.toLowerCase())) {
        const ord = orders.find(o => o.id === orderId);
        if (!ord?.tracking_number) {
          updates.tracking_number = `DEL-${Math.floor(100000000 + Math.random() * 900000000)}`;
          updates.courier_name = "Delhivery Surface";
        }
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      setStatusMsg(`✓ Order status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setStatusMsg(""), 3000);

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updates } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updates });
      }
    } catch (err: any) {
      alert(err.message || "Failed to update order status.");
    }
  };

  const handleSaveTracking = async () => {
    if (!selectedOrder) return;
    try {
      const updates = {
        courier_name: courierInput.trim() || "Delhivery Surface",
        tracking_number: awbInput.trim(),
        order_status: selectedOrder.order_status === "placed" ? "ready_to_ship" : selectedOrder.order_status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      setStatusMsg("✓ Shipment Courier & AWB Tracking Saved!");
      setTimeout(() => setStatusMsg(""), 3000);
      setEditingTracking(false);

      setSelectedOrder({ ...selectedOrder, ...updates });
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, ...updates } : o));
    } catch (err: any) {
      alert(err.message || "Failed to save tracking details.");
    }
  };

  // Helper to find seller for a product item
  const getSellerForItem = (item: any, orderSellerId?: string) => {
    const pId = item.product_id || item.id;
    const prod = products.find(p => String(p.id) === String(pId));
    const targetSellerId = item.seller_id || prod?.seller_id || orderSellerId;

    const matchedSeller = sellers.find(s => 
      s.id === targetSellerId || 
      s.user_id === targetSellerId || 
      (s.email && s.email === "r.adhikary7777@gmail.com" && !targetSellerId)
    );

    return matchedSeller || {
      business_name: "ZEBALPHA Official Brand Store",
      owner_name: "Rahul Adhikary",
      upi_id: "rahuladhikary@phonepe",
      is_primary_brand: true
    };
  };

  const statusOptions = [
    "ALL", 
    "PLACED", 
    "PROCESSING", 
    "READY_TO_SHIP", 
    "DISPATCHED",
    "SHIPPED", 
    "IN_TRANSIT",
    "DELIVERED", 
    "CANCELLED"
  ];

  const filteredOrders = orders.filter(o => {
    const st = (o.order_status || "placed").toUpperCase();
    const matchesStatus = statusFilter === "ALL" || st === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      (o.order_number || o.id || "").toLowerCase().includes(query) ||
      (o.shipping_address?.name || o.customer_name || "").toLowerCase().includes(query) ||
      (o.shipping_address?.phone || o.phone || "").includes(query) ||
      (o.tracking_number || "").toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">DISPATCHES & LOGISTICS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              ● Live Tracking Active
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">Order Management & Dispatch Console</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Real-time customer orders, merchant product breakdowns, courier AWB tracking, and fulfillment lifecycle control.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors self-start cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in duration-150">
          <span className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={16} />
            <span>{statusMsg}</span>
          </span>
          <button onClick={() => setStatusMsg("")} className="text-zinc-400 hover:text-white font-black text-sm">✕</button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
          {statusOptions.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all ${
                statusFilter === st 
                  ? "bg-white text-black shadow-md shadow-white/10" 
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search order #, customer, AWB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400 font-bold text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-white mx-auto" />
            <p>Loading real-time order records...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 font-bold text-xs space-y-2">
            <ShoppingBag className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-white font-black text-sm">No Orders Found</p>
            <p className="text-zinc-500">No orders match the selected status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="p-4 pl-6">Order ID & Date</th>
                  <th className="p-4">Customer & City</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Live Dispatch / AWB</th>
                  <th className="p-4">Order Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                {filteredOrders.map(ord => {
                  const status = (ord.order_status || "placed").toLowerCase();
                  const customerName = ord.shipping_address?.name || ord.customer_name || "Customer";
                  const phone = ord.shipping_address?.phone || ord.phone || "";
                  const city = ord.shipping_address?.city || ord.city || "Kolkata";
                  const awb = ord.tracking_number || ord.shipment_id || "";
                  const courier = ord.courier_name || "Delhivery Surface";

                  return (
                    <tr key={ord.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-black text-white font-mono">#{ord.order_number || ord.id}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{new Date(ord.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </td>

                      <td className="p-4">
                        <p className="font-black text-white">{customerName}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{city} • {phone || "—"}</p>
                      </td>

                      <td className="p-4 font-black text-sm text-emerald-400">
                        ₹{Number(ord.total_amount || 0).toLocaleString("en-IN")}
                        <span className="text-[10px] text-zinc-500 block font-normal">
                          {ord.payment_method || "COD"} ({ord.payment_status || "Pending"})
                        </span>
                      </td>

                      <td className="p-4">
                        {awb ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-white text-xs block">{awb}</span>
                            <span className="text-[10px] text-zinc-400 block font-medium">🚚 {courier}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic">AWB Pending</span>
                        )}
                      </td>

                      <td className="p-4">
                        <select
                          value={status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider outline-none cursor-pointer transition-all ${
                            status === "delivered" 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                              : ["shipped", "in_transit", "dispatched"].includes(status)
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-zinc-900 text-zinc-300 border-zinc-700"
                          }`}
                        >
                          <option value="placed">PLACED</option>
                          <option value="ready_to_ship">READY TO SHIP</option>
                          <option value="dispatched">DISPATCHED</option>
                          <option value="shipped">SHIPPED</option>
                          <option value="in_transit">IN TRANSIT</option>
                          <option value="delivered">DELIVERED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                      </td>

                      <td className="p-4 text-right pr-6 space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setAwbInput(ord.tracking_number || "");
                            setCourierInput(ord.courier_name || "Delhivery Surface");
                            setEditingTracking(false);
                          }}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                          title="View Order Items & Live Dispatch Tracker"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Delete Order Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 🌟 COMPREHENSIVE ORDER & SELLER DISPATCH DRAWER 🌟 ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-150 overflow-hidden">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-xl h-full p-6 md:p-8 shadow-2xl overflow-y-auto space-y-6 flex flex-col justify-between">
            
            {/* Header */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Order Details & Tracking</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-white font-mono text-[10px]">
                      {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white font-mono mt-0.5">#{selectedOrder.order_number || selectedOrder.id}</h3>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── LIVE DISPATCH & SHIPPING JOURNEY TRACKER ── */}
              <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Truck size={14} /> Live Dispatch & Delivery Journey
                  </span>
                  <span className="text-[10px] font-black uppercase text-white bg-zinc-800 px-2.5 py-0.5 rounded-full">
                    {selectedOrder.order_status || "Placed"}
                  </span>
                </div>

                {/* Step Progress Bar */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 text-center text-[10px] font-black uppercase">
                  {/* Step 1: Placed */}
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 space-y-0.5">
                    <CheckCircle2 size={12} className="mx-auto" />
                    <span>Placed</span>
                  </div>

                  {/* Step 2: Packed */}
                  <div className={`p-2 rounded-xl border space-y-0.5 ${
                    ["ready_to_ship", "dispatched", "shipped", "in_transit", "delivered"].includes((selectedOrder.order_status || "").toLowerCase())
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-900 text-zinc-600 border-zinc-800"
                  }`}>
                    <Package size={12} className="mx-auto" />
                    <span>Packed</span>
                  </div>

                  {/* Step 3: In Transit */}
                  <div className={`p-2 rounded-xl border space-y-0.5 ${
                    ["dispatched", "shipped", "in_transit", "delivered"].includes((selectedOrder.order_status || "").toLowerCase())
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-900 text-zinc-600 border-zinc-800"
                  }`}>
                    <Truck size={12} className="mx-auto" />
                    <span>In Transit</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className={`p-2 rounded-xl border space-y-0.5 ${
                    (selectedOrder.order_status || "").toLowerCase() === "delivered"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-900 text-zinc-600 border-zinc-800"
                  }`}>
                    <Sparkles size={12} className="mx-auto" />
                    <span>Delivered</span>
                  </div>
                </div>

                {/* AWB & Courier Info / Edit Box */}
                <div className="mt-3 p-3.5 bg-black/40 rounded-2xl border border-zinc-800 space-y-2">
                  {!editingTracking ? (
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Courier & AWB Tracking Code:</span>
                        <p className="text-white font-mono font-bold mt-0.5">
                          {selectedOrder.courier_name || "Delhivery Surface"} • {selectedOrder.tracking_number || "AWB Not Generated Yet"}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingTracking(true)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all"
                      >
                        Edit Tracking
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Courier Name"
                          value={courierInput}
                          onChange={(e) => setCourierInput(e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="AWB Tracking #"
                          value={awbInput}
                          onChange={(e) => setAwbInput(e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setEditingTracking(false)}
                          className="px-3 py-1 rounded-xl text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTracking}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase"
                        >
                          Save AWB
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── ITEMIZED PRODUCTS & WHICH SELLER SUPPLIED THEM ── */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Shirt size={14} className="text-emerald-400" /> Products in this Order & Seller Details
                </span>

                <div className="space-y-2.5">
                  {(() => {
                    let items: any[] = [];
                    if (Array.isArray(selectedOrder.items)) {
                      items = selectedOrder.items;
                    } else if (selectedOrder.product_details) {
                      try {
                        items = typeof selectedOrder.product_details === "string" ? JSON.parse(selectedOrder.product_details) : selectedOrder.product_details;
                      } catch (_) {
                        items = [];
                      }
                    }

                    if (items.length === 0) {
                      return (
                        <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                          No line items details available for this legacy order.
                        </div>
                      );
                    }

                    return items.map((it: any, idx: number) => {
                      const seller = getSellerForItem(it, selectedOrder.seller_id);
                      const subtotal = it.subtotal || ((Number(it.price) || 0) * (Number(it.quantity) || 1));

                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700 flex items-center justify-center">
                              {it.image ? (
                                <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                              ) : (
                                <Shirt className="h-5 w-5 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-white truncate">{it.name || "Apparel Item"}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                Qty: <span className="text-white font-bold">{it.quantity || 1}</span> • Size: <span className="text-white font-bold">{it.size || "Free Size"}</span> • Price: ₹{Number(it.price || 0).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-400 text-sm">₹{subtotal.toLocaleString("en-IN")}</span>
                            </div>
                          </div>

                          {/* Merchant Attribution Box */}
                          <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800/80 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <Building2 size={13} className="text-blue-400 shrink-0" />
                              <div>
                                <span className="text-white font-black">{seller.business_name || "ZEBALPHA Brand"}</span>
                                <span className="text-zinc-500 block text-[10px]">Owner: {seller.owner_name}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-400 font-mono font-bold text-[10px] block">{seller.upi_id || "Direct Payout"}</span>
                              <span className="text-zinc-500 text-[9px] uppercase">Payout UPI</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* ── CUSTOMER & SHIPPING ADDRESS ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Customer Info
                  </p>
                  <p className="text-white text-sm font-black">{selectedOrder.shipping_address?.name || selectedOrder.customer_name || "Customer"}</p>
                  <p className="text-zinc-400 font-mono text-[11px]">Phone: {selectedOrder.shipping_address?.phone || selectedOrder.phone || "—"}</p>
                </div>

                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Shipping Destination
                  </p>
                  <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                    {typeof selectedOrder.shipping_address === "object" 
                      ? `${selectedOrder.shipping_address?.address_line1 || ""}, ${selectedOrder.shipping_address?.city || ""}, ${selectedOrder.shipping_address?.state || ""} - ${selectedOrder.shipping_address?.pincode || ""}`
                      : selectedOrder.shipping_address || selectedOrder.address || "Address not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-black transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Order</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-black hover:bg-zinc-200 transition-all shadow-md cursor-pointer ml-auto"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

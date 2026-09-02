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
  Trash2
} from "lucide-react";

export default function OrderManagementView() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e: any) {
      console.error("Error loading orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // Supabase Realtime WebSockets for zero-refresh order monitoring
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!window.confirm("Are you sure you want to permanently delete this order record? This action cannot be undone.")) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete order.");
      }

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
      const { error } = await supabase
        .from("orders")
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      setOrders(orders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || "Failed to update order status.");
    }
  };

  const statusOptions = [
    "ALL", 
    "PENDING", 
    "PROCESSING", 
    "PACKED", 
    "SHIPPED", 
    "DELIVERED", 
    "CANCELLED", 
    "RETURNED"
  ];

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === "ALL" || (o.order_status || "").toUpperCase() === statusFilter;
    const matchesSearch = 
      (o.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.shipping_address?.name || o.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.shipping_address?.phone || o.phone || "").includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Dispatches & Orders</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Order Management Console</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Track customer orders, manage fulfillment stages, update order statuses, and inspect shipping & payment details.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
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

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search order #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Order ID & Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Order Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                {filteredOrders.map(ord => {
                  const status = (ord.order_status || "PENDING").toUpperCase();
                  const customerName = ord.shipping_address?.name || ord.customer_name || "Customer";
                  const phone = ord.shipping_address?.phone || ord.phone || "";

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-black text-slate-900 dark:text-white font-mono">#{ord.order_number || ord.id}</p>
                        <p className="text-[11px] text-slate-400">{new Date(ord.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-slate-900 dark:text-white">{customerName}</p>
                        <p className="text-[11px] text-slate-400">{phone}</p>
                      </td>
                      <td className="p-4 font-black text-sm text-emerald-600">
                        ₹{ord.total_amount || 0}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ord.payment_status === "paid" || ord.payment_status === "PAID" 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 border border-emerald-200" 
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 border border-amber-200"
                        }`}>
                          {ord.payment_status || "pending"}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold outline-none focus:border-emerald-500"
                        >
                          {statusOptions.filter(s => s !== "ALL").map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-right pr-6 flex justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
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

      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Order Details</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">#{selectedOrder.order_number || selectedOrder.id}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer Info
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{selectedOrder.shipping_address?.name || selectedOrder.customer_name || "Customer"}</p>
                <p className="text-slate-600 dark:text-slate-300">Phone: {selectedOrder.shipping_address?.phone || selectedOrder.phone || "—"}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Shipping Address
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {typeof selectedOrder.shipping_address === "object" 
                    ? `${selectedOrder.shipping_address?.address_line1 || ""}, ${selectedOrder.shipping_address?.city || ""}, ${selectedOrder.shipping_address?.state || ""} - ${selectedOrder.shipping_address?.pincode || ""}`
                    : selectedOrder.shipping_address || selectedOrder.address || "Address not provided"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment & Total
                </p>
                <p className="text-slate-700 dark:text-slate-300">Total Amount: <span className="font-black text-emerald-600 text-sm">₹{selectedOrder.total_amount}</span></p>
                <p className="text-slate-600 dark:text-slate-400">Payment Method: {selectedOrder.payment_method || "Online"}</p>
                <p className="text-slate-600 dark:text-slate-400">Payment Status: {selectedOrder.payment_status}</p>
              </div>

              {/* Delete Order Record */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Order Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

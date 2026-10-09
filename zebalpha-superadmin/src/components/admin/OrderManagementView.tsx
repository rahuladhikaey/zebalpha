"use client";

import { useState, useEffect, useMemo } from "react";
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
  Send,
  ChevronDown,
  Download,
  Filter,
  Calendar,
  Printer,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  FileText,
  AlertCircle,
  RotateCcw,
  FileCheck,
  ArrowUpRight
} from "lucide-react";

// Robust address & customer parser
function parseOrderAddress(order: any) {
  if (!order) return { customerName: "Customer", phone: "", city: "India", pincode: "", formattedDestination: "India", fullAddress: "Customer Address" };

  const customerName = order.customer_name || order.shipping_address?.name || order.name || "Customer";
  const phone = order.phone || order.shipping_address?.phone || order.mobile || "";

  let rawAddr = order.address || order.shipping_address;
  let addrObj: any = null;

  if (typeof rawAddr === "string") {
    try {
      const parsed = JSON.parse(rawAddr);
      if (parsed && typeof parsed === "object") {
        addrObj = parsed;
      }
    } catch (_) {
      // Plain address string
    }
  } else if (typeof rawAddr === "object" && rawAddr !== null) {
    addrObj = rawAddr;
  }

  let city = order.city || "";
  let pincode = order.pincode || order.pin_code || order.postcode || "";
  let fullAddress = "";

  if (addrObj) {
    city = addrObj.city || addrObj.town || addrObj.district || city;
    pincode = addrObj.pincode || addrObj.pin_code || addrObj.postal_code || addrObj.zip || pincode;
    fullAddress = [
      addrObj.address_line1 || addrObj.address || addrObj.street || addrObj.house,
      addrObj.address_line2 || addrObj.area || addrObj.landmark,
      city,
      addrObj.state,
      pincode
    ].filter(Boolean).join(", ");
  }

  if (typeof rawAddr === "string" && !addrObj) {
    fullAddress = rawAddr.trim();
    if (!pincode) {
      const pinMatch = fullAddress.match(/\b(\d{6})\b/);
      if (pinMatch) pincode = pinMatch[1];
    }
    if (!city) {
      const parts = fullAddress.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2].replace(/-\s*\d{6}|\d{6}/g, "").trim();
        city = candidate.length > 2 ? candidate : parts[0];
      } else {
        city = fullAddress.replace(/-\s*\d{6}|\d{6}/g, "").trim();
      }
    }
  }

  city = (city || "").replace(/-\s*\d{6}|\d{6}/g, "").trim() || "India";
  pincode = pincode ? String(pincode).trim() : "";

  const formattedDestination = pincode ? `${city} (${pincode})` : city;

  return {
    customerName,
    phone,
    city,
    pincode,
    formattedDestination,
    fullAddress: fullAddress || formattedDestination
  };
}

interface OrderManagementViewProps {
  initialOrders?: any[];
  initialSellers?: any[];
  initialProducts?: any[];
  onRefresh?: () => void;
}

export default function OrderManagementView({
  initialOrders,
  initialSellers,
  initialProducts,
  onRefresh,
}: OrderManagementViewProps = {}) {
  const [loading, setLoading] = useState(!initialOrders);
  const [orders, setOrders] = useState<any[]>(() => initialOrders || []);
  const [sellers, setSellers] = useState<any[]>(initialSellers || []);
  const [products, setProducts] = useState<any[]>(initialProducts || []);

  // Main Tabs (Shiprocket style)
  const [mainTab, setMainTab] = useState<"new" | "ready_to_ship" | "pickups_manifests" | "in_transit" | "delivered" | "rto" | "all">("new");
  
  // Secondary Sub-tabs
  const [newSubTab, setNewSubTab] = useState<"new" | "on_hold">("new");
  const [rtsSubTab, setRtsSubTab] = useState<"courier_assigned" | "pickup_scheduled" | "manifested" | "all">("courier_assigned");
  const [pmSubTab, setPmSubTab] = useState<"pickup_ids" | "manifests">("pickup_ids");

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("30"); // 30 days default
  const [dateType, setDateType] = useState("created"); // created, updated, pickup
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [labelFilter, setLabelFilter] = useState("ALL"); // ALL, DOWNLOADED, NOT_DOWNLOADED
  const [sellerFilter, setSellerFilter] = useState("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState("ALL");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Selection & Bulk Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [executingBulkAction, setExecutingBulkAction] = useState(false);

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Action States
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [editingTracking, setEditingTracking] = useState(false);
  const [courierInput, setCourierInput] = useState("");
  const [awbInput, setAwbInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [pushingShiprocket, setPushingShiprocket] = useState(false);
  const [refundUtrInput, setRefundUtrInput] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  // Sync state if props change
  useEffect(() => {
    if (initialOrders) setOrders(initialOrders);
    if (initialSellers) setSellers(initialSellers);
    if (initialProducts) setProducts(initialProducts);
  }, [initialOrders, initialSellers, initialProducts]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, sellersRes, productsRes] = await Promise.all([
        fetch("/api/admin/orders").then(r => r.json()).catch(() => ({ data: [] })),
        supabase.from("sellers").select("*"),
        supabase.from("products").select("id, name, seller_id, image_url, price, sku")
      ]);

      let ordersList = ordersRes.data || [];
      if (ordersList.length === 0) {
        const { data: directOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        ordersList = directOrders || [];
      }

      // Deduplicate master order containers when seller sub-orders exist
      const deduplicated = ordersList.filter((ord: any) => {
        const num = String(ord.order_number || ord.id || "").trim();
        if (!/-S\d+$/i.test(num) && !/-SO\d+$/i.test(num)) {
          const hasSubOrder = ordersList.some((other: any) => {
            const otherNum = String(other.order_number || other.id || "").trim();
            return (otherNum.startsWith(num + "-S") || otherNum.startsWith(num + "-SO")) && otherNum !== num;
          });
          if (hasSubOrder) return false;
        }
        return true;
      });

      setOrders(deduplicated);
      setSellers(sellersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (e: any) {
      console.error("Error loading order management data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOrders) {
      loadData();
    }

    const channel = supabase
      .channel("admin-orders-realtime-shiprocket-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async () => {
        try {
          const res = await fetch("/api/admin/orders").then(r => r.json()).catch(() => ({ data: [] }));
          let ordersList = res.data || [];
          if (ordersList.length === 0) {
            const { data: directOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
            ordersList = directOrders || [];
          }
          const deduplicated = ordersList.filter((ord: any) => {
            const num = String(ord.order_number || ord.id || "").trim();
            if (!/-S\d+$/i.test(num) && !/-SO\d+$/i.test(num)) {
              const hasSubOrder = ordersList.some((other: any) => {
                const otherNum = String(other.order_number || other.id || "").trim();
                return (otherNum.startsWith(num + "-S") || otherNum.startsWith(num + "-SO")) && otherNum !== num;
              });
              if (hasSubOrder) return false;
            }
            return true;
          });
          setOrders(deduplicated);
        } catch (err) {
          console.error("Error in realtime order update:", err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialOrders]);

  // Tab count badges
  const counts = useMemo(() => {
    const res = {
      new: 0,
      on_hold: 0,
      rts_courier: 0,
      rts_pickup: 0,
      rts_manifested: 0,
      rts_all: 0,
      pickups: 0,
      manifests: 0,
      in_transit: 0,
      delivered: 0,
      rto: 0,
      all: orders.length
    };

    orders.forEach(o => {
      const st = (o.order_status || "placed").toLowerCase();

      if (st === "hold" || st === "on_hold" || st === "onhold") {
        res.on_hold++;
      } else if (["placed", "processing", "new"].includes(st)) {
        res.new++;
      } else if (["ready_to_ship", "courier_assigned"].includes(st)) {
        res.rts_courier++;
        res.rts_all++;
      } else if (["pickup_scheduled", "scheduled"].includes(st)) {
        res.rts_pickup++;
        res.rts_all++;
      } else if (["manifested"].includes(st)) {
        res.rts_manifested++;
        res.rts_all++;
      } else if (["shipped", "dispatched", "in_transit", "out_for_delivery"].includes(st)) {
        res.in_transit++;
      } else if (["delivered", "completed"].includes(st)) {
        res.delivered++;
      } else if (st.includes("rto") || st.includes("return")) {
        res.rto++;
      }

      if (o.pickup_scheduled_at || st === "pickup_scheduled") res.pickups++;
      if (o.manifest_id || st === "manifested") res.manifests++;
    });

    return res;
  }, [orders]);

  // Filtered orders list based on Tab, Date, Search, and Status dropdowns
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const st = (o.order_status || "placed").toLowerCase();
      const createdDate = new Date(o.created_at || Date.now());
      const now = new Date();

      // 1. Date Range Filter
      if (dateFilter !== "ALL") {
        const days = Number(dateFilter) || 30;
        const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > days) return false;
      }

      // 2. Main Tab Filter
      if (mainTab === "new") {
        if (newSubTab === "new" && !["placed", "processing", "new"].includes(st)) return false;
        if (newSubTab === "on_hold" && !["hold", "on_hold", "onhold"].includes(st)) return false;
      } else if (mainTab === "ready_to_ship") {
        if (rtsSubTab === "courier_assigned" && !["ready_to_ship", "courier_assigned"].includes(st)) return false;
        if (rtsSubTab === "pickup_scheduled" && !["pickup_scheduled", "scheduled"].includes(st)) return false;
        if (rtsSubTab === "manifested" && st !== "manifested") return false;
        if (rtsSubTab === "all" && !["ready_to_ship", "courier_assigned", "pickup_scheduled", "scheduled", "manifested"].includes(st)) return false;
      } else if (mainTab === "pickups_manifests") {
        if (pmSubTab === "pickup_ids" && (!o.pickup_scheduled_at && st !== "pickup_scheduled")) return false;
        if (pmSubTab === "manifests" && (!o.manifest_id && st !== "manifested")) return false;
      } else if (mainTab === "in_transit") {
        if (!["shipped", "dispatched", "in_transit", "out_for_delivery"].includes(st)) return false;
      } else if (mainTab === "delivered") {
        if (!["delivered", "completed"].includes(st)) return false;
      } else if (mainTab === "rto") {
        if (!st.includes("rto") && !st.includes("return")) return false;
      }

      // 3. Status Filter Dropdown
      if (statusFilter !== "ALL") {
        if (st !== statusFilter.toLowerCase()) return false;
      }

      // 4. Label Downloaded Filter
      if (labelFilter === "DOWNLOADED" && !o.label_downloaded) return false;
      if (labelFilter === "NOT_DOWNLOADED" && o.label_downloaded) return false;

      // 5. Payment Mode Filter
      if (paymentModeFilter !== "ALL") {
        const pMode = (o.payment_method || "COD").toUpperCase();
        if (paymentModeFilter === "COD" && pMode !== "COD") return false;
        if (paymentModeFilter === "PREPAID" && pMode === "COD") return false;
      }

      // 6. Search Query Filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const orderNum = String(o.order_number || o.id || "").toLowerCase();
        const custName = String(o.shipping_address?.name || o.customer_name || "").toLowerCase();
        const phone = String(o.shipping_address?.phone || o.phone || "");
        const awb = String(o.tracking_number || o.shipment_id || "").toLowerCase();
        const email = String(o.email || o.shipping_address?.email || "").toLowerCase();
        const sku = String(o.items?.[0]?.sku || o.sku || "").toLowerCase();

        const matches = orderNum.includes(q) || custName.includes(q) || phone.includes(q) || awb.includes(q) || email.includes(q) || sku.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [orders, mainTab, newSubTab, rtsSubTab, pmSubTab, dateFilter, statusFilter, labelFilter, paymentModeFilter, searchQuery]);

  // Paginated subset
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrderIds([]);
  }, [mainTab, newSubTab, rtsSubTab, pmSubTab, searchQuery, dateFilter, statusFilter, labelFilter, paymentModeFilter]);

  // Handle Selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(paginatedOrders.map(o => String(o.id)));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, id]);
    } else {
      setSelectedOrderIds(prev => prev.filter(i => i !== id));
    }
  };

  // Actions
  const handlePushShiprocket = async (orderId: string | number) => {
    setPushingShiprocket(true);
    try {
      const res = await fetch("/api/admin/orders/push-shiprocket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await res.json();
      if (result.success) {
        setStatusMsg("✓ " + (result.message || "Pushed to Shiprocket successfully!"));
        if (result.data) {
          setSelectedOrder(result.data);
        }
        await loadData();
        onRefresh?.();
      } else {
        setStatusMsg("⚠️ " + (result.message || "Failed to push to Shiprocket"));
      }
    } catch (err: any) {
      setStatusMsg("Error: " + err.message);
    } finally {
      setPushingShiprocket(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string | number, newStatus: string) => {
    try {
      const updates: any = { 
        order_status: newStatus.toLowerCase(), 
        updated_at: new Date().toISOString() 
      };

      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, ...updates })
      }).catch(() => null);

      try {
        await supabase.from("orders").update(updates).eq("id", orderId);
      } catch (_) {}

      setStatusMsg(`✓ Status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setStatusMsg(""), 3000);

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updates } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updates });
      }
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || "Failed to update order status.");
    }
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!window.confirm("Permanently delete this order record?")) return;
    try {
      const res = await fetch(`/api/admin/orders?id=${orderId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({ success: false }));
      if (res.ok && json.success) {
        setStatusMsg("✓ Order deleted successfully!");
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
        await loadData();
        onRefresh?.();
      } else {
        alert("⚠️ Failed to delete order: " + (json.message || "Database restriction"));
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete order.");
    }
  };

  // Bulk Actions Handler
  const handleExecuteBulkAction = async () => {
    if (!bulkAction || selectedOrderIds.length === 0) return;
    setExecutingBulkAction(true);
    try {
      if (bulkAction === "assign_courier") {
        for (const id of selectedOrderIds) {
          await handleUpdateOrderStatus(id, "ready_to_ship");
        }
        setStatusMsg(`✓ Assigned courier & set ${selectedOrderIds.length} orders to Ready To Ship`);
      } else if (bulkAction === "request_pickup") {
        for (const id of selectedOrderIds) {
          await handleUpdateOrderStatus(id, "pickup_scheduled");
        }
        setStatusMsg(`✓ Scheduled pickup for ${selectedOrderIds.length} orders`);
      } else if (bulkAction === "generate_label") {
        setStatusMsg(`✓ Generated shipping labels for ${selectedOrderIds.length} orders`);
      } else if (bulkAction === "hold") {
        for (const id of selectedOrderIds) {
          await handleUpdateOrderStatus(id, "hold");
        }
        setStatusMsg(`✓ Moved ${selectedOrderIds.length} orders to On Hold`);
      } else if (bulkAction === "release_hold") {
        for (const id of selectedOrderIds) {
          await handleUpdateOrderStatus(id, "placed");
        }
        setStatusMsg(`✓ Released ${selectedOrderIds.length} orders from Hold`);
      } else if (bulkAction === "cancel") {
        if (window.confirm(`Cancel ${selectedOrderIds.length} selected orders?`)) {
          for (const id of selectedOrderIds) {
            await handleUpdateOrderStatus(id, "cancelled");
          }
          setStatusMsg(`✓ Cancelled ${selectedOrderIds.length} orders`);
        }
      } else if (bulkAction === "delete") {
        if (window.confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedOrderIds.length} selected orders? This action cannot be undone.`)) {
          for (const id of selectedOrderIds) {
            await fetch(`/api/admin/orders?id=${id}`, { method: "DELETE" }).catch(() => null);
          }
          setStatusMsg(`✓ Permanently deleted ${selectedOrderIds.length} orders`);
          await loadData();
          onRefresh?.();
        }
      }
      setSelectedOrderIds([]);
      setBulkAction("");
    } catch (e: any) {
      alert("Error in bulk action: " + e.message);
    } finally {
      setExecutingBulkAction(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders available to export.");
      return;
    }
    const headers = ["Order Number", "Date", "Customer Name", "Phone", "City", "Total Amount", "Payment Method", "Status", "Courier", "AWB"];
    const rows = filteredOrders.map(o => {
      const dest = parseOrderAddress(o);
      return [
        `"${o.order_number || o.id}"`,
        `"${new Date(o.created_at).toLocaleDateString()}"`,
        `"${dest.customerName}"`,
        `"${dest.phone}"`,
        `"${dest.city}"`,
        o.total_amount || 0,
        `"${o.payment_method || "COD"}"`,
        `"${o.order_status || "placed"}"`,
        `"${o.courier_name || "Delhivery"}"`,
        `"${o.tracking_number || ""}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans">
      
      {/* Top Header & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/80 p-6 rounded-3xl border border-zinc-800 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-950/60 border border-purple-800/60 rounded-2xl text-purple-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Orders & Logistics Management</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Shiprocket Verified
              </span>
            </h1>
            <p className="text-xs font-bold text-zinc-400 mt-0.5">
              Multi-Vendor Order Processing, AWB Label Generation & Live Courier Syncing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-purple-400 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Orders</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Status Message Banner */}
      {statusMsg && (
        <div className="p-4 rounded-2xl bg-purple-950/50 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg("")} className="text-purple-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Shiprocket-Style Order Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-950/60 rounded-3xl border p-2 backdrop-blur-md">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { key: "new", label: "New", count: counts.new + counts.on_hold },
            { key: "ready_to_ship", label: "Ready To Ship", count: counts.rts_all },
            { key: "pickups_manifests", label: "Pickups & Manifests", count: counts.pickups },
            { key: "in_transit", label: "In Transit", count: counts.in_transit },
            { key: "delivered", label: "Delivered", count: counts.delivered },
            { key: "rto", label: "RTO", count: counts.rto },
            { key: "all", label: "All", count: counts.all },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                mainTab === t.key
                  ? "bg-white text-black shadow-lg shadow-white/10 font-extrabold"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                mainTab === t.key ? "bg-black/10 text-black" : "bg-zinc-800 text-zinc-400"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Secondary Sub-Tabs */}
      {mainTab === "new" && (
        <div className="flex items-center gap-2 px-2">
          <button
            onClick={() => setNewSubTab("new")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              newSubTab === "new" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            New ({counts.new})
          </button>
          <button
            onClick={() => setNewSubTab("on_hold")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              newSubTab === "on_hold" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            On Hold ({counts.on_hold})
          </button>
        </div>
      )}

      {mainTab === "ready_to_ship" && (
        <div className="flex items-center gap-2 px-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setRtsSubTab("courier_assigned")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              rtsSubTab === "courier_assigned" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            Courier Assigned ({counts.rts_courier})
          </button>
          <button
            onClick={() => setRtsSubTab("pickup_scheduled")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              rtsSubTab === "pickup_scheduled" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            Pickup Scheduled ({counts.rts_pickup})
          </button>
          <button
            onClick={() => setRtsSubTab("manifested")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              rtsSubTab === "manifested" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            Manifested ({counts.rts_manifested})
          </button>
          <button
            onClick={() => setRtsSubTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              rtsSubTab === "all" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            All ({counts.rts_all})
          </button>
        </div>
      )}

      {mainTab === "pickups_manifests" && (
        <div className="flex items-center gap-2 px-2">
          <button
            onClick={() => setPmSubTab("pickup_ids")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pmSubTab === "pickup_ids" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            Pickup Request IDs ({counts.pickups})
          </button>
          <button
            onClick={() => setPmSubTab("manifests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              pmSubTab === "manifests" ? "bg-purple-600/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-white"
            }`}
          >
            Shipping Manifests ({counts.manifests})
          </button>
        </div>
      )}

      {/* Control & Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-zinc-950/80 border border-zinc-800 space-y-4 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search for AWB, Order ID, Buyer Mobile, Email, SKU, Pickup ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-purple-500 transition-all font-medium"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-zinc-300 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="30">Last 30 days</option>
                <option value="7">Last 7 days</option>
                <option value="1">Today</option>
                <option value="90">Last 90 days</option>
                <option value="ALL">All Time</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Date Type Dropdown */}
            <div className="relative">
              <select
                value={dateType}
                onChange={(e) => setDateType(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-zinc-300 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="created">Date Type: Order Created</option>
                <option value="updated">Date Type: Order Updated</option>
                <option value="pickup">Date Type: Pickup Scheduled</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-zinc-300 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">Select Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="PROCESSING">Processing</option>
                <option value="READY_TO_SHIP">Ready To Ship</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="HOLD">On Hold</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Label Downloaded */}
            <div className="relative">
              <select
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-zinc-300 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">Label Status: All</option>
                <option value="DOWNLOADED">Label Downloaded</option>
                <option value="NOT_DOWNLOADED">Not Downloaded</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showMoreFilters ? "bg-purple-600 text-white border-purple-500" : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* More Filters Drawer */}
        {showMoreFilters && (
          <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Filter by Seller Store</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
              >
                <option value="ALL">All Sellers & Brands</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.business_name || s.name || s.owner_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Filter by Payment Mode</label>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="PREPAID">Prepaid (Razorpay / UPI)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDateFilter("30");
                  setStatusFilter("ALL");
                  setLabelFilter("ALL");
                  setSellerFilter("ALL");
                  setPaymentModeFilter("ALL");
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold transition-all"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-800/80 flex items-center justify-between gap-4 animate-in fade-in">
            <span className="text-xs font-black text-purple-200">
              {selectedOrderIds.length} Order{selectedOrderIds.length > 1 ? "s" : ""} Selected
            </span>

            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="bg-zinc-900 border border-purple-700/60 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
              >
                <option value="">Select Bulk Action</option>
                <option value="assign_courier">Assign Courier & Ready to Ship</option>
                <option value="request_pickup">Schedule Bulk Pickup</option>
                <option value="generate_label">Download Shipping Labels (PDF)</option>
                <option value="hold">Put On Hold</option>
                <option value="release_hold">Release From Hold</option>
                <option value="cancel">Cancel Selected Orders</option>
                <option value="delete">Delete Selected Orders (Permanent)</option>
              </select>

              <button
                onClick={handleExecuteBulkAction}
                disabled={!bulkAction || executingBulkAction}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                {executingBulkAction ? "Executing..." : "Apply Bulk Action"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-zinc-950/80 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-zinc-400">Loading Multi-Vendor Logistics Data...</p>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-purple-400 shadow-xl">
              <Package className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">No Orders Found</h3>
              <p className="text-xs font-bold text-zinc-500 mt-1">We could not find any data matching your active tab & filters.</p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all"
            >
              Reset Filters & Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="p-4 pl-6 w-10">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length > 0 && selectedOrderIds.length === paginatedOrders.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Package Details</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Pickup Address</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                {paginatedOrders.map(ord => {
                  const dest = parseOrderAddress(ord);
                  const st = (ord.order_status || "placed").toLowerCase();
                  const isSelected = selectedOrderIds.includes(String(ord.id));
                  const itemsList = ord.items || ord.product_details || [];
                  const firstItem = itemsList[0] || {};

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-zinc-900/40 transition-colors ${isSelected ? "bg-purple-950/20" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 pl-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(String(ord.id), e.target.checked)}
                          className="rounded border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Order Details */}
                      <td className="p-4">
                        <p className="font-black text-white font-mono flex items-center gap-1.5">
                          <span>#{ord.order_number || ord.id}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase font-sans">
                            ZEBALPHA
                          </span>
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{new Date(ord.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </p>
                      </td>

                      {/* Customer Details */}
                      <td className="p-4">
                        <p className="font-black text-white">{dest.customerName}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[160px]" title={dest.fullAddress}>
                          🏠 {dest.formattedDestination}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{dest.phone || "—"}</p>
                      </td>

                      {/* Product Details */}
                      <td className="p-4">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          {firstItem.image_url ? (
                            <img src={firstItem.image_url} alt="" className="w-9 h-9 object-cover rounded-lg border border-zinc-800 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate text-[11px]">{firstItem.name || firstItem.title || "Apparel Item"}</p>
                            <p className="text-[10px] text-zinc-400">Qty: {firstItem.quantity || 1} • SKU: {firstItem.sku || "ZEB-SKU"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Package Details */}
                      <td className="p-4">
                        <p className="text-white font-mono text-[11px]">0.50 kg</p>
                        <p className="text-[10px] text-zinc-400">15 x 10 x 5 cm</p>
                        <span className="text-[9px] font-bold text-purple-400">Volumetric: 0.15 kg</span>
                      </td>

                      {/* Payment */}
                      <td className="p-4">
                        <p className="font-black text-emerald-400 text-sm">₹{Number(ord.total_amount || 0).toLocaleString("en-IN")}</p>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase">
                          {ord.payment_method || "COD"} • {ord.payment_status || "PAID"}
                        </span>
                      </td>

                      {/* Pickup Address */}
                      <td className="p-4">
                        <p className="font-bold text-white flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>{ord.seller_name || "Primary Hub"}</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[150px]" title={ord.pickup_address || "Hub Store"}>
                          📍 {ord.pickup_address || "Kolkata Fulfillment Hub"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          st === "delivered" || st === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : st === "ready_to_ship" || st === "courier_assigned"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : st === "shipped" || st === "in_transit"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : st === "hold" || st === "on_hold"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : st === "cancelled"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}>
                          {st.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right pr-6 space-x-2">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          View Details
                        </button>

                        {!ord.tracking_number ? (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, "ready_to_ship")}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black transition-all cursor-pointer"
                          >
                            Assign Courier
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePushShiprocket(ord.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition-all cursor-pointer"
                          >
                            Download Label
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          title="Delete Order"
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Pagination Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-bold text-zinc-400">
          <div className="flex items-center gap-3">
            <span>Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span className="text-zinc-500">
              Showing {filteredOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
              {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>PREV</span>
            </button>

            <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>NEXT</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Order & Logistics Statement</span>
                <h3 className="font-black text-white text-lg flex items-center gap-2 mt-0.5">
                  <Package className="w-5 h-5 text-purple-400" />
                  <span>Order #{selectedOrder.order_number || selectedOrder.id}</span>
                </h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Customer Info
                  </p>
                  <p className="text-white text-sm font-black">{parseOrderAddress(selectedOrder).customerName}</p>
                  <p className="text-zinc-400 font-mono text-[11px]">Phone: {parseOrderAddress(selectedOrder).phone || "—"}</p>
                </div>

                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Shipping Destination
                  </p>
                  <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                    {parseOrderAddress(selectedOrder).fullAddress}
                  </p>
                </div>
              </div>

              {/* Courier & AWB section */}
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                <span className="text-[10px] font-black uppercase text-purple-400">Logistics Tracking</span>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="font-mono text-sm font-black">{selectedOrder.tracking_number || "AWB Not Generated"}</p>
                    <p className="text-zinc-400 text-[11px]">{selectedOrder.courier_name || "Delhivery Surface"}</p>
                  </div>
                  <button
                    onClick={() => handlePushShiprocket(selectedOrder.id)}
                    disabled={pushingShiprocket}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all cursor-pointer"
                  >
                    {pushingShiprocket ? "Syncing..." : "Sync Shiprocket"}
                  </button>
                </div>
              </div>
            </div>

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
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-black hover:bg-zinc-200 transition-all cursor-pointer"
              >
                Close Statement
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

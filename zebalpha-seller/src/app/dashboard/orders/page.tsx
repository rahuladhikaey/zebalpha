"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Order, Product } from "@shared/types";
import { 
  Receipt, 
  Package, 
  User, 
  MapPin, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Box,
  Trash,
  Download,
  Printer,
  AlertTriangle,
  Zap,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  IndianRupee,
  CreditCard,
  Ban
} from "lucide-react";
import dynamic from "next/dynamic";
import { calculateOrderItemFee, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";

const ShippingLabelModal = dynamic(
  () => import("@/components/ShippingLabelModal").then((mod) => mod.ShippingLabelModal),
  { ssr: false, loading: () => null }
);

export default function SellerOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [slaFilter, setSlaFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Modals
  const [labelModalOrder, setLabelModalOrder] = useState<any | null>(null);
  const [reviewReturnOrder, setReviewReturnOrder] = useState<any | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch seller profile
      const { data: sProfile } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setSellerProfile(sProfile);

      const sellerIdsToMatch = [user.id];
      if (sProfile?.id) sellerIdsToMatch.push(sProfile.id);

      // 2. Fetch seller's products
      let productsData: any[] = [];
      try {
        const { data: pData } = await supabase
          .from("products")
          .select("*")
          .or(`seller_id.eq.${user.id}${sProfile?.id ? `,seller_id.eq.${sProfile.id}` : ""}`);
        productsData = pData || [];
      } catch (pErr) {
        const { data: pDataFallback } = await supabase
          .from("products")
          .select("*")
          .eq("seller_id", user.id);
        productsData = pDataFallback || [];
      }
      
      const sProducts = (productsData || []) as Product[];
      setSellerProducts(sProducts);
      const sellerProductIdSet = new Set(sProducts.map(p => String(p.id)));

      // Check linked seller_orders
      let linkedParentOrderIds = new Set<string>();
      try {
        const { data: sOrders } = await supabase
          .from("seller_orders")
          .select("parent_order_id")
          .or(`seller_id.eq.${user.id}${sProfile?.id ? `,seller_id.eq.${sProfile.id}` : ""}`);
        if (sOrders) {
          sOrders.forEach((so: any) => {
            if (so.parent_order_id) linkedParentOrderIds.add(String(so.parent_order_id));
          });
        }
      } catch (soErr) {
        console.warn("seller_orders query notice:", soErr);
      }

      // 3. Fetch orders (direct, linked seller_orders, and recent fallback)
      const sellerIdFilters = sellerIdsToMatch.map(id => `seller_id.eq.${id}`).join(",");
      let directOrders: any[] = [];
      if (sellerIdFilters) {
        const { data: dOrders, error: dErr } = await supabase
          .from("orders")
          .select("*")
          .or(sellerIdFilters)
          .order("created_at", { ascending: false })
          .limit(200);
        if (dErr) console.warn("Direct seller orders query error:", dErr);
        if (dOrders) directOrders = dOrders;
      }

      let linkedOrders: any[] = [];
      const parentIdsArray = Array.from(linkedParentOrderIds).filter(Boolean);
      if (parentIdsArray.length > 0) {
        const { data: lOrders, error: lErr } = await supabase
          .from("orders")
          .select("*")
          .in("id", parentIdsArray.slice(0, 100))
          .order("created_at", { ascending: false });
        if (lErr) console.warn("Linked orders query error:", lErr);
        if (lOrders) linkedOrders = lOrders;
      }

      let recentFallbackOrders: any[] = [];
      try {
        const { data: rOrders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (rOrders) recentFallbackOrders = rOrders;
      } catch (_) {}

      // Merge and deduplicate by order id
      const orderMap = new Map<string, any>();
      [...directOrders, ...linkedOrders, ...recentFallbackOrders].forEach(o => {
        if (o && o.id) orderMap.set(String(o.id), o);
      });
      const allOrders = Array.from(orderMap.values()) as Order[];

      // 4. Parse order items
      const filteredOrders: any[] = [];
      allOrders.forEach(order => {
        try {
          const isDirectSellerOrder = 
            order.seller_id === user.id || 
            (sProfile?.id && order.seller_id === sProfile.id) ||
            linkedParentOrderIds.has(String(order.id)) ||
            (order.order_number && linkedParentOrderIds.has(String(order.order_number)));

          let rawItems: any[] = [];
          const sourceItems = order.items || order.product_details;
          if (Array.isArray(sourceItems)) {
            rawItems = sourceItems;
          } else if (typeof sourceItems === "string") {
            try {
              const parsed = JSON.parse(sourceItems || "[]");
              rawItems = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
            } catch (_) {
              rawItems = [];
            }
          } else if (sourceItems && typeof sourceItems === "object") {
            rawItems = [sourceItems];
          }

          let sellerItems: any[] = [];
          if (sellerProductIdSet.size > 0) {
            sellerItems = rawItems.filter((item: any) => {
              const pId = String(item.product_id || item.id || "");
              const itSeller = item.seller_id;
              return sellerProductIdSet.has(pId) || 
                itSeller === user.id || 
                (sProfile?.id && itSeller === sProfile.id);
            });
          }
          
          const finalItems = sellerItems.length > 0 ? sellerItems : rawItems;

          if (isDirectSellerOrder || finalItems.length > 0) {
            const sellerTotal = finalItems.reduce((sum: number, item: any) => 
              sum + (Number(item.subtotal) || ((Number(item.price) || 0) * (Number(item.quantity) || 1))), 0);

            filteredOrders.push({
              ...order,
              items: finalItems,
              seller_items: finalItems,
              seller_total: sellerTotal > 0 ? sellerTotal : (Number(order.total_amount) || 0)
            });
          }
        } catch (e) {
          console.error("Error parsing order items", order.id, e);
        }
      });

      const deduplicatedSellerOrders = filteredOrders.filter((ord: any) => {
        const num = String(ord.order_number || ord.id || "").trim();
        if (!/-S\d+$/i.test(num) && !/-SO\d+$/i.test(num)) {
          const hasSubOrder = filteredOrders.some((other: any) => {
            const otherNum = String(other.order_number || other.id || "").trim();
            return (otherNum.startsWith(num + "-S") || otherNum.startsWith(num + "-SO")) && otherNum !== num;
          });
          if (hasSubOrder) return false;
        }
        return true;
      });

      setOrders(deduplicatedSellerOrders);
    } catch (e) {
      console.error("Error loading orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update order status with state-machine transition
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, extraBody: any = {}) => {
    setActionLoading(true);
    setStatusMessage(`Updating status to ${newStatus.replace(/_/g, " ").toUpperCase()}...`);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: newStatus,
          ...extraBody
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(`✓ Status updated to ${newStatus.replace(/_/g, " ").toUpperCase()}`);
        if (cancelModalOrder) {
          setCancelModalOrder(null);
          setCancelReason("");
        }
        await loadData();
      } else {
        alert(data.message || "Failed to update order status");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  // Handle return action
  const handleReturnAction = async (orderId: string, action: string, extraData: any = {}) => {
    setProcessingReturn(true);
    setStatusMessage(`Processing return action: ${action}...`);
    try {
      const res = await fetch("/api/orders/return-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action,
          ...extraData
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage(`✓ Return status updated successfully (${action})`);
        setReviewReturnOrder(null);
        setShowRejectBox(false);
        setRejectionReasonInput("");
        await loadData();
      } else {
        alert(json.message || "Failed to process return action");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingReturn(false);
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  // Logistics manifest & seller order acceptance
  const handleCreateShipment = async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder?.created_at) {
      const orderCreatedAt = new Date(targetOrder.created_at).getTime();
      const elapsedMins = (Date.now() - orderCreatedAt) / 60000;
      if (elapsedMins < 60) {
        const remaining = Math.max(1, Math.ceil(60 - elapsedMins));
        alert(`⏱️ Order #${targetOrder.order_number || targetOrder.id} is currently in the 1-Hour Customer Cancellation Window (${remaining} mins remaining).\n\nCustomers are allowed to cancel within 1 hour of placing the order. To prevent unnecessary courier fees and reverse logistics charges, orders can only be accepted after 1 hour has elapsed.\n\nTime remaining: ${remaining} minutes.`);
        return;
      }
    }

    setStatusMessage("Connecting to Shiprocket & Generating AWB...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let resData: any = null;

      try {
        const response = await fetch("/api/shipping/create-shipment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || ""}`
          },
          body: JSON.stringify({ orderId })
        });
        resData = await response.json().catch(() => null);
      } catch (directErr) {
        console.warn("Direct shipment API notice:", directErr);
      }

      if (resData && resData.success) {
        setStatusMessage(resData.message || `✓ Manifested! AWB: ${resData.awbNumber || "Assigned"}`);
        await loadData();
        const target = orders.find(o => o.id === orderId) || { id: orderId };
        setLabelModalOrder({
          ...target,
          order_status: "ready_to_ship",
          tracking_number: resData.awbNumber || target.tracking_number,
          courier_name: resData.courierName || target.courier_name,
          shipment_id: resData.shipmentId || target.shipment_id,
          routing_hub: resData.routingHub || target.routing_hub,
          label_url: resData.labelUrl || target.label_url,
          shipping_label_url: resData.labelUrl || target.shipping_label_url,
        });
      } else {
        alert(`⚠️ Shiprocket Push Failed:\n\n${resData?.message || "Could not push order to Shiprocket. Please check your SHIPROCKET_EMAIL & SHIPROCKET_PASSWORD environment variables."}`);
        setStatusMessage(`⚠️ Shiprocket Push Error: ${resData?.message || "Failed"}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Tab count calculation across all 14 requested states
  const getTabCount = (tabKey: string) => {
    return orders.filter(o => {
      const st = String(o.order_status || "placed").toLowerCase();
      const retSt = String(o.return_status || "").toLowerCase();
      switch (tabKey) {
        case "all": return true;
        case "new": return st === "placed" || st === "new";
        case "confirmed": return st === "confirmed";
        case "processing": return st === "processing";
        case "packed": return st === "packed";
        case "ready_for_pickup": return st === "ready_for_pickup" || st === "ready_to_ship";
        case "shipped": return st === "shipped" || st === "picked_up";
        case "in_transit": return st === "in_transit" || st === "out_for_delivery";
        case "delivered": return st === "delivered";
        case "cancelled": return st === "cancelled";
        case "return_requested": return st === "return_requested" || retSt === "requested";
        case "returned": return st === "returned" || retSt === "completed";
        case "rto": return st.startsWith("rto");
        case "refunded": return o.refund_status === "COMPLETED" || st === "refunded";
        default: return false;
      }
    }).length;
  };

  // Filtered orders list
  const tabFilteredOrders = orders.filter(o => {
    const st = String(o.order_status || "placed").toLowerCase();
    const retSt = String(o.return_status || "").toLowerCase();

    if (activeTab === "all") return true;
    if (activeTab === "new") return st === "placed" || st === "new";
    if (activeTab === "confirmed") return st === "confirmed";
    if (activeTab === "processing") return st === "processing";
    if (activeTab === "packed") return st === "packed";
    if (activeTab === "ready_for_pickup") return st === "ready_for_pickup" || st === "ready_to_ship";
    if (activeTab === "shipped") return st === "shipped" || st === "picked_up";
    if (activeTab === "in_transit") return st === "in_transit" || st === "out_for_delivery";
    if (activeTab === "delivered") return st === "delivered";
    if (activeTab === "cancelled") return st === "cancelled";
    if (activeTab === "return_requested") return st === "return_requested" || retSt === "requested";
    if (activeTab === "returned") return st === "returned" || retSt === "completed";
    if (activeTab === "rto") return st.startsWith("rto");
    if (activeTab === "refunded") return o.refund_status === "COMPLETED" || st === "refunded";
    return true;
  });

  const displayOrders = tabFilteredOrders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    if (paymentFilter !== "all") {
      const mode = String(o.payment_method || "").toUpperCase();
      if (paymentFilter === "cod" && mode !== "COD") return false;
      if (paymentFilter === "prepaid" && mode === "COD") return false;
    }
    if (!q) return true;
    const ordNum = (o.order_number || o.id || "").toLowerCase();
    const awb = (o.tracking_number || o.shipment_id || "").toLowerCase();
    const cust = (o.customer_name || "").toLowerCase();
    return ordNum.includes(q) || awb.includes(q) || cust.includes(q);
  });

  const tabsConfig = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "confirmed", label: "Confirmed" },
    { key: "processing", label: "Ready to Pack" },
    { key: "packed", label: "Packed" },
    { key: "ready_for_pickup", label: "Ready for Pickup" },
    { key: "shipped", label: "Shipped" },
    { key: "in_transit", label: "In Transit" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
    { key: "return_requested", label: "Return Requested" },
    { key: "returned", label: "Returned" },
    { key: "rto", label: "RTO" },
    { key: "refunded", label: "Refunded" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Merchant Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Order Fulfillment & Dispatch Hub
          </h1>
          <p className="text-xs sm:text-sm font-bold text-zinc-400 mt-0.5">
            End-to-end lifecycle, packing slips, AWB barcodes, dispatch tracking, and settlement attribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Advisory Status Banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-in fade-in">
          <Truck className="h-4 w-4 animate-bounce text-purple-400" />
          {statusMessage}
        </div>
      )}

      {/* 14 Operational Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 overflow-x-auto pb-1 scrollbar-none">
        {tabsConfig.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getTabCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedOrderIds([]);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-purple-500 text-white bg-purple-500/10 rounded-t-xl"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40 rounded-t-xl"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive 
                  ? "bg-purple-600 text-white" 
                  : count > 0 
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-zinc-900 text-zinc-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white focus:outline-none cursor-pointer"
          >
            <option value="all">Payment: All Modes</option>
            <option value="prepaid">Prepaid (Razorpay/Online)</option>
            <option value="cod">Cash on Delivery (COD)</option>
          </select>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, Customer, SKU, AWB..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Orders List Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800">
          <div className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading order dispatch data...</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800">
          <Package className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">No Orders in "{activeTab.replace(/_/g, " ")}"</h3>
          <p className="text-xs font-bold text-zinc-400">
            There are no orders matching this filter queue right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrders.map((order) => {
            const isExpanded = Boolean(expandedOrderIds[order.id]);
            const orderStatus = String(order.order_status || "placed").toLowerCase();
            const isCOD = String(order.payment_method || "").toUpperCase() === "COD";
            const orderNum = order.order_number || String(order.id).slice(0, 10).toUpperCase();

            let parsedItems: any[] = [];
            const rawSource = order.seller_items || order.items || order.product_details;
            if (Array.isArray(rawSource)) {
              parsedItems = rawSource;
            } else if (typeof rawSource === "string") {
              try {
                const json = JSON.parse(rawSource || "[]");
                parsedItems = Array.isArray(json) ? json : (json && typeof json === "object" ? [json] : []);
              } catch (_) {
                parsedItems = [];
              }
            } else if (rawSource && typeof rawSource === "object") {
              parsedItems = [rawSource];
            }

            const items = parsedItems.length > 0 ? parsedItems : [{
              name: order.product_name || "Apparel Item",
              price: Number(order.seller_total || order.total_amount || 80),
              quantity: 1,
              sku: `SKU-${orderNum.slice(0, 5)}`
            }];

            // Settlement Status Calculation
            let settlementBadge = { text: "Pending Delivery", bg: "bg-zinc-800 text-zinc-400 border-zinc-700" };
            if (orderStatus === "delivered") {
              const deliveryDate = order.delivered_at ? new Date(order.delivered_at).getTime() : Date.now();
              const returnWindowEnd = deliveryDate + (7 * 24 * 60 * 60 * 1000);
              const isEligible = Date.now() >= returnWindowEnd;
              if (order.settlement_status === "SETTLED") {
                settlementBadge = { text: "✓ Paid & Settled", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
              } else if (isEligible) {
                settlementBadge = { text: "Settlement Eligible", bg: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
              } else {
                settlementBadge = { text: "In 7-Day Escrow", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
              }
            } else if (orderStatus === "cancelled") {
              settlementBadge = { text: "Cancelled - Zero Payout", bg: "bg-red-500/20 text-red-300 border-red-500/40" };
            }

            return (
              <div 
                key={order.id}
                className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 overflow-hidden hover:border-zinc-700 transition"
              >
                {/* Order Header Bar */}
                <div className="p-4 sm:p-5 bg-zinc-900/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => toggleOrderExpand(order.id)}
                      className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-black text-white">#{orderNum}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          orderStatus === "delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                          orderStatus === "cancelled" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                          orderStatus.startsWith("return") ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                          "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        }`}>
                          {orderStatus.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${settlementBadge.bg}`}>
                          {settlementBadge.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400 mt-1">
                        <span>Placed: {new Date(order.created_at || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span>•</span>
                        <span>Buyer: <strong className="text-zinc-200">{order.customer_name || "Customer"}</strong> ({order.shipping_address?.city || order.city || "India"})</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode & Total */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Order Total</span>
                      <p className="text-sm sm:text-base font-black text-white">
                        ₹{Number(order.seller_total || order.total_amount || 0).toLocaleString("en-IN")}
                      </p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isCOD ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {isCOD ? "Cash on Delivery" : "Prepaid"}
                      </span>
                    </div>

                    {/* Quick Action Drawer Button */}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>

                {/* Items Summary Row */}
                <div className="p-4 sm:p-5 space-y-3">
                  {items.map((item: any, idx: number) => {
                    const prodFallback = sellerProducts.find(p => String(p.id) === String(item.product_id || item.id));
                    const itemImage = item.image_url || item.image || (Array.isArray(item.images) ? item.images[0] : null) || prodFallback?.image_url;
                    const itemQty = Number(item.quantity || item.qty || item.units) || 1;
                    const rawPrice = Number(item.price || item.selling_price || item.unit_price);
                    const itemPrice = rawPrice > 0 ? rawPrice : (Number(order.seller_total || order.total_amount || 0) / itemQty);
                    const itemSubtotal = item.subtotal || (itemPrice * itemQty);
                    const feeBreakdown = calculateOrderItemFee(itemPrice, itemQty, DEFAULT_FINANCIAL_RULES);
                    const itemName = item.name || item.title || prodFallback?.name || "Apparel Product";

                    return (
                      <div 
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-800/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {itemImage ? (
                              <img src={itemImage} alt={itemName} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-zinc-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white line-clamp-1">{itemName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold text-zinc-400 mt-0.5">
                              {item.color && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                                  Color: {item.color}
                                </span>
                              )}
                              {item.size && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 border border-purple-500/30">
                                  Size: {item.size}
                                </span>
                              )}
                              <span>SKU: {item.sku || `SKU-${orderNum.slice(0, 5)}`}</span>
                              <span>Qty: {itemQty}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Attribution for Item */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-zinc-400">Selling Price</span>
                            <p className="text-xs font-black text-white">₹{itemSubtotal.toLocaleString("en-IN")}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-400">Est. Seller Payout</span>
                            <p className="text-xs font-black text-emerald-300">₹{feeBreakdown.net_seller_earnings.toLocaleString("en-IN")}</p>
                            <span className="text-[9px] text-zinc-500">Fees: -₹{feeBreakdown.total_deductions}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Seller Actions Toolbar */}
                <div className="p-4 bg-zinc-950/60 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {order.tracking_number && (
                      <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-purple-400" />
                        <span>AWB: {order.tracking_number}</span>
                        {order.courier_name && <span className="text-zinc-500">({order.courier_name})</span>}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* New -> Confirm */}
                    {(orderStatus === "placed" || orderStatus === "new") && (() => {
                      const createdAt = new Date(order.created_at || Date.now()).getTime();
                      const elapsedMins = (Date.now() - createdAt) / 60000;
                      const isLocked = elapsedMins < 60;
                      const remaining = Math.max(1, Math.ceil(60 - elapsedMins));

                      return (
                        <button
                          onClick={() => handleCreateShipment(order.id)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer ${
                            isLocked 
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30" 
                              : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                          }`}
                        >
                          {isLocked ? <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {isLocked ? `⏱️ Locked (${remaining}m Left)` : "Accept & Confirm"}
                        </button>
                      );
                    })()}

                    {/* Confirmed -> Pack */}
                    {orderStatus === "confirmed" && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "packed")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        <Box className="h-3.5 w-3.5" />
                        Mark Packed
                      </button>
                    )}

                    {/* Packed -> Ready for Pickup */}
                    {orderStatus === "packed" && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "ready_for_pickup")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Mark Ready for Pickup
                      </button>
                    )}

                    {/* Ready for Pickup -> Ship / Dispatch */}
                    {(orderStatus === "ready_for_pickup" || orderStatus === "ready_to_ship") && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "shipped")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Handover / Mark Shipped
                      </button>
                    )}

                    {/* Shipped / In Transit -> Deliver (For full end-to-end testing) */}
                    {(orderStatus === "shipped" || orderStatus === "in_transit") && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                        title="Simulate / Confirm Delivery and Trigger Escrow Settlement"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirm Delivery
                      </button>
                    )}

                    {/* Return Action */}
                    {orderStatus.startsWith("return") && (
                      <button
                        onClick={() => setReviewReturnOrder(order)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        Review Return & QC
                      </button>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details & Financial Calculation Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-2xl w-full rounded-3xl bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Order Audit & Economics</span>
                <h3 className="text-xl font-black text-white">Order #{selectedOrder.order_number || selectedOrder.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Ledger Calculation Card */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-400" />
                <span>Marketplace Economics & Payout Breakdown</span>
              </h4>

              {(() => {
                const rawItems = selectedOrder.items || selectedOrder.seller_items || [];
                const items = Array.isArray(rawItems) ? rawItems : [];
                const gross = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
                const feeBreakdown = calculateOrderItemFee(gross, 1, DEFAULT_FINANCIAL_RULES);

                return (
                  <div className="space-y-2 text-xs divide-y divide-zinc-800">
                    <div className="flex justify-between py-1.5 text-zinc-300 font-bold">
                      <span>Gross Customer Selling Price</span>
                      <span className="text-white font-black">₹{feeBreakdown.gross_amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-zinc-400 font-medium">
                      <span>Platform Commission ({feeBreakdown.effective_commission_pct}%)</span>
                      <span className="text-rose-400 font-bold">-₹{feeBreakdown.commission_fee}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-zinc-400 font-medium">
                      <span>Fixed Closing Fee</span>
                      <span className="text-rose-400 font-bold">-₹{feeBreakdown.fixed_fee}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-zinc-400 font-medium">
                      <span>Payment Collection Fee</span>
                      <span className="text-rose-400 font-bold">-₹{feeBreakdown.collection_fee}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-zinc-400 font-medium">
                      <span>Forward Shipping Logistics</span>
                      <span className="text-rose-400 font-bold">-₹{feeBreakdown.shipping_fee}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-zinc-400 font-medium">
                      <span>GST (18%) on Marketplace Fees</span>
                      <span className="text-rose-400 font-bold">-₹{feeBreakdown.tax_on_fees}</span>
                    </div>
                    <div className="flex justify-between pt-3 text-sm font-black border-t border-zinc-700">
                      <span className="text-emerald-400">Net Seller Settlement Amount</span>
                      <span className="text-emerald-300 font-black">₹{feeBreakdown.net_seller_earnings.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Shipping & Delivery Info */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Customer Shipping Details</span>
              <p className="font-bold text-white">{selectedOrder.customer_name || "Customer"}</p>
              <p className="text-zinc-400 font-medium">{typeof selectedOrder.shipping_address === "string" ? selectedOrder.shipping_address : (selectedOrder.shipping_address?.address || selectedOrder.address || "Address on File")}</p>
              <p className="text-zinc-500 font-mono">Pincode: {selectedOrder.pincode || selectedOrder.shipping_address?.pincode || "N/A"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-md w-full rounded-3xl bg-zinc-950 p-6 border border-zinc-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <span>Cancel Order #{cancelModalOrder.order_number || cancelModalOrder.id}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Please enter the operational reason for order cancellation. An immutable record will be stored.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Out of stock, Buyer requested cancellation..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-bold"
              >
                Back
              </button>
              <button
                onClick={() => handleUpdateOrderStatus(cancelModalOrder.id, "cancelled", { cancellation_reason: cancelReason })}
                disabled={!cancelReason.trim() || actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase disabled:opacity-50"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Review Modal */}
      {reviewReturnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-xl w-full rounded-3xl bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-white">Return & QC Inspection</h3>
              <button onClick={() => setReviewReturnOrder(null)} className="h-8 w-8 rounded-full bg-zinc-900 text-zinc-400 font-bold">✕</button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Customer Return Reason</p>
              <p className="text-white font-bold">{reviewReturnOrder.return_reason || "Customer Return Request"}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleReturnAction(reviewReturnOrder.id, "CONFIRM_RECEIVED", { qc_result: "PASS" })}
                disabled={processingReturn}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
              >
                ✓ Pass QC, Restock Inventory & Approve Refund
              </button>

              <button
                onClick={() => handleReturnAction(reviewReturnOrder.id, "SUBMIT_QC", { qc_result: "DISPUTED", qc_notes: "Item damaged or wrong product returned" })}
                disabled={processingReturn}
                className="w-full py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-black text-xs uppercase tracking-wider transition cursor-pointer"
              >
                ⚠️ Fail QC & Raise SPF Seller Protection Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Label Modal */}
      {labelModalOrder && (
        <ShippingLabelModal
          isOpen={!!labelModalOrder}
          onClose={() => setLabelModalOrder(null)}
          order={labelModalOrder}
          sellerInfo={sellerProfile}
        />
      )}

    </div>
  );
}

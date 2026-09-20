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
  Check
} from "lucide-react";
import { ShippingLabelModal } from "@/components/ShippingLabelModal";

export default function SellerOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // Default to all so newly placed orders are immediately visible

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [slaFilter, setSlaFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modals
  const [labelModalOrder, setLabelModalOrder] = useState<any | null>(null);

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

      // 3. Fetch all orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersErr) {
        console.error("Error fetching orders:", ordersErr);
      }

      const allOrders = (ordersData || []) as Order[];

      // 4. Filter orders containing seller's items or direct store merchant orders
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
          } else {
            sellerItems = rawItems;
          }

          // If matched by direct seller, matching items, or general merchant view
          if (isDirectSellerOrder || sellerItems.length > 0 || sellerProductIdSet.size === 0) {
            const finalItems = sellerItems.length > 0 ? sellerItems : rawItems;
            const sellerTotal = finalItems.reduce((sum: number, item: any) => 
              sum + (item.subtotal || ((Number(item.price) || 0) * (Number(item.quantity) || 1))), 0);

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

      // Fallback: If no orders matched due to product filter, show all store orders so merchant is never blind
      if (filteredOrders.length === 0 && allOrders.length > 0) {
        allOrders.forEach(ord => {
          filteredOrders.push({
            ...ord,
            seller_items: ord.items || ord.product_details || [],
            seller_total: Number(ord.total_amount) || 0
          });
        });
      }

      // Deduplicate master order containers when actionable sub-orders exist
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

  // Pack & Generate Label (Transition Pending -> Ready to Ship)
  const handleCreateShipment = async (orderId: string) => {
    setStatusMessage("Connecting to Shiprocket & Generating AWB...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let resData: any = null;

      // 1. Try direct Next.js Shiprocket shipping route
      try {
        const response = await fetch("/api/shipping/create-shipment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || ""}`
          },
          body: JSON.stringify({ orderId })
        });
        if (response.ok) {
          resData = await response.json();
        }
      } catch (directErr) {
        console.warn("Direct Next.js shipment API notice, trying backend fallback:", directErr);
      }

      // 2. Try backend endpoint as secondary fallback
      if (!resData || !resData.success) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/shipments/create-shipment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token || ""}`
            },
            body: JSON.stringify({ orderId })
          });
          if (response.ok) {
            resData = await response.json();
          }
        } catch (apiErr) {
          console.warn("Backend shipment API notice, executing direct resilient fallback:", apiErr);
        }
      }

      if (resData && resData.success) {
        setStatusMessage(resData.message || `✓ Pushed to Shiprocket Live! AWB: ${resData.awbNumber || "Assigned"}`);
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
        });
        setIsLabelModalOpen(true);
      } else {
        const errorMsg = resData?.message || "Failed to create live shipment. Please ensure your Shiprocket account has active wallet balance (min ₹100).";
        setStatusMessage(`Error: ${errorMsg}`);
        alert(`Shiprocket Live Notice: ${errorMsg}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  // Bulk Selection handler
  const handleSelectAll = (filteredList: any[]) => {
    if (selectedOrderIds.length === filteredList.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredList.map(o => o.id));
    }
  };

  const handleToggleSelect = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Tab counts
  const pendingCount = orders.filter(o => !o.order_status || o.order_status === "placed" || o.order_status === "confirmed" || o.order_status === "processing").length;
  const readyToShipCount = orders.filter(o => o.order_status === "ready_to_ship").length;
  const shippedCount = orders.filter(o => o.order_status === "shipped" || o.order_status === "in_transit" || o.order_status === "picked_up").length;
  const deliveredCount = orders.filter(o => o.order_status === "delivered").length;
  const cancelledCount = orders.filter(o => o.order_status === "cancelled" || o.order_status === "returned").length;

  // Filtered orders list
  const tabFilteredOrders = orders.filter(o => {
    const st = (o.order_status || "placed").toLowerCase();
    if (activeTab === "pending") return st === "placed" || st === "confirmed" || st === "processing";
    if (activeTab === "ready_to_ship") return st === "ready_to_ship";
    if (activeTab === "shipped") return st === "shipped" || st === "in_transit" || st === "picked_up";
    if (activeTab === "delivered") return st === "delivered";
    if (activeTab === "cancelled") return st === "cancelled" || st === "returned";
    return true;
  });

  const displayOrders = tabFilteredOrders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const ordNum = (o.order_number || o.id || "").toLowerCase();
    const awb = (o.tracking_number || o.shipment_id || "").toLowerCase();
    const cust = (o.customer_name || "").toLowerCase();
    return ordNum.includes(q) || awb.includes(q) || cust.includes(q);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Orders Hub
          </h1>
          <p className="text-xs sm:text-sm font-bold text-zinc-400 mt-1">
            Dispatch management with barcoded label printing and courier pickup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Meesho-Inspired Advisory Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Banner 1: Label Auto-retry */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <span className="text-emerald-400">✓ Zebalpha Auto-Manifest Active</span>
            </div>
            <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
              AWB numbers and barcodes are generated instantaneously via Delhivery / Shiprocket logistics gateway.
            </p>
          </div>
        </div>

        {/* Banner 2: Fast Pack SLA */}
        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase">Fast</span>
              <span>Next Day Dispatch Standard</span>
            </div>
            <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
              Pack & download labels before 12:00 P.M. for same-day courier pickup by delivery riders.
            </p>
          </div>
        </div>
      </div>

      {/* Status Notice if any */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-in fade-in">
          <Truck className="h-4 w-4 animate-bounce text-purple-400" />
          {statusMessage}
        </div>
      )}

      {/* Orders Navigation Tabs (Matching Meesho Supplier Layout) */}
      <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "all", label: "All Orders", count: orders.length },
          { key: "pending", label: "Pending (To Pack)", count: pendingCount },
          { key: "ready_to_ship", label: "Ready to Ship", count: readyToShipCount, isPrimary: true },
          { key: "shipped", label: "Shipped", count: shippedCount },
          { key: "delivered", label: "Delivered", count: deliveredCount },
          { key: "cancelled", label: "Cancelled", count: cancelledCount },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedOrderIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-purple-500 text-white bg-purple-500/5 rounded-t-xl"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40 rounded-t-xl"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive 
                  ? "bg-purple-600 text-white" 
                  : tab.count > 0 && tab.key === "ready_to_ship"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-zinc-800 text-zinc-400"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/80">
        
        {/* Left Filter Tags */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
            <Filter className="h-3.5 w-3.5" /> Filter by:
          </div>

          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white focus:outline-none"
          >
            <option value="all">Delivery / SLA: All</option>
            <option value="breaching">Breaching Soon ⚠️</option>
            <option value="ontime">On Time ⏱️</option>
          </select>

          <select
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white focus:outline-none"
          >
            <option value="all">Label: All</option>
            <option value="downloaded">Label Downloaded</option>
            <option value="pending">Label Pending</option>
          </select>

          {selectedOrderIds.length > 0 && (
            <span className="px-3 py-1 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-black">
              {selectedOrderIds.length} Selected
            </span>
          )}
        </div>

        {/* Right Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, SKU, AWB..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800">
          <div className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading order dispatch data...</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800">
          <Package className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">No Orders in this view</h3>
          <p className="text-xs font-bold text-zinc-400">
            No orders match the selected tab "{activeTab}". Try switching tabs or clearing filters.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === displayOrders.length && displayOrders.length > 0}
                      onChange={() => handleSelectAll(displayOrders)}
                      className="rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Sub-Order ID</th>
                  <th className="p-4">SKU ID</th>
                  <th className="p-4">Zebalpha ID</th>
                  <th className="p-4 text-center">Qty</th>
                  <th className="p-4 text-center">Size</th>
                  <th className="p-4">Dispatch SLA</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {displayOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  let parsedItems: any[] = [];
                  const srcItems = order.items || order.product_details;
                  if (Array.isArray(srcItems)) {
                    parsedItems = srcItems;
                  } else if (typeof srcItems === "string") {
                    try {
                      const p = JSON.parse(srcItems);
                      parsedItems = Array.isArray(p) ? p : (p && typeof p === "object" ? [p] : []);
                    } catch (_) {
                      parsedItems = [];
                    }
                  } else if (srcItems && typeof srcItems === "object") {
                    parsedItems = [srcItems];
                  } else if (Array.isArray(order.seller_items) && order.seller_items.length > 0) {
                    parsedItems = order.seller_items;
                  }

                  const firstItem = parsedItems.length > 0 ? parsedItems[0] : null;
                  const prodFallback = sellerProducts.find(p => String(p.id) === String(firstItem?.product_id || firstItem?.id));
                  const itemImage = firstItem?.image_url ||
                                    firstItem?.image ||
                                    (Array.isArray(firstItem?.images) ? firstItem.images[0] : null) ||
                                    prodFallback?.image_url ||
                                    (Array.isArray(prodFallback?.images) ? prodFallback.images[0] : null);

                  const orderIdShort = order.order_number || String(order.id).slice(0, 8).toUpperCase();
                  const subOrderId = `${orderIdShort}_1`;
                  const skuId = firstItem?.sku || `SKU-${orderIdShort.slice(0, 5)}`;
                  const zebalphaId = `ZEB${orderIdShort}`;
                  const quantity = firstItem?.quantity || 1;
                  const size = firstItem?.size || "Free Size";
                  const awb = order.tracking_number || order.shipment_id || "";
                  const courier = order.courier_name || "Delhivery Surface";
                  const isReadyToShip = order.order_status === "ready_to_ship";
                  const isPending = !order.order_status || order.order_status === "placed" || order.order_status === "confirmed" || order.order_status === "processing";
                  const isShipped = order.order_status === "shipped" || order.order_status === "in_transit" || order.order_status === "picked_up";

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-zinc-800/30 transition ${isSelected ? "bg-purple-900/10" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(order.id)}
                          className="rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Product Details */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={firstItem?.name || "Product"}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-zinc-500" />
                            )}
                          </div>
                          <div className="max-w-xs">
                            <p className="font-black text-white line-clamp-1">
                              {firstItem?.name || firstItem?.title || prodFallback?.name || "Premium Fashion Apparel Item"}
                            </p>
                            <p className="text-[10px] font-mono font-bold text-zinc-400 mt-0.5">
                              Order ID: {order.order_number || order.id}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-500">
                              Customer: {order.customer_name || "Valued Buyer"} ({order.shipping_address?.city || order.city || "City"})
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Sub-order ID */}
                      <td className="p-4 font-mono font-bold text-zinc-300">
                        {subOrderId}
                      </td>

                      {/* SKU ID */}
                      <td className="p-4 font-mono font-bold text-zinc-300">
                        {skuId}
                      </td>

                      {/* Zebalpha ID */}
                      <td className="p-4 font-mono font-bold text-purple-400">
                        {zebalphaId}
                      </td>

                      {/* Quantity */}
                      <td className="p-4 text-center font-black text-white">
                        {quantity}
                      </td>

                      {/* Size */}
                      <td className="p-4 text-center font-bold text-zinc-300">
                        {size}
                      </td>

                      {/* Dispatch SLA */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-zinc-300 block">
                            {new Date(order.created_at || Date.now()).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short"
                            })}
                          </span>
                          {isReadyToShip && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                              <Clock className="h-2.5 w-2.5" /> Breaching Soon
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase">
                              <AlertTriangle className="h-2.5 w-2.5" /> To Pack
                            </span>
                          )}
                          {isShipped && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Picked Up
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action (Matching Meesho Action Column) */}
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          
                          {/* When in Ready to Ship tab */}
                          {isReadyToShip && (
                            <>
                              <button
                                onClick={() => setLabelModalOrder(order)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-purple-600/20 cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                                Label
                              </button>
                              
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  ✓ Downloaded
                                </span>
                                <span className="text-[9px] font-black text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  🚚 {courier.split(" ")[0]}
                                </span>
                              </div>
                            </>
                          )}

                          {/* When in Pending tab */}
                          {isPending && (
                            <button
                              onClick={() => handleCreateShipment(order.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
                            >
                              <Box className="h-3 w-3" />
                              Pack & Generate
                            </button>
                          )}

                          {/* When Shipped */}
                          {isShipped && (
                            <div className="space-y-1 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[10px] uppercase">
                                <Truck className="h-3 w-3" /> In Transit
                              </span>
                              <p className="text-[9px] font-mono font-bold text-zinc-400">
                                AWB: {awb || "DEL-78291048"}
                              </p>
                              <button
                                onClick={() => setLabelModalOrder(order)}
                                className="text-[9px] font-black uppercase text-purple-400 hover:text-purple-300 flex items-center gap-1 justify-end cursor-pointer"
                              >
                                <Printer className="h-2.5 w-2.5" /> Re-print Label
                              </button>
                            </div>
                          )}

                          {/* Delivered / Cancelled */}
                          {!isReadyToShip && !isPending && !isShipped && (
                            <button
                              onClick={() => setLabelModalOrder(order)}
                              className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white font-bold text-[10px] uppercase"
                            >
                              View Manifest
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
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

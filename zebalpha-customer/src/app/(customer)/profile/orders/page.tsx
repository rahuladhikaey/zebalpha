"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Order {
  id: string;
  order_number?: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  product_details: string; // JSON string or object
  items?: any;
  address?: string;
  phone?: string;
  tracking_number?: string;
  courier_name?: string;
  shipping_address?: any;
  // Return & Cancellation fields
  cancellation_reason?: string;
  cancellation_comment?: string;
  cancelled_at?: string;
  return_status?: string;
  return_type?: string;
  return_reason?: string;
  return_sub_reason?: string;
  return_description?: string;
  return_images?: any;
  return_items?: any;
  return_bank_details?: any;
  return_requested_at?: string;
  return_approved_at?: string;
  return_rejected_at?: string;
  return_rejection_reason?: string;
  return_picked_up_at?: string;
  return_completed_at?: string;
  return_tracking_number?: string;
  return_courier_name?: string;
  refund_status?: string;
  refund_amount?: number;
  refund_transaction_id?: string;
  delivered_at?: string;
}

// Cancellation Reasons (Meesho/Flipkart Standard)
const CANCELLATION_REASONS = [
  "Incorrect size/color ordered",
  "Expected delivery date is too long",
  "Ordered by mistake",
  "Need to change delivery address or phone number",
  "Found better price / discount elsewhere",
  "Want to change payment method",
  "Other reason"
];

// Return Reasons & Sub-Reasons (Meesho/Flipkart Standard)
const RETURN_REASONS: Record<string, string[]> = {
  "Defective / Damaged product": [
    "Product is damaged / broken",
    "Fabric is torn or stitched improperly",
    "Stains or discoloration on product",
    "Zipper / buttons / accessories broken"
  ],
  "Quality / Material issue": [
    "Material / fabric quality not as expected",
    "Color faded or looks dull",
    "Fabric feels uncomfortable or rough",
    "Poor printing or graphic peel"
  ],
  "Wrong product received": [
    "Received completely different product",
    "Received wrong color or design",
    "Received incorrect brand or style"
  ],
  "Size / Fit issue": [
    "Size too small / tight fit",
    "Size too large / loose fit",
    "Length is too short / too long",
    "Sleeves or shoulders do not fit properly"
  ],
  "Item missing from package": [
    "Main product missing from box",
    "Accessories or tags missing",
    "Combo item missing"
  ],
  "Product differs from description": [
    "Looks different from website photos",
    "Specifications / dimensions incorrect",
    "Misleading product description"
  ]
};

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelComment, setCancelComment] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Return & Exchange Modal State
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [returnType, setReturnType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<any[]>([]);
  const [returnReasonCategory, setReturnReasonCategory] = useState(Object.keys(RETURN_REASONS)[0]);
  const [returnSubReason, setReturnSubReason] = useState(RETURN_REASONS[Object.keys(RETURN_REASONS)[0]][0]);
  const [returnDescription, setReturnDescription] = useState("");
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refundMode, setRefundMode] = useState<"ORIGINAL_SOURCE" | "UPI" | "BANK_TRANSFER">("UPI");
  const [upiId, setUpiId] = useState("");
  const [exchangeSize, setExchangeSize] = useState("M");
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Return Tracking Details Modal
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const userEmail = (user?.email || "").trim().toLowerCase();

      let query = supabase.from("orders").select("*");

      if (user?.id && userEmail) {
        query = query.or(`user_id.eq.${user.id},customer_email.ilike.${userEmail},email.ilike.${userEmail}`);
      } else if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      let rawOrders: Order[] = [];
      if (error) {
        const { data: fallbackData } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false });

        rawOrders = (fallbackData as Order[]) || [];
      } else {
        rawOrders = (data as Order[]) || [];
      }

      // Deduplicate orders
      const baseOrdersMap = new Map<string, any>();

      for (const ord of rawOrders) {
        const ordNum = String(ord.order_number || ord.id || "");
        const isSub = (ord as any).is_sub_order === true ||
                      Boolean((ord as any).parent_order_id && (ord as any).parent_order_id !== ord.id) ||
                      /(-S\d+$)|^SO-/i.test(ordNum);

        const rootKey = (ord as any).razorpay_order_id || ordNum.replace(/-S\d+$/i, "") || ord.id;

        if (!baseOrdersMap.has(rootKey)) {
          baseOrdersMap.set(rootKey, ord);
        } else {
          const existing = baseOrdersMap.get(rootKey);
          const existingIsSub = (existing as any).is_sub_order === true ||
                                Boolean((existing as any).parent_order_id && (existing as any).parent_order_id !== existing.id) ||
                                /(-S\d+$)|^SO-/i.test(String(existing.order_number || ""));
          if (existingIsSub && !isSub) {
            baseOrdersMap.set(rootKey, ord);
          }
        }
      }

      const finalOrders = Array.from(baseOrdersMap.values()).filter((ord: any) => {
        if (ord.is_sub_order === true) return false;
        return true;
      });

      setOrders(finalOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders();
    } else if (!authLoading && !user) {
      setLoadingOrders(false);
    }
  }, [user, authLoading]);

  // Handle Cancel Order Submission
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: cancelModalOrder.id,
          order_number: cancelModalOrder.order_number,
          reason: cancelReason,
          comment: cancelComment,
          cancelled_by: "customer"
        })
      });

      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: "success",
          text: json.message || "✓ Order cancelled successfully!"
        });
        setCancelModalOrder(null);
        setCancelComment("");
        await fetchOrders();
      } else {
        setActionNotice({
          type: "error",
          text: json.message || "Failed to cancel order."
        });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", text: err.message || "An error occurred while cancelling order." });
    } finally {
      setCancelling(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Handle Return Proof Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch("/api/upload/return-proof", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64Data,
              fileName: file.name,
              mimeType: file.type
            })
          });
          const json = await res.json();
          if (json.success && json.url) {
            setReturnImages(prev => [...prev, json.url].slice(0, 3));
          } else {
            setReturnImages(prev => [...prev, base64Data].slice(0, 3));
          }
        } catch (uploadErr) {
          setReturnImages(prev => [...prev, base64Data].slice(0, 3));
        } finally {
          setUploadingImage(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadingImage(false);
    }
  };

  // Handle Return / Exchange Submission
  const handleConfirmReturn = async () => {
    if (!returnModalOrder) return;
    if (!agreePolicy) {
      alert("Please confirm the return conditions checkbox before submitting.");
      return;
    }

    const isCod = String(returnModalOrder.payment_method || "").toUpperCase() === "COD";
    const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

    if (returnType === "RETURN" && isCod) {
      if (!upiId.trim()) {
        alert("Please enter a valid UPI ID (e.g. yourname@okaxis, 9876543210@paytm) to receive your COD refund.");
        return;
      }
      if (!upiPattern.test(upiId.trim())) {
        alert("Please enter a valid UPI format (e.g. 9876543210@paytm or user@okaxis).");
        return;
      }
    }

    setSubmittingReturn(true);
    try {
      const exchangeDetailsPayload = returnType === "EXCHANGE" ? {
        preferred_size: exchangeSize,
        notes: returnDescription
      } : null;

      const res = await fetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: returnModalOrder.id,
          order_number: returnModalOrder.order_number,
          return_type: returnType,
          items: selectedItemsToReturn.length > 0 ? selectedItemsToReturn : undefined,
          reason: returnReasonCategory,
          sub_reason: returnSubReason,
          description: returnDescription,
          images: returnImages,
          refund_mode: isCod ? "UPI" : "ORIGINAL_SOURCE",
          upi_id: isCod ? upiId.trim() : null,
          exchange_details: exchangeDetailsPayload,
        })
      });

      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: "success",
          text: json.message || "✓ Return request submitted successfully!"
        });
        setReturnModalOrder(null);
        setReturnImages([]);
        setReturnDescription("");
        setUpiId("");
        setAgreePolicy(false);
        await fetchOrders();
      } else {
        setActionNotice({
          type: "error",
          text: json.message || "Failed to submit return request."
        });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", text: err.message || "An error occurred while submitting return." });
    } finally {
      setSubmittingReturn(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Check if order is eligible for cancellation (Only within 2 hours of order placement & unfulfilled status)
  const getCancellationInfo = (order: Order | null) => {
    if (!order) return { eligible: false, remainingMins: 0, reason: "" };
    const status = String(order.order_status || "").toLowerCase();
    const cancellableStatuses = ["placed", "confirmed", "processing", "ready_to_ship", "pending"];

    if (!cancellableStatuses.includes(status)) {
      return { eligible: false, remainingMins: 0, reason: "Order cannot be cancelled in its current status." };
    }

    if (!order.created_at) {
      return { eligible: true, remainingMins: 120, reason: "" };
    }

    const orderTime = new Date(order.created_at).getTime();
    const elapsedMinutes = Math.floor((Date.now() - orderTime) / (1000 * 60));
    const remainingMins = 120 - elapsedMinutes;

    if (remainingMins <= 0) {
      return {
        eligible: false,
        remainingMins: 0,
        reason: "Cancellation window closed (>2 hours since placed)."
      };
    }

    return {
      eligible: true,
      remainingMins,
      reason: ""
    };
  };

  // Check if order is eligible for cancellation
  const isCancellable = (order: Order) => {
    return getCancellationInfo(order).eligible;
  };

  // Check if order is eligible for return
  const isReturnable = (order: Order) => {
    const status = String(order.order_status || "").toLowerCase();
    const retStatus = String(order.return_status || "").toLowerCase();
    if (retStatus && retStatus !== "none") return false;
    return status === "delivered";
  };

  // Check if order has active return
  const hasActiveReturn = (order: Order) => {
    const status = String(order.order_status || "").toLowerCase();
    const retStatus = String(order.return_status || "").toLowerCase();
    return retStatus && retStatus !== "none" || status.startsWith("return");
  };

  if (authLoading || (loadingOrders && user)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Orders...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <div className="max-w-md w-full rounded-[2.5rem] bg-zinc-950 p-10 border border-zinc-800 shadow-2xl">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-3xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-white">Please Sign In</h1>
          <p className="mt-3 text-zinc-400 font-medium">You need to be logged in to view your order history, manage returns & cancellations.</p>
          <Link href="/login" className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition hover:bg-zinc-200">
            Login Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <Header title="My Orders" subtitle="Track orders, returns & cancellations" />

      {/* Global Notification Banner */}
      {actionNotice && (
        <div className={`fixed top-20 right-4 left-4 md:left-auto md:w-96 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200 ${
          actionNotice.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200" 
            : "bg-red-950/90 border-red-500/50 text-red-200"
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span className="text-base">{actionNotice.type === "success" ? "✓" : "⚠️"}</span>
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-xs opacity-70 hover:opacity-100 font-bold p-1">✕</button>
        </div>
      )}

      <section className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Purchases & Returns</span>
            <h1 className="mt-2 text-4xl font-black text-white">Your Orders</h1>
          </div>
          <Link href="/products" className="text-xs font-black uppercase tracking-widest text-white hover:text-zinc-300 transition-colors">
            + Shop More
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[2.5rem] bg-zinc-950 p-16 text-center border border-zinc-800 shadow-2xl">
            <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-4xl mb-6">📦</div>
            <h2 className="text-xl font-black text-white">No orders yet</h2>
            <p className="mt-2 text-zinc-400 font-medium max-w-xs mx-auto">Explore exclusive drops and place your first order today!</p>
            <Link href="/products" className="mt-10 inline-flex items-center justify-center rounded-2xl bg-white px-10 py-4 text-xs font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition hover:bg-zinc-200 active:scale-95">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
              let items: any[] = [];
              try {
                const raw = (order as any).items || order.product_details;
                if (Array.isArray(raw)) {
                  items = raw;
                } else if (typeof raw === "string") {
                  const parsed = JSON.parse(raw);
                  items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
                } else if (raw && typeof raw === "object") {
                  items = [raw];
                }
              } catch (e) {
                console.error("Failed to parse items:", e);
              }

              const statusLower = String(order.order_status || "").toLowerCase();
              const isCancelled = statusLower === "cancelled";
              const isDelivered = statusLower === "delivered";
              const hasReturn = hasActiveReturn(order);

              return (
                <div key={order.id} className="group relative overflow-hidden rounded-[2.5rem] bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl transition-all hover:border-zinc-700">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-full bg-zinc-900 border border-zinc-800 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                          {order.order_number || `#${String(order.id).slice(0, 8).toUpperCase()}`}
                        </span>

                        {isCancelled ? (
                          <span className="rounded-full bg-red-950/80 border border-red-500/50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-300 flex items-center gap-1.5">
                            <span>🚫</span> CANCELLED
                          </span>
                        ) : hasReturn ? (
                          <span className="rounded-full bg-amber-950/80 border border-amber-500/50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                            <span>🔄</span> {String(order.order_status).replace(/_/g, " ").toUpperCase()}
                          </span>
                        ) : isDelivered ? (
                          <span className="rounded-full bg-emerald-950/80 border border-emerald-500/50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                            <span>✓</span> DELIVERED
                          </span>
                        ) : (
                          <span className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border ${
                            statusLower === "pending" || statusLower === "placed" ? "bg-zinc-900 border-zinc-700 text-zinc-300" :
                            statusLower === "shipped" || statusLower === "in_transit" ? "bg-purple-950/80 border-purple-500/50 text-purple-300" :
                            "bg-white text-black border-white"
                          }`}>
                            {String(order.order_status || "PLACED").replace(/_/g, " ").toUpperCase()}
                          </span>
                        )}

                        {order.refund_status && order.refund_status !== "NONE" && (
                          <span className="rounded-full bg-blue-950/60 border border-blue-500/40 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-blue-300">
                            💰 REFUND: {order.refund_status}
                          </span>
                        )}
                      </div>

                      {/* Products in this order */}
                      {items.length === 0 ? (
                        <div className="flex items-center gap-4 p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                          <div className="h-14 w-14 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                            📦
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm">Ordered Items</p>
                            <p className="text-xs text-zinc-400">Order #{order.order_number || String(order.id).slice(0, 8)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {items.map((item: any, idx: number) => {
                            const prodId = item.product_id || item.id;
                            const targetUrl = prodId ? `/products/${prodId}` : "#";
                            const itemImg = item.image_url ||
                                            item.image ||
                                            (Array.isArray(item.images) && item.images[0]) ||
                                            (item.product && (item.product.image_url || item.product.image || item.product.images?.[0])) ||
                                            "";

                            return (
                              <div key={idx} className="flex flex-col gap-3 p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 transition">
                                <div className="flex items-center gap-3.5">
                                  {/* Product Thumbnail */}
                                  <Link
                                    href={targetUrl}
                                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 relative flex items-center justify-center group/thumb hover:border-zinc-500 transition-colors"
                                  >
                                    {itemImg ? (
                                      <img
                                        src={itemImg}
                                        alt={item.name || "Product"}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                        onError={(e) => {
                                          const el = e.target as HTMLElement;
                                          el.style.display = "none";
                                          if (el.parentElement) {
                                            el.parentElement.innerHTML = '<span class="text-2xl">🛍️</span>';
                                          }
                                        }}
                                      />
                                    ) : (
                                      <span className="text-2xl">🛍️</span>
                                    )}
                                  </Link>

                                  {/* Product Info */}
                                  <div className="flex-1 min-w-0">
                                    <Link href={targetUrl} className="group/link block">
                                      <h4 className="font-bold text-white text-sm sm:text-base leading-tight group-hover/link:text-zinc-300 transition-colors line-clamp-2">
                                        {item.name || "Ordered Product"}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-black text-white">₹{item.price || item.subtotal || 0}</span>
                                        <span className="text-xs text-zinc-400 font-semibold">• Qty: {item.quantity || 1}</span>
                                        {item.size && (
                                          <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-300 font-bold">
                                            Size: {item.size}
                                          </span>
                                        )}
                                      </div>
                                    </Link>
                                  </div>
                                </div>

                                {/* Star Rating Widget for Delivered Products */}
                                {isDelivered && item.id && (
                                  <div className="pt-2 border-t border-zinc-800/60">
                                    <ProductRatingWidget
                                      productId={item.id}
                                      productName={item.name}
                                      user={user}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Cancelled Banner */}
                      {isCancelled && (
                        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-1">
                          <p className="font-black flex items-center gap-1.5">
                            <span>🚫 Order Cancelled</span>
                            {order.cancelled_at && <span className="text-zinc-400 font-normal">on {new Date(order.cancelled_at).toLocaleDateString()}</span>}
                          </p>
                          {order.cancellation_reason && (
                            <p className="text-zinc-300"><span className="text-zinc-400">Reason:</span> {order.cancellation_reason}</p>
                          )}
                          {order.refund_status === "INITIATED" && (
                            <p className="text-emerald-400 font-bold mt-1">✓ Refund of ₹{order.total_amount} has been initiated.</p>
                          )}
                        </div>
                      )}

                      {/* Return Status Banner */}
                      {hasReturn && (
                        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black flex items-center gap-1.5">
                              <span>🔄 {order.return_type === "EXCHANGE" ? "Exchange" : "Return"} Request Active</span>
                            </span>
                            <button
                              onClick={() => setTrackingModalOrder(order)}
                              className="text-[10px] font-black uppercase tracking-wider text-amber-300 underline cursor-pointer hover:text-white"
                            >
                              Track Return Status →
                            </button>
                          </div>
                          {order.return_reason && (
                            <p className="text-zinc-300"><span className="text-zinc-400">Reason:</span> {order.return_reason}</p>
                          )}
                          {order.return_rejection_reason && (
                            <p className="text-red-300"><span className="font-bold">Rejection Note:</span> {order.return_rejection_reason}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Total & Placed Date */}
                    <div className="flex flex-row md:flex-col justify-between items-center md:items-end border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-8 text-left md:text-right min-w-[150px]">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {String(order.payment_method || '').toUpperCase() === 'COD' ? 'Total (COD)' : 'Total Paid'}
                        </p>
                        <p className="text-2xl font-black text-white">₹{order.total_amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Placed On</p>
                        <p className="text-sm font-bold text-zinc-300">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar (Meesho/Flipkart Standard Buttons) */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Payment:</span>
                      <span className="text-xs font-black text-white">{order.payment_status} ({order.payment_method})</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Cancel Order Button (Meesho / Flipkart Standard - 2 Hour Window) */}
                      {isCancellable(order) ? (
                        <button
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReason(CANCELLATION_REASONS[0]);
                            setCancelComment("");
                          }}
                          className="text-[11px] font-black uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-500/30 hover:bg-red-900/60 hover:text-white px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 active:scale-95 shadow-lg"
                        >
                          <span>✕ Cancel Order</span>
                          <span className="text-[9px] bg-red-900/80 border border-red-500/40 px-1.5 py-0.5 rounded text-red-200 font-bold">
                            ⏱️ {getCancellationInfo(order).remainingMins}m left
                          </span>
                        </button>
                      ) : (
                        ["placed", "confirmed", "processing", "ready_to_ship", "pending"].includes(String(order.order_status || "").toLowerCase()) && (
                          <span className="text-[10px] text-zinc-500 font-semibold px-3 py-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-1.5 cursor-default">
                            <span>🔒 Cancel closed (&gt;2h)</span>
                          </span>
                        )
                      )}

                      {/* Return / Exchange Button (Meesho / Flipkart Standard) */}
                      {isReturnable(order) && (
                        <button
                          onClick={() => {
                            setReturnModalOrder(order);
                            setSelectedItemsToReturn(items);
                            setReturnType("RETURN");
                            setReturnReasonCategory(Object.keys(RETURN_REASONS)[0]);
                            setReturnSubReason(RETURN_REASONS[Object.keys(RETURN_REASONS)[0]][0]);
                            setReturnImages([]);
                            setReturnDescription("");
                            setAgreePolicy(false);
                          }}
                          className="text-[11px] font-black uppercase tracking-wider text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xl shadow-white/10"
                        >
                          🔄 Return / Exchange
                        </button>
                      )}

                      {/* Track Return Status Button */}
                      {hasReturn && (
                        <button
                          onClick={() => setTrackingModalOrder(order)}
                          className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/50 border border-amber-500/40 hover:bg-amber-900/60 px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          📍 Track Return Progress
                        </button>
                      )}

                      {/* View Details Collapse */}
                      <button
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        {expandedOrderId === order.id ? "Hide Details ↑" : "Delivery Details →"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Delivery Timeline */}
                  {expandedOrderId === order.id && (
                    <div className="mt-6 pt-6 border-t border-zinc-800 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Real-Time Process Manifest</span>
                          <h4 className="text-xs font-black text-white">Shipment Delivery Progress</h4>
                        </div>
                        {order.tracking_number && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                            <span>🚚 {order.courier_name || "Express Logistics"}</span>
                            <span className="text-zinc-500">•</span>
                            <span className="font-mono font-black text-white">AWB: {order.tracking_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Timeline Graphic */}
                      <div className="relative py-4 px-2">
                        <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[3px] bg-zinc-800 rounded">
                          <div
                            className="h-full bg-white rounded transition-all duration-1000"
                            style={{
                              width: isCancelled ? "0%" :
                                order.order_status === "DELIVERED" ? "100%" :
                                order.order_status === "SHIPPED" ? "66%" : "25%"
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
                          {/* Node 1: Confirmed */}
                          <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                            <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-black text-xs shadow-xl border-2 border-black shrink-0 z-20">
                              ✓
                            </div>
                            <div className="flex flex-col md:items-center">
                              <span className="text-xs font-black text-white">Order Placed</span>
                              <span className="text-[9px] font-bold text-zinc-400 mt-0.5">
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Node 2: Dispatched */}
                          <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-black shrink-0 z-20 transition-all ${
                              statusLower === "shipped" || statusLower === "delivered" ? "bg-white text-black shadow-xl" : "bg-zinc-800 text-zinc-500"
                            }`}>
                              {statusLower === "shipped" || statusLower === "delivered" ? "✓" : "2"}
                            </div>
                            <div className="flex flex-col md:items-center">
                              <span className={`text-xs font-black ${statusLower === "shipped" || statusLower === "delivered" ? "text-white" : "text-zinc-500"}`}>Packed & Dispatched</span>
                              <span className="text-[9px] font-bold text-zinc-400 mt-0.5">Merchant Hub</span>
                            </div>
                          </div>

                          {/* Node 3: Shipped in Transit */}
                          <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-black shrink-0 z-20 transition-all ${
                              statusLower === "shipped" || statusLower === "delivered" ? "bg-white text-black shadow-xl" : "bg-zinc-800 text-zinc-500"
                            }`}>
                              {statusLower === "shipped" || statusLower === "delivered" ? "✓" : "3"}
                            </div>
                            <div className="flex flex-col md:items-center">
                              <span className={`text-xs font-black ${statusLower === "shipped" || statusLower === "delivered" ? "text-white" : "text-zinc-500"}`}>In Transit</span>
                              <span className="text-[9px] font-bold text-zinc-400 mt-0.5">Courier Hub</span>
                            </div>
                          </div>

                          {/* Node 4: Delivered */}
                          <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-black shrink-0 z-20 transition-all ${
                              isDelivered ? "bg-white text-black shadow-xl" : "bg-zinc-800 text-zinc-500"
                            }`}>
                              {isDelivered ? "✓" : "4"}
                            </div>
                            <div className="flex flex-col md:items-center">
                              <span className={`text-xs font-black ${isDelivered ? "text-white" : "text-zinc-500"}`}>Delivered</span>
                              <span className="text-[9px] font-bold text-zinc-400 mt-0.5">
                                {isDelivered ? "Package Received" : "Pending Arrival"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recipient info */}
                      <div className="grid md:grid-cols-2 gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Recipient Address</p>
                          <p className="text-xs font-bold text-zinc-300 leading-relaxed">{order.address || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Contact Phone</p>
                          <p className="text-xs font-black text-white">{order.phone || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 1. CANCEL ORDER MODAL (MEESHO / FLIPKART STYLE)           */}
      {/* ========================================================= */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-lg w-full rounded-[2.5rem] bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 text-lg">
                  🚫
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Cancel Order</h3>
                  <p className="text-xs text-zinc-400">Order #{cancelModalOrder.order_number || cancelModalOrder.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 2-Hour Policy Banner */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
              <span className="text-xl">⏱️</span>
              <div className="text-xs space-y-0.5">
                <p className="font-black text-white">2-Hour Cancellation Window</p>
                <p className="text-[11px] text-zinc-400">
                  Orders can only be cancelled within 2 hours of placement ({getCancellationInfo(cancelModalOrder).remainingMins}m remaining). Once confirmed, items will not be dispatched.
                </p>
              </div>
            </div>

            {/* Refund info notice */}
            <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
              String(cancelModalOrder.payment_method || "").toUpperCase() === "COD"
                ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                : "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
            }`}>
              <div className="flex items-center gap-2 font-black">
                <span>{String(cancelModalOrder.payment_method || "").toUpperCase() === "COD" ? "ℹ️ Cash On Delivery Order" : "💰 Prepaid Online Order"}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {String(cancelModalOrder.payment_method || "").toUpperCase() === "COD"
                  ? "No cancellation fee is charged. The order will be cancelled instantly and not dispatched."
                  : `A full refund of ₹${cancelModalOrder.total_amount} will be automatically initiated to your original payment method (3-5 business days).`}
              </p>
            </div>

            {/* Reason selector */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                Select Cancellation Reason <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {CANCELLATION_REASONS.map((r, i) => (
                  <label
                    key={i}
                    onClick={() => setCancelReason(r)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      cancelReason === r 
                        ? "bg-white text-black border-white font-black" 
                        : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 font-medium"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={cancelReason === r}
                      onChange={() => setCancelReason(r)}
                      className="accent-black h-4 w-4"
                    />
                    <span className="text-xs">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Comment input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                Additional Comments (Optional)
              </label>
              <textarea
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
                placeholder="Tell us what went wrong..."
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-white transition resize-none font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-xl shadow-red-600/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. RETURN / EXCHANGE MODAL (MEESHO / FLIPKART STYLE)      */}
      {/* ========================================================= */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-xl w-full rounded-[2.5rem] bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white text-black flex items-center justify-center text-lg font-black">
                  🔄
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Return or Exchange</h3>
                  <p className="text-xs text-zinc-400">Order #{returnModalOrder.order_number || returnModalOrder.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setReturnModalOrder(null)}
                className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resolution Type Tabs (Refund vs Exchange) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setReturnType("RETURN")}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                  returnType === "RETURN"
                    ? "bg-white text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>💰 Refund (Money Back)</span>
              </button>
              <button
                type="button"
                onClick={() => setReturnType("EXCHANGE")}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                  returnType === "EXCHANGE"
                    ? "bg-white text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🔁 Size / Color Exchange</span>
              </button>
            </div>

            {/* Exchange Options if Exchange selected */}
            {returnType === "EXCHANGE" && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                  Select Requested Replacement Size:
                </label>
                <div className="flex flex-wrap gap-2">
                  {["XS", "S", "M", "L", "XL", "XXL", "Free Size"].map((sz) => (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => setExchangeSize(sz)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        exchangeSize === sz
                          ? "bg-white text-black"
                          : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Category Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                Primary Reason <span className="text-red-400">*</span>
              </label>
              <select
                value={returnReasonCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setReturnReasonCategory(val);
                  setReturnSubReason(RETURN_REASONS[val]?.[0] || "");
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-bold outline-none focus:border-white transition cursor-pointer"
              >
                {Object.keys(RETURN_REASONS).map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-950 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Reason Selection */}
            {RETURN_REASONS[returnReasonCategory] && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                  Detailed Issue
                </label>
                <div className="space-y-1.5">
                  {RETURN_REASONS[returnReasonCategory].map((sub, idx) => (
                    <label
                      key={idx}
                      onClick={() => setReturnSubReason(sub)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-xs ${
                        returnSubReason === sub
                          ? "bg-zinc-800 border-zinc-600 text-white font-bold"
                          : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="return_sub_reason"
                        checked={returnSubReason === sub}
                        onChange={() => setReturnSubReason(sub)}
                        className="accent-white h-3.5 w-3.5"
                      />
                      <span>{sub}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Photo Proofs (Flipkart / Meesho Style) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                  Attach Photo Proofs (Max 3) <span className="text-zinc-500 font-normal">(Product, tags, box)</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-bold">{returnImages.length}/3 photos</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {returnImages.map((imgUrl, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden group">
                    <img src={imgUrl} alt="Proof" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReturnImages(returnImages.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {returnImages.length < 3 && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="h-20 w-20 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer text-xs"
                    >
                      {uploadingImage ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <span className="text-lg">📷</span>
                          <span className="text-[9px] font-black uppercase">+ Upload</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Refund Section for Return */}
            {returnType === "RETURN" && (
              String(returnModalOrder.payment_method || "").toUpperCase() === "COD" ? (
                /* COD Pure UPI ID Input */
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        <span>⚡ Instant UPI Refund (COD)</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Where should we send your ₹{returnModalOrder.total_amount} refund?
                      </p>
                    </div>
                    {/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim()) && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                        ✓ Format Valid
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 9876543210@paytm or yourname@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value.trim())}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-white font-bold tracking-wide"
                      />
                    </div>

                    {/* Quick UPI Handle suggestions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Quick Add:</span>
                      {["@okhdfcbank", "@okaxis", "@paytm", "@ybl", "@ibl"].map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const base = upiId.includes("@") ? upiId.split("@")[0] : upiId;
                            setUpiId((base ? base : "") + handle);
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 transition cursor-pointer"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
                      🔒 Your UPI ID is encrypted and will only be used to process your refund once the return is received.
                    </p>
                  </div>
                </div>
              ) : (
                /* Prepaid Automated Source Refund Banner */
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-black">
                    <span>✓ 100% Automated Source Refund</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                    This order was paid online. Your refund of <strong className="text-white font-black">₹{returnModalOrder.total_amount}</strong> will be automatically credited back to your original payment method (Bank / Card / UPI via Razorpay) within 3-5 business days of return verification.
                  </p>
                </div>
              )
            )}

            {/* Description Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                Describe the problem in detail
              </label>
              <textarea
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                placeholder="Explain the issue with the item..."
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-white transition resize-none font-medium"
              />
            </div>

            {/* Policy Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePolicy}
                onChange={(e) => setAgreePolicy(e.target.checked)}
                className="mt-0.5 accent-white h-4 w-4"
              />
              <span className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                I confirm that the product is in original condition, unwashed, unused, with tags intact, and kept in original brand packaging.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={submittingReturn || !agreePolicy}
                className="flex-1 py-3.5 rounded-2xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider shadow-xl shadow-white/10 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReturn ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. RETURN STATUS & TRACKER MODAL                          */}
      {/* ========================================================= */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-lg w-full rounded-[2.5rem] bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg font-black">
                  🔄
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {trackingModalOrder.return_type === "EXCHANGE" ? "Exchange Status" : "Return & Refund Status"}
                  </h3>
                  <p className="text-xs text-zinc-400">Order #{trackingModalOrder.order_number || trackingModalOrder.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Manifest */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">
                Reverse Logistics & Refund Journey
              </span>

              {/* Step 1: Return Requested */}
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="h-8 w-8 rounded-full bg-emerald-500 text-black font-black text-xs flex items-center justify-center shrink-0">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-black text-white">Return Request Registered</h5>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Reason: {trackingModalOrder.return_reason || "Customer return"}
                  </p>
                  {trackingModalOrder.return_requested_at && (
                    <span className="text-[9px] text-zinc-500 font-bold block mt-1">
                      {new Date(trackingModalOrder.return_requested_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2: Merchant Approval */}
              {(() => {
                const retSt = String(trackingModalOrder.return_status || trackingModalOrder.order_status || "").toLowerCase();
                const isApproved = ["approved", "return_approved", "picked_up", "return_picked_up", "completed", "returned"].includes(retSt);
                const isRejected = ["rejected", "return_rejected"].includes(retSt);

                return (
                  <div className={`flex items-start gap-4 p-3 rounded-2xl border ${
                    isRejected 
                      ? "bg-red-950/40 border-red-500/30" 
                      : isApproved 
                      ? "bg-zinc-900 border-zinc-800" 
                      : "bg-zinc-900/40 border-zinc-800/40 opacity-70"
                  }`}>
                    <div className={`h-8 w-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                      isRejected 
                        ? "bg-red-500 text-white" 
                        : isApproved 
                        ? "bg-emerald-500 text-black" 
                        : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {isRejected ? "✕" : isApproved ? "✓" : "2"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className={`text-xs font-black ${isRejected ? "text-red-300" : isApproved ? "text-white" : "text-zinc-500"}`}>
                        {isRejected ? "Return Request Rejected" : "Merchant Return Approval"}
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {isRejected
                          ? trackingModalOrder.return_rejection_reason || "Return request did not meet return policy criteria."
                          : isApproved
                          ? "Merchant reviewed & scheduled reverse courier pickup."
                          : "Merchant is reviewing your request."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Reverse Pickup Handover */}
              {(() => {
                const retSt = String(trackingModalOrder.return_status || trackingModalOrder.order_status || "").toLowerCase();
                const isPickedUp = ["picked_up", "return_picked_up", "completed", "returned"].includes(retSt);

                return (
                  <div className={`flex items-start gap-4 p-3 rounded-2xl border ${
                    isPickedUp ? "bg-zinc-900 border-zinc-800" : "bg-zinc-900/40 border-zinc-800/40 opacity-70"
                  }`}>
                    <div className={`h-8 w-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                      isPickedUp ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {isPickedUp ? "✓" : "3"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className={`text-xs font-black ${isPickedUp ? "text-white" : "text-zinc-500"}`}>
                        Courier Reverse Pickup
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {trackingModalOrder.return_tracking_number
                          ? `Courier AWB: ${trackingModalOrder.return_tracking_number} (${trackingModalOrder.return_courier_name || "Delhivery Express"})`
                          : "Courier agent will pick up from your delivery address."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Quality Check & Refund/Replacement Complete */}
              {(() => {
                const retSt = String(trackingModalOrder.return_status || trackingModalOrder.order_status || "").toLowerCase();
                const isCompleted = ["completed", "returned"].includes(retSt) || trackingModalOrder.refund_status === "COMPLETED";

                return (
                  <div className={`flex items-start gap-4 p-3 rounded-2xl border ${
                    isCompleted ? "bg-emerald-950/40 border-emerald-500/40" : "bg-zinc-900/40 border-zinc-800/40 opacity-70"
                  }`}>
                    <div className={`h-8 w-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                      isCompleted ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {isCompleted ? "✓" : "4"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className={`text-xs font-black ${isCompleted ? "text-emerald-300" : "text-zinc-500"}`}>
                        {trackingModalOrder.return_type === "EXCHANGE" ? "Replacement Dispatched" : "Refund Credited"}
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {isCompleted
                          ? `₹${trackingModalOrder.total_amount} refund successfully completed (Txn: ${trackingModalOrder.refund_transaction_id || "PROCESSED"})`
                          : "Once received and quality checked, refund / exchange is issued immediately."}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => setTrackingModalOrder(null)}
              className="w-full py-3.5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ProductRatingWidget({ productId, productName, user }: { productId: number; productName: string; user: any }) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedReview, setSavedReview] = useState<any>(null);

  // Load existing rating if any
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("asali_swad_reviews");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const existing = parsed.find(
            (r: any) => Number(r.product_id) === Number(productId) && r.user_email === user.email
          );
          if (existing) {
            setSavedReview(existing);
            setRating(existing.rating);
            setComment(existing.comment);
            setSubmitted(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [productId, user.email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    const newReview = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: Number(productId),
      user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
      user_email: user.email,
      rating,
      comment: comment || "Excellent product!",
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("asali_swad_reviews");
      let list = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
      list = list.filter((r: any) => !(Number(r.product_id) === Number(productId) && r.user_email === user.email));
      list.push(newReview);
      localStorage.setItem("asali_swad_reviews", JSON.stringify(list));
    }

    setSavedReview(newReview);
    setSubmitted(true);
  };

  if (submitted && savedReview) {
    return (
      <div className="mt-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span>You rated:</span>
          <div className="flex items-center gap-0.5 text-white">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-sm">{i < savedReview.rating ? "★" : "☆"}</span>
            ))}
          </div>
        </div>
        {savedReview.comment && (
          <p className="text-zinc-300 italic">"{savedReview.comment}"</p>
        )}
        <button
          onClick={() => setSubmitted(false)}
          className="text-[9px] font-black uppercase tracking-wider text-white underline pt-1 cursor-pointer"
        >
          Edit Review
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Rate Product:</span>
        <div className="flex items-center gap-1 text-base text-white">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              className="hover:scale-125 transition-transform text-lg cursor-pointer"
            >
              {star <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      {rating > 0 && (
        <div className="space-y-2">
          <input
            type="text"
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a quick review..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-1.5 text-xs font-semibold placeholder:text-zinc-500 outline-none focus:border-white"
          />
          <button
            type="submit"
            className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest text-[9px] py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Submit Review
          </button>
        </div>
      )}
    </form>
  );
}

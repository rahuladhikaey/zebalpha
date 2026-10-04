"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Download,
  RotateCcw,
  XCircle,
  HelpCircle,
  ShoppingBag,
  MapPin,
  CreditCard,
  Building2,
  ExternalLink,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  Upload,
  RefreshCw
} from "lucide-react";

interface OrderItem {
  id?: string;
  product_id?: string;
  name?: string;
  title?: string;
  price?: number;
  mrp?: number;
  quantity?: number;
  units?: number;
  seller_id?: string;
  seller_name?: string;
  image_url?: string;
  image?: string;
  images?: string[];
  package_name?: string;
  variant?: any;
  subtotal?: number;
}

interface OrderDetail {
  id: string;
  order_number?: string;
  user_id?: string;
  customer_name?: string;
  phone?: string;
  address?: any;
  shipping_address?: any;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  order_status?: string;
  items?: OrderItem[];
  product_details?: any;
  seller_id?: string;
  seller_name?: string;
  tracking_number?: string;
  courier_name?: string;
  estimated_delivery?: string;
  created_at: string;
  updated_at?: string;
  delivered_at?: string;
  // Cancellation fields
  cancellation_reason?: string;
  cancellation_comment?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  // Return fields
  return_status?: string;
  return_type?: string;
  return_reason?: string;
  return_sub_reason?: string;
  return_description?: string;
  return_requested_at?: string;
  return_approved_at?: string;
  return_picked_up_at?: string;
  return_completed_at?: string;
  refund_status?: string;
  refund_amount?: number;
  refund_mode?: string;
  upi_id?: string;
  refund_transaction_id?: string;
  refund_initiated_at?: string;
}

// Standard Cancellation Reasons
const CANCELLATION_REASONS = [
  "Changed my mind",
  "Need to change delivery address",
  "Need to change phone number",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery taking too long",
  "Other"
];

// Standard Return Reasons & Sub-Reasons
const RETURN_REASONS: Record<string, string[]> = {
  "Product damaged / defective": [
    "Product arrived broken or cracked",
    "Stitching or fabric torn",
    "Zipper, button, or accessory damaged"
  ],
  "Wrong product received": [
    "Received completely different item",
    "Received wrong size or color",
    "Incorrect item model"
  ],
  "Quality / Material issue": [
    "Fabric quality not as expected",
    "Color faded or washed out",
    "Graphic print peeling off"
  ],
  "Size / Fit issue": [
    "Size is too tight / small",
    "Size is too loose / large",
    "Length mismatch"
  ],
  "Product differs from description": [
    "Looks different from website photos",
    "Misleading product description"
  ],
  "Other": ["Other reason"]
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const rawOrderId = params?.orderId as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelComment, setCancelComment] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [returnReasonCategory, setReturnReasonCategory] = useState(Object.keys(RETURN_REASONS)[0]);
  const [returnSubReason, setReturnSubReason] = useState(RETURN_REASONS[Object.keys(RETURN_REASONS)[0]][0]);
  const [returnDescription, setReturnDescription] = useState("");
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [upiId, setUpiId] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Edit Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState({
    name: "",
    phone: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: ""
  });
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Tracking Modal State
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  // Printable Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // 1-Hour Cancellation Timer State
  const [cancelTimeRemaining, setCancelTimeRemaining] = useState<number | null>(null);

  // Fetch Order Details
  const fetchOrderDetails = async () => {
    if (!rawOrderId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawOrderId);
      let query = supabase.from("orders").select("*");
      if (isUuid) {
        query = query.eq("id", rawOrderId);
      } else {
        query = query.eq("order_number", rawOrderId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        // Fallback search by order_number ilike
        const { data: fallbackData } = await supabase
          .from("orders")
          .select("*")
          .ilike("order_number", `%${rawOrderId}%`)
          .limit(1)
          .maybeSingle();

        if (fallbackData) {
          setOrder(normalizeOrder(fallbackData));
        } else {
          setErrorMsg("Order not found or you do not have permission to view it.");
        }
      } else {
        setOrder(normalizeOrder(data));
      }

      // Also try fetching seller split orders for multi-seller architecture
      if (data?.id) {
        const { data: sOrders } = await supabase
          .from("seller_orders")
          .select("*, order_items(*)")
          .eq("parent_order_id", data.id);
        if (sOrders && sOrders.length > 0) {
          setSellerOrders(sOrders);
        }
      }
    } catch (err: any) {
      console.error("Order fetch error:", err);
      setErrorMsg("Failed to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrderDetails();
    }
  }, [rawOrderId, user, authLoading]);

  // Normalize order items and JSON fields
  const normalizeOrder = (raw: any): OrderDetail => {
    let parsedItems: OrderItem[] = [];
    if (Array.isArray(raw.items)) {
      parsedItems = raw.items;
    } else if (Array.isArray(raw.product_details)) {
      parsedItems = raw.product_details;
    } else if (typeof raw.items === "string") {
      try { parsedItems = JSON.parse(raw.items); } catch (_) {}
    } else if (typeof raw.product_details === "string") {
      try { parsedItems = JSON.parse(raw.product_details); } catch (_) {}
    }

    return {
      ...raw,
      items: parsedItems
    };
  };

  // 1-Hour Cancellation Window Live Timer
  useEffect(() => {
    if (!order?.created_at) return;

    const calculateTimeLeft = () => {
      const createdMs = new Date(order.created_at).getTime();
      const elapsedMs = Date.now() - createdMs;
      const oneHourMs = 60 * 60 * 1000;
      const remainingMs = oneHourMs - elapsedMs;

      if (remainingMs > 0) {
        setCancelTimeRemaining(Math.floor(remainingMs / 1000));
      } else {
        setCancelTimeRemaining(0);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [order?.created_at]);

  // Format cancellation time string (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  // Check Cancellation Eligibility
  const isEligibleForCancellation = useMemo(() => {
    if (!order) return false;
    const status = (order.order_status || "").toLowerCase();
    if (["cancelled", "shipped", "out_for_delivery", "delivered", "rto", "return_requested"].includes(status)) {
      return false;
    }
    return cancelTimeRemaining !== null && cancelTimeRemaining > 0;
  }, [order, cancelTimeRemaining]);

  // Check Return Eligibility (within 7 days of delivery)
  const isEligibleForReturn = useMemo(() => {
    if (!order) return false;
    const status = (order.order_status || "").toLowerCase();
    if (status !== "delivered") return false;
    if (order.return_status) return false; // Already returned / requested

    const deliveryDate = order.delivered_at || order.updated_at || order.created_at;
    if (!deliveryDate) return true;
    const days = (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }, [order]);

  // Check Address Modification Eligibility
  const isEligibleForAddressEdit = useMemo(() => {
    if (!order) return false;
    const status = (order.order_status || "").toLowerCase();
    return ["placed", "confirmed", "processing"].includes(status);
  }, [order]);

  // Parse Address safely
  const parsedAddress = useMemo(() => {
    if (!order?.address && !order?.shipping_address) return null;
    const rawAddr = order.shipping_address || order.address;
    if (typeof rawAddr === "object" && rawAddr !== null) return rawAddr;
    if (typeof rawAddr === "string") {
      try {
        const obj = JSON.parse(rawAddr);
        if (typeof obj === "object" && obj !== null) return obj;
      } catch (_) {}
      return { address_line: rawAddr };
    }
    return null;
  }, [order]);

  // Pre-fill Edit Address state when opening address modal
  const openEditAddressModal = () => {
    if (parsedAddress) {
      setEditAddress({
        name: parsedAddress.name || order?.customer_name || "",
        phone: parsedAddress.phone || order?.phone || "",
        addressLine: parsedAddress.address || parsedAddress.address_line || parsedAddress.address_line1 || "",
        city: parsedAddress.city || "",
        state: parsedAddress.state || "",
        pincode: parsedAddress.pincode || ""
      });
    } else {
      setEditAddress({
        name: order?.customer_name || "",
        phone: order?.phone || "",
        addressLine: typeof order?.address === "string" ? order.address : "",
        city: "",
        state: "",
        pincode: ""
      });
    }
    setIsAddressModalOpen(true);
  };

  // Handle Cancel Order Submission
  const handleConfirmCancel = async () => {
    if (!order) return;
    setIsSubmittingCancel(true);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          order_number: order.order_number,
          reason: cancelReason,
          comment: cancelComment
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsCancelModalOpen(false);
        fetchOrderDetails();
      } else {
        alert(data.message || "Failed to cancel order.");
      }
    } catch (err) {
      console.error("Cancellation error:", err);
      alert("Network error while submitting cancellation request.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle Return Request Submission
  const handleConfirmReturn = async () => {
    if (!order) return;
    const isCod = String(order.payment_method).toUpperCase() === "COD";
    if (isCod && !upiId.trim() && returnType === "RETURN") {
      alert("Please enter a valid UPI ID for your COD refund.");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const res = await fetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          order_number: order.order_number,
          return_type: returnType,
          reason: returnReasonCategory,
          sub_reason: returnSubReason,
          description: returnDescription,
          images: returnImages,
          upi_id: upiId
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsReturnModalOpen(false);
        fetchOrderDetails();
      } else {
        alert(data.message || "Failed to submit return request.");
      }
    } catch (err) {
      console.error("Return submit error:", err);
      alert("Network error while submitting return request.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Handle Address Update Submission
  const handleSaveAddress = async () => {
    if (!order) return;
    if (!editAddress.addressLine.trim()) {
      alert("Please enter a valid address.");
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const fullAddrObj = {
        name: editAddress.name,
        phone: editAddress.phone,
        address: editAddress.addressLine,
        city: editAddress.city,
        state: editAddress.state,
        pincode: editAddress.pincode
      };

      const res = await fetch("/api/orders/update-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customer_name: editAddress.name,
          phone: editAddress.phone,
          address: fullAddrObj
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsAddressModalOpen(false);
        fetchOrderDetails();
      } else {
        alert(data.message || "Failed to update address.");
      }
    } catch (err) {
      alert("Network error while updating address.");
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  // Copy tracking ID
  const copyTrackingId = (trId: string) => {
    navigator.clipboard.writeText(trId);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Semantic Status Badge Renderer
  const renderStatusBadge = (statusStr?: string) => {
    const s = String(statusStr || "PLACED").toUpperCase();
    let bg = "bg-zinc-800 text-zinc-300 border-zinc-700";
    let dot = "bg-zinc-400";
    let text = s.replace(/_/g, " ");

    if (["PLACED", "CONFIRMED"].includes(s)) {
      bg = "bg-emerald-950/80 text-emerald-300 border-emerald-500/40";
      dot = "bg-emerald-400 animate-pulse";
    } else if (["PROCESSING", "PACKED"].includes(s)) {
      bg = "bg-sky-950/80 text-sky-300 border-sky-500/40";
      dot = "bg-sky-400 animate-pulse";
    } else if (["SHIPPED", "OUT_FOR_DELIVERY"].includes(s)) {
      bg = "bg-purple-950/80 text-purple-300 border-purple-500/40";
      dot = "bg-purple-400 animate-ping";
    } else if (["DELIVERED", "COMPLETED"].includes(s)) {
      bg = "bg-emerald-900/90 text-emerald-200 border-emerald-400/50";
      dot = "bg-emerald-400";
    } else if (s.includes("CANCEL")) {
      bg = "bg-rose-950/90 text-rose-300 border-rose-500/40";
      dot = "bg-rose-500";
    } else if (s.includes("RETURN") || s.includes("REFUND") || s.includes("REPLACE")) {
      bg = "bg-amber-950/90 text-amber-300 border-amber-500/40";
      dot = "bg-amber-400";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${bg}`}>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {text}
      </span>
    );
  };

  // Semantic Payment Status Tag Renderer
  const renderPaymentStatusTag = (pm?: string, ps?: string) => {
    const isCod = String(pm || "").toUpperCase() === "COD";
    const status = String(ps || "").toUpperCase();

    if (isCod) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
          💵 Cash on Delivery
        </span>
      );
    }

    if (status === "COMPLETE" || status === "PAID" || status === "BOOKED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
          ⚡ Paid Online
        </span>
      );
    }

    if (status === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
          ⚠️ Payment Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold">
        ⏳ Payment Pending
      </span>
    );
  };

interface TimelineStep {
  label: string;
  done: boolean;
  current?: boolean;
  isError?: boolean;
  time?: string;
}

  // Timeline Steps Configuration
  const getTimelineSteps = (): TimelineStep[] => {
    const status = String(order?.order_status || "").toUpperCase();
    const isCancelled = status.includes("CANCEL");
    const isReturn = status.includes("RETURN") || status.includes("REFUND");

    if (isCancelled) {
      return [
        { label: "Order Placed", done: true, time: order?.created_at },
        { label: "Confirmed", done: true, time: order?.created_at },
        { label: "Cancelled", done: true, current: true, isError: true, time: order?.cancelled_at || order?.updated_at }
      ];
    }

    if (isReturn) {
      const returnStatus = String(order?.return_status || "requested").toUpperCase();
      return [
        { label: "Delivered", done: true, time: order?.delivered_at || order?.created_at },
        { label: "Return Requested", done: true, current: returnStatus === "REQUESTED", time: order?.return_requested_at },
        { label: "Return Approved", done: ["APPROVED", "PICKED_UP", "COMPLETED"].includes(returnStatus), current: returnStatus === "APPROVED", time: order?.return_approved_at },
        { label: "Item Picked Up", done: ["PICKED_UP", "COMPLETED"].includes(returnStatus), current: returnStatus === "PICKED_UP", time: order?.return_picked_up_at },
        { label: "Refund Processed", done: returnStatus === "COMPLETED" || String(order?.refund_status).toUpperCase() === "COMPLETED", current: String(order?.refund_status).toUpperCase() === "COMPLETED" }
      ];
    }

    // Standard Order Progression Steps
    const steps = [
      { id: "PLACED", label: "Order Placed" },
      { id: "CONFIRMED", label: "Confirmed" },
      { id: "PACKED", label: "Packed" },
      { id: "SHIPPED", label: "Shipped" },
      { id: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
      { id: "DELIVERED", label: "Delivered" }
    ];

    const statusHierarchy: Record<string, number> = {
      "PLACED": 1,
      "CONFIRMED": 2,
      "PROCESSING": 2,
      "PACKED": 3,
      "SHIPPED": 4,
      "OUT_FOR_DELIVERY": 5,
      "DELIVERED": 6,
      "COMPLETED": 6
    };

    const currentRank = statusHierarchy[status] || 1;

    return steps.map((step, idx) => {
      const stepRank = idx + 1;
      return {
        label: step.label,
        done: stepRank <= currentRank,
        current: stepRank === currentRank,
        time: stepRank === 1 ? order?.created_at : (stepRank === currentRank ? order?.updated_at : undefined)
      };
    });
  };

  // Group items by seller or seller_orders
  const itemsBySeller = useMemo(() => {
    if (!order?.items || order.items.length === 0) return [];
    
    // Check if seller_orders table has split seller items
    if (sellerOrders.length > 0) {
      return sellerOrders.map((so: any) => ({
        sellerId: so.seller_id,
        sellerName: so.seller_name || `Seller #${String(so.seller_id).slice(0, 8)}`,
        sellerOrderNumber: so.seller_order_number,
        total: so.total_amount,
        items: so.order_items || order.items
      }));
    }

    // Default grouping from items array
    const groups: Record<string, { sellerName: string; items: OrderItem[] }> = {};
    order.items.forEach((item: OrderItem) => {
      const sId = item.seller_id || order.seller_id || "zebalpha_direct";
      const sName = item.seller_name || order.seller_name || "Zebalpha Direct Store";
      if (!groups[sId]) {
        groups[sId] = { sellerName: sName, items: [] };
      }
      groups[sId].items.push(item);
    });

    return Object.keys(groups).map(sId => ({
      sellerId: sId,
      sellerName: groups[sId].sellerName,
      items: groups[sId].items
    }));
  }, [order, sellerOrders]);

  // Item Price Calculations
  const calculatedSubtotal = useMemo(() => {
    if (!order?.items) return Number(order?.total_amount) || 0;
    return order.items.reduce((acc, item) => {
      const p = Number(item.price) || 0;
      const q = Number(item.quantity || item.units) || 1;
      return acc + (p * q);
    }, 0);
  }, [order]);

  const deliveryCharge = calculatedSubtotal >= 999 ? 0 : 40;
  const platformFee = 5;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12 w-full flex-1">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-48 bg-zinc-900 rounded-lg" />
            <div className="h-32 bg-zinc-900 rounded-3xl border border-zinc-800" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-zinc-900 rounded-3xl border border-zinc-800" />
                <div className="h-64 bg-zinc-900 rounded-3xl border border-zinc-800" />
              </div>
              <div className="h-80 bg-zinc-900 rounded-3xl border border-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center flex-1 flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mb-6 text-rose-400">
            <AlertCircle size={36} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider mb-2">Order Not Found</h1>
          <p className="text-zinc-400 text-sm mb-8 max-w-md">
            {errorMsg || "We couldn't find the requested order details. It may have been removed or you might need to log in with the account used to place it."}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/profile/orders"
              className="px-6 py-3 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-wider hover:bg-zinc-200 transition"
            >
              My Orders List
            </Link>
            <Link
              href="/products"
              className="px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-black uppercase text-xs tracking-wider hover:bg-zinc-800 transition"
            >
              Shop More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 space-y-6">
        {/* ================================================== */}
        {/* BREADCRUMB & PAGE HEADER */}
        {/* ================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
          <div>
            <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-2">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <span>/</span>
              <Link href="/profile/orders" className="hover:text-white transition">My Orders</Link>
              <span>/</span>
              <span className="text-white font-mono font-bold">Order Details</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              Order #{order.order_number || String(order.id).slice(0, 12)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile/orders"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800 hover:text-white transition"
            >
              <ArrowLeft size={14} /> Back to Orders
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition shadow-lg"
            >
              Shop More <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* ================================================== */}
        {/* TOP ORDER SUMMARY HEADER CARD */}
        {/* ================================================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                {renderStatusBadge(order.order_status)}
                {renderPaymentStatusTag(order.payment_method, order.payment_status)}
              </div>
              <p className="text-xs text-zinc-400 font-medium pt-1">
                Placed on <span className="text-white font-bold">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* MAIN TWO-COLUMN LAYOUT */}
        {/* ================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Products, Timeline, Shipment, Address */}
          <div className="lg:col-span-2 space-y-6">

            {/* ================================================== */}
            {/* 3. ORDER STATUS TIMELINE */}
            {/* ================================================== */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Truck size={18} className="text-amber-400" /> Order Shipment Progress
                </h3>
                {order.estimated_delivery && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800">
                    Est. Delivery: {order.estimated_delivery}
                  </span>
                )}
              </div>

              {/* Desktop Horizontal Timeline */}
              <div className="hidden md:block relative py-4">
                <div className="absolute top-[26px] left-[8%] right-[8%] h-[3px] bg-zinc-800 rounded-full">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, (timelineSteps.findIndex(s => s.current || s.isError) / (timelineSteps.length - 1)) * 100)}%`
                    }}
                  />
                </div>

                <div className="relative flex justify-between items-start">
                  {timelineSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center max-w-[100px]">
                      <div
                        className={`h-11 w-11 rounded-full flex items-center justify-center border-2 transition-all ${
                          step.isError
                            ? "bg-rose-950 border-rose-500 text-rose-400"
                            : step.done
                            ? "bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                            : "bg-zinc-900 border-zinc-800 text-zinc-600"
                        }`}
                      >
                        {step.isError ? (
                          <XCircle size={18} />
                        ) : step.done ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <p className={`text-[11px] font-black uppercase tracking-wider mt-2.5 ${step.done ? "text-white" : "text-zinc-500"}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                          {new Date(step.time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Vertical Timeline */}
              <div className="md:hidden space-y-4 relative pl-4 border-l-2 border-zinc-800 ml-2">
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pb-2">
                    <div
                      className={`absolute -left-[23px] top-0 h-8 w-8 rounded-full flex items-center justify-center border ${
                        step.isError
                          ? "bg-rose-950 border-rose-500 text-rose-400"
                          : step.done
                          ? "bg-emerald-950 border-emerald-400 text-emerald-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-600"
                      }`}
                    >
                      {step.isError ? <XCircle size={14} /> : step.done ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${step.done ? "text-white" : "text-zinc-500"}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {new Date(step.time).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ================================================== */}
            {/* 2. PRODUCT SECTION (Grouped by Seller / Multi-Seller Support) */}
            {/* ================================================== */}
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 px-1">
                Items Ordered ({order.items?.length || 0})
              </h3>

              {itemsBySeller.map((group, gIdx) => (
                <div key={gIdx} className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xl">
                  {/* Seller Header */}
                  <div className="px-6 py-4 bg-zinc-900/80 border-b border-zinc-850 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-zinc-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Seller: {group.sellerName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                      Verified Seller
                    </span>
                  </div>

                  {/* Product Cards */}
                  <div className="divide-y divide-zinc-850">
                    {group.items.map((item: OrderItem, iIdx: number) => {
                      const pName = item.name || item.title || "Essential Garment Item";
                      const pPrice = Number(item.price) || 0;
                      const pMrp = Number(item.mrp) || Math.round(pPrice * 1.4);
                      const qty = Number(item.quantity || item.units) || 1;
                      const discountPct = pMrp > pPrice ? Math.round(((pMrp - pPrice) / pMrp) * 100) : 0;
                      const pImage = item.image_url || item.image || (item.images && item.images[0]) || "/placeholder.jpg";
                      const pId = item.product_id || item.id;

                      return (
                        <div key={iIdx} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-zinc-900/30 transition">
                          <div className="flex items-center gap-4">
                            <div className="h-20 w-20 shrink-0 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                              <img
                                src={pImage}
                                alt={pName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute("src", "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300");
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-white line-clamp-1">{pName}</h4>
                              <p className="text-xs text-zinc-400 font-medium">
                                Package/Size: <span className="text-zinc-200 font-bold">{item.package_name || "Standard"}</span> • Qty: <span className="text-white font-bold">{qty}</span>
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-base font-black text-white">₹{pPrice.toLocaleString("en-IN")}</span>
                                {pMrp > pPrice && (
                                  <>
                                    <span className="text-xs text-zinc-500 line-through">MRP ₹{pMrp.toLocaleString("en-IN")}</span>
                                    <span className="text-xs font-black text-emerald-400">{discountPct}% OFF</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total</span>
                              <p className="text-base font-black text-white">₹{(pPrice * qty).toLocaleString("en-IN")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {pId && (
                                <Link
                                  href={`/products/${pId}`}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                                >
                                  View Product
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ================================================== */}
            {/* 4. SHIPPING INFORMATION */}
            {/* ================================================== */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Truck size={18} className="text-purple-400" /> Shipment Details
              </h3>

              {order.tracking_number ? (
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-400 font-bold uppercase">Courier Partner</p>
                      <p className="text-sm font-black text-white">{order.courier_name || "Express Shiprocket Partner"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-400 font-bold uppercase">AWB Tracking ID</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-black text-amber-300">{order.tracking_number}</span>
                        <button
                          onClick={() => copyTrackingId(order.tracking_number!)}
                          className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                          title="Copy AWB"
                        >
                          {copiedTracking ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-medium">Real-time express logistics webhook updates active</span>
                    <button
                      onClick={() => setIsTrackModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-black uppercase tracking-wider hover:bg-purple-900 transition flex items-center gap-1.5"
                    >
                      Track Shipment <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs font-medium flex items-center gap-3">
                  <Clock size={16} className="text-amber-400 shrink-0" />
                  <span>Shipment details will be updated automatically as soon as the seller packages your order.</span>
                </div>
              )}
            </div>

            {/* ================================================== */}
            {/* 5. DELIVERY ADDRESS */}
            {/* ================================================== */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <MapPin size={18} className="text-rose-400" /> Delivered To
                </h3>
                {isEligibleForAddressEdit ? (
                  <button
                    onClick={openEditAddressModal}
                    className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950/50 border border-amber-500/40 hover:bg-amber-900 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Edit Address
                  </button>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold uppercase bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                    Address Locked (Dispatched)
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <p className="text-sm font-black text-white">{parsedAddress?.name || order.customer_name || "Valued Zebalpha Customer"}</p>
                <p className="text-xs text-zinc-300 font-medium">📞 Phone: <span className="font-bold text-white">{parsedAddress?.phone || order.phone || "N/A"}</span></p>
                <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                  {parsedAddress?.address || parsedAddress?.address_line || parsedAddress?.address_line1 || (typeof order.address === "string" ? order.address : "Primary Shipping Destination")}
                  {parsedAddress?.city && `, ${parsedAddress.city}`}
                  {parsedAddress?.state && `, ${parsedAddress.state}`}
                  {parsedAddress?.pincode && ` - ${parsedAddress.pincode}`}
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Payment Summary, Refund Info & Order Actions */}
          <div className="space-y-6">

            {/* ================================================== */}
            {/* 12. DYNAMIC STATE-DRIVEN ORDER ACTIONS */}
            {/* ================================================== */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Order Quick Actions</h3>

              {/* Download Invoice Button */}
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-black uppercase text-xs tracking-wider hover:bg-zinc-800 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={16} /> Download Tax Invoice
              </button>

              {/* Cancel Button */}
              {isEligibleForCancellation && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 font-black uppercase text-xs tracking-wider hover:bg-rose-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle size={16} /> Cancel Order
                </button>
              )}

              {/* Return / Replace Button */}
              {isEligibleForReturn && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setReturnType("RETURN"); setIsReturnModalOpen(true); }}
                    className="py-3 px-3 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-200 font-black uppercase text-[11px] tracking-wider hover:bg-amber-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} /> Return
                  </button>
                  <button
                    onClick={() => { setReturnType("EXCHANGE"); setIsReturnModalOpen(true); }}
                    className="py-3 px-3 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-purple-200 font-black uppercase text-[11px] tracking-wider hover:bg-purple-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} /> Replace
                  </button>
                </div>
              )}

              {/* Buy Again Button */}
              <Link
                href="/products"
                className="w-full py-3 px-4 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-wider hover:bg-zinc-200 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <ShoppingBag size={16} /> Buy Again
              </Link>
            </div>

            {/* ================================================== */}
            {/* 6. PAYMENT INFORMATION & PRICE SUMMARY */}
            {/* ================================================== */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" /> Payment Summary
              </h3>

              <div className="space-y-3 text-xs font-medium border-b border-zinc-850 pb-4">
                <div className="flex justify-between text-zinc-300">
                  <span>Product Subtotal</span>
                  <span className="font-bold text-white">₹{calculatedSubtotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between text-zinc-300">
                  <span>Delivery Charge</span>
                  {deliveryCharge === 0 ? (
                    <span className="font-bold text-emerald-400">FREE</span>
                  ) : (
                    <span className="font-bold text-white">₹{deliveryCharge}</span>
                  )}
                </div>

                <div className="flex justify-between text-zinc-300">
                  <span>Marketplace Platform Fee</span>
                  <span className="font-bold text-white">₹{platformFee}</span>
                </div>

                <div className="flex justify-between text-zinc-300">
                  <span>GST & Taxes</span>
                  <span className="text-zinc-400">Included</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-black text-white pt-1">
                <span>Total Amount Paid</span>
                <span className="text-base text-emerald-400 font-mono">
                  ₹{(Number(order.total_amount) || (calculatedSubtotal + deliveryCharge + platformFee)).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-1">
                <p className="text-zinc-400 font-bold uppercase text-[10px]">Payment Method</p>
                <p className="font-black text-white flex items-center gap-2">
                  {String(order.payment_method).toUpperCase() === "COD" ? "Cash on Delivery (COD)" : "Prepaid (Online Payment)"}
                </p>
              </div>

              {/* ================================================== */}
              {/* 10. REFUND TRACKING INFORMATION (If Cancelled/Returned) */}
              {/* ================================================== */}
              {(order.refund_amount || order.refund_status || String(order.order_status).includes("CANCEL")) && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-2 mt-4">
                  <h4 className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Refund Information
                  </h4>
                  <div className="space-y-1 text-xs text-zinc-300">
                    <p className="flex justify-between">
                      <span>Refund Amount:</span>
                      <span className="font-mono font-bold text-white">₹{(order.refund_amount || order.total_amount || 0).toLocaleString("en-IN")}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Refund Method:</span>
                      <span className="font-bold text-amber-200">{order.refund_mode || (String(order.payment_method).toUpperCase() === "COD" ? "UPI Account" : "Original Payment Method")}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Refund Status:</span>
                      <span className="font-black uppercase text-emerald-400">{order.refund_status || "INITIATED"}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* ================================================== */}
      {/* 7. CANCELLATION MODAL */}
      {/* ================================================== */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <XCircle className="text-rose-500" size={20} /> Cancel Order #{order.order_number || String(order.id).slice(0, 10)}?
              </h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-zinc-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-2">
                  Select Cancellation Reason *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {CANCELLATION_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                  placeholder="Tell us why you are cancelling..."
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-400 h-24 resize-none"
                />
              </div>

              {/* Refund Info Preview */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                <p className="font-bold text-amber-300">Refund Summary:</p>
                {String(order.payment_method).toUpperCase() === "COD" ? (
                  <p className="text-zinc-300">This is a Cash on Delivery order. No payment has been collected, so no refund is necessary.</p>
                ) : (
                  <p className="text-zinc-300">₹{order.total_amount?.toLocaleString("en-IN")} will be refunded to your original payment method in 3-5 business days.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-850">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider hover:bg-rose-500 disabled:opacity-50"
              >
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 9. RETURN / REPLACEMENT MODAL */}
      {/* ================================================== */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <RotateCcw className="text-amber-400" size={20} /> Request {returnType === "EXCHANGE" ? "Replacement" : "Return"}
              </h3>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-zinc-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-2">
                  Select Reason Category *
                </label>
                <select
                  value={returnReasonCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setReturnReasonCategory(cat);
                    if (RETURN_REASONS[cat]) setReturnSubReason(RETURN_REASONS[cat][0]);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {Object.keys(RETURN_REASONS).map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-2">
                  Specific Issue *
                </label>
                <select
                  value={returnSubReason}
                  onChange={(e) => setReturnSubReason(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {(RETURN_REASONS[returnReasonCategory] || []).map((sub, idx) => (
                    <option key={idx} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* UPI Input for COD Orders */}
              {String(order.payment_method).toUpperCase() === "COD" && returnType === "RETURN" && (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-amber-300 block mb-2">
                    Enter UPI ID for Refund (Required for COD) *
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okaxis or 9876543210@paytm"
                    className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-amber-500/50 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-2">
                  Description / Comments
                </label>
                <textarea
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Describe the issue with your item..."
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-400 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-850">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={isSubmittingReturn}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50"
              >
                {isSubmittingReturn ? "Submitting..." : `Submit ${returnType}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 5. EDIT ADDRESS MODAL */}
      {/* ================================================== */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <MapPin className="text-rose-400" size={20} /> Change Delivery Address
              </h3>
              <button onClick={() => setIsAddressModalOpen(false)} className="text-zinc-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editAddress.name}
                  onChange={(e) => setEditAddress({ ...editAddress, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editAddress.phone}
                  onChange={(e) => setEditAddress({ ...editAddress, phone: e.target.value })}
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Full Address / Street</label>
                <textarea
                  value={editAddress.addressLine}
                  onChange={(e) => setEditAddress({ ...editAddress, addressLine: e.target.value })}
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-medium h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">City</label>
                  <input
                    type="text"
                    value={editAddress.city}
                    onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">State</label>
                  <input
                    type="text"
                    value={editAddress.state}
                    onChange={(e) => setEditAddress({ ...editAddress, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editAddress.pincode}
                    onChange={(e) => setEditAddress({ ...editAddress, pincode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-850">
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={isSubmittingAddress}
                className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 disabled:opacity-50"
              >
                {isSubmittingAddress ? "Saving..." : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 13. PRINTABLE / DOWNLOADABLE TAX INVOICE MODAL */}
      {/* ================================================== */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-white text-black p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-zinc-700" />
                <h3 className="text-base font-black uppercase tracking-wider">Official Tax Invoice</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-zinc-800 flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button onClick={() => setIsInvoiceModalOpen(false)} className="text-zinc-500 hover:text-black text-xl font-bold">✕</button>
              </div>
            </div>

            {/* Printable Invoice Header */}
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-black">ZEBALPHA</h2>
                  <p className="text-xs text-zinc-600 font-bold">Official E-Commerce Tax Invoice</p>
                  <p className="text-[11px] text-zinc-500">GSTIN: 19AAACZ1234F1Z0 • Regd. Marketplace India</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-500 uppercase">Invoice No:</p>
                  <p className="text-sm font-mono font-black text-black">INV-2026-{String(order.order_number || order.id).slice(0, 10)}</p>
                  <p className="text-xs font-bold text-zinc-500 uppercase pt-1">Date:</p>
                  <p className="text-xs font-semibold text-zinc-800">{new Date(order.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <p className="font-black uppercase text-zinc-500 mb-1">Customer / Billed To:</p>
                  <p className="font-bold text-black">{parsedAddress?.name || order.customer_name || "Customer"}</p>
                  <p className="text-zinc-600 font-medium pt-0.5">Phone: {parsedAddress?.phone || order.phone}</p>
                  <p className="text-zinc-600 leading-relaxed pt-1">
                    {parsedAddress?.address || parsedAddress?.address_line || (typeof order.address === "string" ? order.address : "")}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <p className="font-black uppercase text-zinc-500 mb-1">Seller Details:</p>
                  <p className="font-bold text-black">{order.seller_name || "Zebalpha Direct Marketplace"}</p>
                  <p className="text-zinc-600 font-medium pt-0.5">Order ID: #{order.order_number}</p>
                  <p className="text-zinc-600 font-medium">Payment: {String(order.payment_method).toUpperCase()}</p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-zinc-100">
                    <th className="p-2.5 font-black uppercase">Item Description</th>
                    <th className="p-2.5 font-black uppercase text-center">Qty</th>
                    <th className="p-2.5 font-black uppercase text-right">Price</th>
                    <th className="p-2.5 font-black uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {order.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-zinc-900">{item.name || item.title || "Garment Product"}</td>
                      <td className="p-2.5 text-center font-semibold">{item.quantity || 1}</td>
                      <td className="p-2.5 text-right font-semibold">₹{(Number(item.price) || 0).toLocaleString("en-IN")}</td>
                      <td className="p-2.5 text-right font-black">₹{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Invoice Totals */}
              <div className="flex justify-end pt-4 border-t border-zinc-300">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-black">₹{calculatedSubtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Delivery Charges:</span>
                    <span className="font-bold text-black">₹{deliveryCharge}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Platform Fee:</span>
                    <span className="font-bold text-black">₹{platformFee}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-black pt-2 border-t border-zinc-400">
                    <span>Grand Total:</span>
                    <span>₹{(Number(order.total_amount) || (calculatedSubtotal + deliveryCharge + platformFee)).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* SHIPMENT TRACKING CHECKPOINT MODAL */}
      {/* ================================================== */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                <Truck className="text-purple-400" size={18} /> Live Tracking Updates
              </h3>
              <button onClick={() => setIsTrackModalOpen(false)} className="text-zinc-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 font-bold uppercase text-[10px]">Courier Partner</p>
                  <p className="font-black text-white">{order.courier_name || "Express Logistics"}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-400 font-bold uppercase text-[10px]">AWB</p>
                  <p className="font-mono font-black text-amber-300">{order.tracking_number || "AWB-8839210"}</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0 animate-ping" />
                  <div>
                    <p className="font-black text-white uppercase text-xs">In Transit - Regional Hub</p>
                    <p className="text-[10px] text-zinc-400">Package scanned at automated sorting center</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-70">
                  <div className="h-3 w-3 rounded-full bg-emerald-600 mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-zinc-200 uppercase text-xs">Picked up by Courier</p>
                    <p className="text-[10px] text-zinc-400">Handed over from seller facility</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-850 flex justify-end">
              <button
                onClick={() => setIsTrackModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

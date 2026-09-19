"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  ShieldAlert, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  X, 
  Eye, 
  Trash2, 
  RotateCcw, 
  Activity,
  TrendingUp,
  Clock,
  Download,
  CreditCard,
  Tag,
  Package,
  ShoppingBag,
  User,
  ShieldCheck,
  RefreshCw,
  Unlock,
  Sparkles,
  Edit3,
  Shirt,
  Layers,
  Truck,
  ExternalLink,
  Plus,
  Copy,
  Check,
  DollarSign,
  ArrowUpRight,
  Boxes,
  Store
} from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

const APPAREL_CATEGORIES = [
  { key: "all", label: "All Clothing" },
  { key: "polos", label: "Polos & T-Shirts" },
  { key: "hoodies", label: "Hoodies & Sweatshirts" },
  { key: "shirts", label: "Casual Shirts" },
  { key: "bottoms", label: "Bottoms & Cargo" },
  { key: "outerwear", label: "Outerwear & Jackets" },
  { key: "accessories", label: "Accessories & Caps" },
  { key: "drops", label: "Limited Drops" }
];

export default function SellerManagementView() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);

  // Filtering & Search
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "products" | "orders">("overview");
  const [selectedSellerProducts, setSelectedSellerProducts] = useState<any[] | null>(null);
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [showEditSellerModal, setShowEditSellerModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Edit Seller state
  const [editingSellerData, setEditingSellerData] = useState<any | null>(null);

  // New Seller Onboarding Form State
  const [newSellerForm, setNewSellerForm] = useState({
    full_name: "",
    business_name: "",
    category: "Polos & T-Shirts",
    phone_number: "",
    email: "",
    upi_id: "",
    city: "",
    pickup_address: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch real sellers from Supabase
      const { data: sellersData, error: sellersErr } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });

      if (sellersErr) {
        console.warn("Supabase sellers fetch notice:", sellersErr.message);
      }

      // 2. Fetch real products, orders, and pickup locations
      const [pRes, oRes, locRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("seller_pickup_locations").select("*").order("created_at", { ascending: false })
      ]);

      const allProducts = pRes.data || [];
      const allOrders = oRes.data || [];
      const allLocations = locRes.data || [];
      let dbSellers = sellersData || [];

      // If no sellers exist in DB yet, add the primary 1st-party brand record seamlessly
      if (dbSellers.length === 0) {
        const defaultBrand = {
          id: "primary-zebalpha-merchant",
          seller_id: "ZEB-BRAND-01",
          full_name: "Rahul Adhikary",
          business_name: "ZEBALPHA Official Brand Store",
          owner_name: "Rahul Adhikary",
          email: "r.adhikary7777@gmail.com",
          phone_number: "+91 98765 43210",
          mobile_number: "+91 98765 43210",
          category: "Luxury Clothing & Streetwear",
          business_category: "Luxury Clothing & Streetwear",
          upi_id: "rahuladhikary@phonepe",
          phonepay_no: "rahuladhikary@phonepe",
          phonepay_number: "rahuladhikary@phonepe",
          pickup_location: "ZEBALPHA Central Apparel Hub, Kolkata",
          city: "Kolkata",
          state: "West Bengal",
          pincode: "700001",
          warehouse_address: "Plot 42, Central Fashion Complex, Kolkata, West Bengal, 700001",
          pickup_address: "Plot 42, Central Fashion Complex, Kolkata, West Bengal, 700001",
          gstin: "19ABCDE1234F1Z5",
          account_status: "Active",
          status: "approved",
          is_primary_brand: true,
          created_at: new Date().toISOString()
        };
        dbSellers = [defaultBrand];
      }

      setSellers(dbSellers);
      setProducts(allProducts);
      setOrders(allOrders);
      setPickupLocations(allLocations);
    } catch (e: any) {
      console.error("Error loading merchant data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime WebSockets for zero-refresh updates
    const channel = supabase
      .channel("admin-seller-management-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_pickup_locations" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Compute Real Metrics for Each Seller ─────────────────────────────────
  const sellersWithMetrics = useMemo(() => {
    return sellers.map((seller) => {
      const sId = seller.id;
      const sUserId = seller.user_id;
      const isPrimary = seller.is_primary_brand || seller.email === "r.adhikary7777@gmail.com";

      // Match products for this seller
      const sellerProds = products.filter((p) => 
        p.seller_id === sId || 
        (sUserId && p.seller_id === sUserId) || 
        (isPrimary && (!p.seller_id || p.seller_id === sId || p.brand?.toLowerCase() === "zebalpha"))
      );

      const sellerProdIds = new Set(sellerProds.map((p) => String(p.id)));

      // Find matching orders and line items
      let totalGrossRev = 0;
      let totalUnits = 0;
      let matchingOrders: any[] = [];

      orders.forEach((ord) => {
        let rawItems: any[] = [];
        if (Array.isArray(ord.items)) {
          rawItems = ord.items;
        } else if (ord.product_details) {
          try {
            rawItems = typeof ord.product_details === "string" ? JSON.parse(ord.product_details) : ord.product_details;
          } catch (_) {
            rawItems = [];
          }
        }

        const matchingItems = rawItems.filter((item: any) => {
          const itProdId = String(item.product_id || item.id || "");
          const itSellerId = item.seller_id;
          return sellerProdIds.has(itProdId) || itSellerId === sId || (sUserId && itSellerId === sUserId);
        });

        const isDirectOrder = ord.seller_id === sId || (sUserId && ord.seller_id === sUserId) || (isPrimary && (!ord.seller_id || ord.seller_id === sId));

        if (matchingItems.length > 0 || isDirectOrder) {
          const itemsToCount = matchingItems.length > 0 ? matchingItems : rawItems;
          const orderItemsSum = itemsToCount.reduce((sum: number, it: any) => 
            sum + (Number(it.subtotal) || ((Number(it.price) || 0) * (Number(it.quantity) || 1))), 0);
          
          const orderTotal = orderItemsSum > 0 ? orderItemsSum : (Number(ord.total_amount) || 0);
          const orderQty = itemsToCount.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);

          const isCancelled = ord.order_status === "cancelled" || ord.order_status === "returned";
          if (!isCancelled) {
            totalGrossRev += orderTotal;
            totalUnits += orderQty;
          }

          matchingOrders.push({
            ...ord,
            seller_items: itemsToCount,
            seller_order_amount: orderTotal
          });
        }
      });

      // Calculate Seller Net Payout vs Admin Commission
      // 1st-Party Brand = 100% revenue retained; 3rd-Party Merchants = 90% payout, 10% marketplace commission
      const commissionRate = isPrimary ? 0 : 0.10;
      const adminCommission = Math.round(totalGrossRev * commissionRate);
      const netSellerPayout = totalGrossRev - adminCommission;

      const deliveredCount = matchingOrders.filter(o => o.order_status === "delivered").length;
      const inTransitCount = matchingOrders.filter(o => ["shipped", "in_transit", "picked_up", "dispatched", "out_for_delivery"].includes(o.order_status)).length;
      const pendingCount = matchingOrders.filter(o => ["placed", "confirmed", "processing", "ready_to_ship"].includes(o.order_status)).length;

      // Find all pickup locations belonging to this seller
      const sellerLocations = pickupLocations.filter((loc: any) => 
        loc.seller_id === sId || 
        (sUserId && loc.seller_id === sUserId) ||
        (loc.user_id && (loc.user_id === sId || loc.user_id === sUserId)) ||
        (loc.contact_email && seller.email && loc.contact_email.toLowerCase() === seller.email.toLowerCase()) ||
        (loc.contact_phone && (seller.mobile_number === loc.contact_phone || seller.phone_number === loc.contact_phone))
      );
      const primaryLoc = sellerLocations.find((l: any) => l.is_default) || sellerLocations[0] || null;

      return {
        ...seller,
        is_primary_brand: isPrimary,
        grossRevenue: totalGrossRev,
        netPayout: netSellerPayout,
        adminCommission: adminCommission,
        totalOrdersCount: matchingOrders.length,
        deliveredCount,
        inTransitCount,
        pendingCount,
        totalUnitsSold: totalUnits,
        productsCount: sellerProds.length,
        sellerProducts: sellerProds,
        sellerOrders: matchingOrders,
        pickupLocations: sellerLocations,
        primaryLoc
      };
    });
  }, [sellers, products, orders, pickupLocations]);

  // ── Compute Platform-Wide Total Income & Revenue ──────────────────────────
  const platformSummary = useMemo(() => {
    let totalPlatformGross = 0;
    let totalAdminComm = 0;
    let totalSellerPayouts = 0;
    let totalActiveMerchants = 0;
    let totalSuspendedMerchants = 0;

    sellersWithMetrics.forEach((s) => {
      totalPlatformGross += s.grossRevenue;
      totalAdminComm += s.adminCommission;
      totalSellerPayouts += s.netPayout;
      if (s.account_status === "Active" || s.status === "approved") {
        totalActiveMerchants++;
      } else if (s.account_status === "Suspended" || s.is_suspended) {
        totalSuspendedMerchants++;
      }
    });

    return {
      totalPlatformGross,
      totalAdminCommission: totalAdminComm,
      totalSellerPayouts,
      totalActiveMerchants,
      totalSuspendedMerchants,
      totalMerchants: sellersWithMetrics.length,
      totalCatalogSKUs: products.length,
      totalOrdersPlaced: orders.length
    };
  }, [sellersWithMetrics, products, orders]);

  // ── Filtered Sellers List ────────────────────────────────────────────────
  const filteredSellers = useMemo(() => {
    return sellersWithMetrics.filter((s) => {
      const statusVal = (s.account_status || s.status || "active").toLowerCase();
      const catVal = (s.category || s.business_category || "").toLowerCase();
      const isSusp = s.is_suspended || statusVal === "suspended";

      const matchesStatus = 
        filterStatus === "all" || 
        (filterStatus === "active" && !isSusp && (statusVal === "active" || statusVal === "approved" || s.is_primary_brand)) ||
        (filterStatus === "suspended" && isSusp) ||
        (filterStatus === "pending" && statusVal === "pending");

      const matchesCategory = 
        filterCategory === "all" || 
        catVal.includes(filterCategory.toLowerCase()) || 
        s.is_primary_brand;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        (s.business_name || "").toLowerCase().includes(query) ||
        (s.owner_name || s.full_name || "").toLowerCase().includes(query) ||
        (s.email || "").toLowerCase().includes(query) ||
        (s.phone_number || s.mobile_number || "").includes(query) ||
        (s.upi_id || s.phonepay_no || s.phonepay_number || "").toLowerCase().includes(query) ||
        (s.city || s.pickup_location || "").toLowerCase().includes(query) ||
        (s.state || "").toLowerCase().includes(query) ||
        (s.pincode || "").includes(query) ||
        (s.warehouse_address || "").toLowerCase().includes(query) ||
        (s.pickup_address || "").toLowerCase().includes(query) ||
        (s.seller_id || s.id || "").toString().toLowerCase().includes(query) ||
        (s.pickupLocations || []).some((loc: any) => 
          (loc.location_name || "").toLowerCase().includes(query) ||
          (loc.name || "").toLowerCase().includes(query) ||
          (loc.address_line1 || loc.address || "").toLowerCase().includes(query) ||
          (loc.city || "").toLowerCase().includes(query) ||
          (loc.state || "").toLowerCase().includes(query) ||
          (loc.pincode || "").includes(query) ||
          (loc.contact_name || "").toLowerCase().includes(query) ||
          (loc.contact_phone || "").includes(query)
        );

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [sellersWithMetrics, filterStatus, filterCategory, searchQuery]);

  // ── Action Handlers ─────────────────────────────────────────────────────
  const handleCopyUpi = (upi: string) => {
    navigator.clipboard.writeText(upi);
    setCopiedUpi(upi);
    setTimeout(() => setCopiedUpi(null), 2500);
  };

  const handleCopyOnboardingLink = () => {
    const link = typeof window !== "undefined" 
      ? `${window.location.origin.replace("admin", "seller")}/register` 
      : "https://seller.zebalpha.com/register";
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setStatusMessage("✅ Merchant registration link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Suspend Seller Action
  const handleConfirmSuspend = async () => {
    if (!targetSellerId) return;
    try {
      const updates = {
        account_status: "Suspended",
        status: "suspended",
        is_suspended: true,
        suspension_reason: suspensionReason || "Administrative review / Policy compliance",
        suspended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("sellers")
        .update(updates)
        .eq("id", targetSellerId);

      if (error) throw error;

      setStatusMessage(`🚫 Merchant suspended successfully. Seller cannot add/modify products.`);
      setShowSuspendModal(false);
      setTargetSellerId(null);
      setSuspensionReason("");
      if (selectedSeller?.id === targetSellerId) {
        setSelectedSeller((prev: any) => ({ ...prev, ...updates }));
      }
      await loadData();
    } catch (err: any) {
      console.error("Suspend error:", err);
      alert(err.message || "Failed to suspend merchant.");
    }
  };

  // Reactivate Seller Action
  const handleReactivateSeller = async (sellerId: string) => {
    try {
      const updates = {
        account_status: "Active",
        status: "approved",
        is_suspended: false,
        suspension_reason: null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("sellers")
        .update(updates)
        .eq("id", sellerId);

      if (error) throw error;

      setStatusMessage(`✅ Merchant reactivated successfully. Store operations are now active.`);
      if (selectedSeller?.id === sellerId) {
        setSelectedSeller((prev: any) => ({ ...prev, ...updates }));
      }
      await loadData();
    } catch (err: any) {
      console.error("Reactivate error:", err);
      alert(err.message || "Failed to reactivate merchant.");
    }
  };

  // Create New Merchant Action
  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerForm.full_name || !newSellerForm.business_name || !newSellerForm.phone_number || !newSellerForm.email) {
      alert("Please fill in all required merchant details.");
      return;
    }

    try {
      const generatedCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
      const finalUpi = newSellerForm.upi_id.trim() || `${newSellerForm.phone_number.trim()}@phonepe`;

      const payload = {
        seller_id: generatedCode,
        full_name: newSellerForm.full_name.trim(),
        owner_name: newSellerForm.full_name.trim(),
        business_name: newSellerForm.business_name.trim(),
        category: newSellerForm.category,
        business_category: newSellerForm.category,
        mobile_number: newSellerForm.phone_number.trim(),
        phone_number: newSellerForm.phone_number.trim(),
        email: newSellerForm.email.trim().toLowerCase(),
        upi_id: finalUpi,
        phonepay_no: finalUpi,
        phonepay_number: finalUpi,
        pickup_location: newSellerForm.city.trim() || "Kolkata Apparel Hub",
        city: newSellerForm.city.trim() || "Kolkata",
        pickup_address: newSellerForm.pickup_address.trim() || "Merchant Dispatch Hub",
        warehouse_address: newSellerForm.pickup_address.trim() || "Merchant Dispatch Hub",
        status: "approved",
        account_status: "Active",
        is_suspended: false,
        email_verified: true,
        is_primary_brand: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from("sellers").insert([payload]);
      if (error) throw error;

      setStatusMessage(`✨ Merchant "${payload.business_name}" onboarded successfully with Payout UPI: ${payload.upi_id}`);
      setShowAddSellerModal(false);
      setNewSellerForm({
        full_name: "",
        business_name: "",
        category: "Polos & T-Shirts",
        phone_number: "",
        email: "",
        upi_id: "",
        city: "",
        pickup_address: ""
      });
      await loadData();
    } catch (err: any) {
      console.error("Error creating merchant:", err);
      alert(err.message || "Failed to onboard merchant.");
    }
  };

  // Edit Merchant Action
  const handleSaveSellerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSellerData) return;

    try {
      const updates = {
        business_name: editingSellerData.business_name,
        owner_name: editingSellerData.owner_name,
        full_name: editingSellerData.owner_name,
        email: editingSellerData.email,
        phone_number: editingSellerData.phone_number,
        mobile_number: editingSellerData.phone_number,
        upi_id: editingSellerData.upi_id,
        phonepay_no: editingSellerData.upi_id,
        phonepay_number: editingSellerData.upi_id,
        category: editingSellerData.category,
        business_category: editingSellerData.category,
        city: editingSellerData.city,
        pickup_location: editingSellerData.pickup_location,
        warehouse_address: editingSellerData.warehouse_address,
        pickup_address: editingSellerData.warehouse_address,
        account_status: editingSellerData.account_status,
        status: editingSellerData.account_status === "Active" ? "approved" : "suspended",
        is_suspended: editingSellerData.account_status === "Suspended",
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("sellers")
        .update(updates)
        .eq("id", editingSellerData.id);

      if (error) throw error;

      setStatusMessage(`✅ Merchant "${updates.business_name}" profile updated.`);
      setShowEditSellerModal(false);
      setEditingSellerData(null);
      await loadData();
    } catch (err: any) {
      console.error("Error updating merchant:", err);
      alert(err.message || "Failed to update merchant.");
    }
  };

  // Excel Export Handler
  const handleExportSellersExcel = () => {
    const exportData = filteredSellers.map((s) => ({
      "Merchant ID": s.seller_id || s.id,
      "Brand / Store Name": s.business_name || s.full_name || "ZEBALPHA Brand Store",
      "Owner Name": s.owner_name || s.full_name || "Rahul Adhikary",
      "Merchant Type": s.is_primary_brand ? "1st-Party Direct Brand" : "3rd-Party Marketplace Merchant",
      "Phone Number": s.phone_number || s.mobile_number || "N/A",
      "Email": s.email || "N/A",
      "Payout UPI / PhonePe": s.upi_id || s.phonepay_no || "N/A",
      "Fulfillment Hub / City": s.pickup_location || s.city || "Kolkata, WB",
      "Gross Revenue (₹)": s.grossRevenue,
      "Seller Net Payout (₹)": s.netPayout,
      "Admin Commission (₹)": s.adminCommission,
      "Total Orders": s.totalOrdersCount,
      "Delivered Orders": s.deliveredCount,
      "Active SKUs": s.productsCount,
      "Account Status": s.account_status || s.status || "Active",
      "Registered Date": s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A"
    }));

    exportCustomDataExcel(exportData, "ZEBALPHA_Merchants_Revenue_Registry");
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">ZEBALPHA BRAND OPERATIONS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              ● Phase 2 Live
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">Multi-Vendor & Revenue Management</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Real-time merchant revenue tracking, order dispatches, UPI payout destinations, and seller account lifecycle control.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start flex-wrap">
          <button
            onClick={handleCopyOnboardingLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Register Link"}</span>
          </button>

          <button
            onClick={handleExportSellersExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-all active:scale-95 shadow-md shadow-white/10 cursor-pointer"
          >
            <Download className="w-4 h-4 text-black" />
            <span>Export Registry</span>
          </button>
          
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Refresh Realtime Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-150">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{statusMessage}</span>
          </span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-400 hover:text-white font-black text-sm">✕</button>
        </div>
      )}

      {/* ── PLATFORM TOTAL INCOME & REVENUE SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Gross Revenue */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Total Platform GMV</span>
          <p className="text-2xl sm:text-3xl font-black text-white">
            ₹{platformSummary.totalPlatformGross.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] font-bold text-zinc-400 block">
            Across {platformSummary.totalOrdersPlaced} Total Customer Orders
          </span>
        </div>

        {/* Total Admin Marketplace Commission */}
        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">Admin Commission Income</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-400">
            ₹{platformSummary.totalAdminCommission.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] font-bold text-zinc-500 block">
            10% Take-Rate on 3rd-Party Merchants
          </span>
        </div>

        {/* Total Seller Payouts Disbursed/Due */}
        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Total Seller Payouts</span>
          <p className="text-2xl sm:text-3xl font-black text-white">
            ₹{platformSummary.totalSellerPayouts.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] font-bold text-zinc-500 block">
            Payable via Merchant UPI IDs
          </span>
        </div>

        {/* Total Active Merchants */}
        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Merchant Network</span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-white">{platformSummary.totalActiveMerchants}</p>
            <span className="text-xs font-bold text-emerald-400">Active</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 block">
            {platformSummary.totalMerchants} Registered • {platformSummary.totalCatalogSKUs} Total SKUs
          </span>
        </div>
      </div>

      {/* ── PHASE 2 EXPANSION ACTIVE BANNER ── */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-start md:items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
            <Layers size={24} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-white">Multi-Vendor Marketplace Expansion (Phase 2)</h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-black uppercase">
                ● LIVE & ACTIVE
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-400 max-w-2xl leading-relaxed">
              Fast-track apparel onboarding active. 3rd-party streetwear merchants sell directly without initial document lockouts — revenue payouts route directly to their verified UPI ID.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 self-stretch md:self-auto">
          <button
            onClick={handleCopyOnboardingLink}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            {copiedLink ? <Check size={16} className="text-black" /> : <Copy size={16} className="text-black" />}
            <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Merchant Registration Link"}</span>
          </button>
        </div>
      </div>

      {/* ── FILTERS & SEARCH BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-zinc-400 px-3">Status:</span>
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "suspended", label: "Suspended" },
              { key: "pending", label: "Pending" }
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setFilterStatus(st.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === st.key
                    ? "bg-white text-black shadow-sm font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white outline-none focus:border-white cursor-pointer"
          >
            {APPAREL_CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, phone, UPI, city..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* ── REAL SELLERS & REVENUE DIRECTORY TABLE ── */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400 font-bold text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-white mx-auto" />
            <p>Loading real-time merchant network & revenue balances...</p>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 font-bold text-xs space-y-2">
            <Building2 className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-white font-black text-sm">No Merchants Found</p>
            <p className="text-zinc-500">No merchant matches the selected status or search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="p-4 pl-6">Merchant & Brand</th>
                  <th className="p-4">Owner & Contact</th>
                  <th className="p-4">Payout UPI / PhonePe</th>
                  <th className="p-4">Gross Sales (GMV)</th>
                  <th className="p-4">Seller Net Payout</th>
                  <th className="p-4 text-center">Orders</th>
                  <th className="p-4 text-center">SKUs</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                {filteredSellers.map((seller) => {
                  const sName = seller.business_name || seller.full_name || "ZEBALPHA Store";
                  const sOwner = seller.owner_name || seller.full_name || "Rahul Adhikary";
                  const sUpi = seller.phonepay_no || seller.phonepay_number || seller.upi_id || (seller.mobile_number ? `${seller.mobile_number}@phonepe` : "Not provided");
                  const sCategory = seller.category || seller.business_category || "Luxury Clothing";
                  const isPrimary = seller.is_primary_brand;
                  const isSuspended = seller.is_suspended || (seller.account_status || "").toLowerCase() === "suspended";

                  return (
                    <tr key={seller.id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Merchant Brand */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                            {isPrimary ? (
                              <img src="/official-logo.png" alt={sName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{sName[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-white">{sName}</p>
                              {isPrimary ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                                  1st-Party
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase">
                                  3rd-Party
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-zinc-400 block mt-0.5 max-w-xs space-y-0.5">
                              <div>{sCategory} • 📍 {seller.primaryLoc?.city || seller.city || "—"} ({seller.primaryLoc?.pincode || seller.pincode || "—"})</div>
                              <div className="text-zinc-500 font-mono text-[9px] truncate">
                                Hub: {seller.primaryLoc?.location_name || seller.primaryLoc?.name || seller.pickup_location || "Main Warehouse"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Contact */}
                      <td className="p-4">
                        <p className="text-white font-bold">{sOwner}</p>
                        <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{seller.mobile_number || seller.email || "—"}</p>
                      </td>

                      {/* Payout UPI ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{sUpi}</span>
                          </div>
                          <button
                            onClick={() => handleCopyUpi(sUpi)}
                            className="text-zinc-500 hover:text-white p-1 transition-colors"
                            title="Copy UPI ID"
                          >
                            {copiedUpi === sUpi ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Gross Revenue */}
                      <td className="p-4 font-black text-white text-sm">
                        ₹{Number(seller.grossRevenue || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Net Seller Payout */}
                      <td className="p-4">
                        <span className="font-black text-emerald-400 text-sm">
                          ₹{Number(seller.netPayout || 0).toLocaleString("en-IN")}
                        </span>
                        {!isPrimary && (
                          <span className="text-[10px] text-zinc-500 block font-normal">
                            (10% Comm: ₹{Number(seller.adminCommission || 0).toLocaleString("en-IN")})
                          </span>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="p-4 text-center">
                        <span className="font-black text-white text-sm">{seller.totalOrdersCount}</span>
                        <span className="text-[10px] text-zinc-500 block">
                          {seller.deliveredCount} Delivered
                        </span>
                      </td>

                      {/* Active SKUs */}
                      <td className="p-4 text-center font-black text-white text-sm">
                        {seller.productsCount}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isSuspended
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? "bg-rose-400" : "bg-emerald-400"}`} />
                          {isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-6 space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedSeller(seller);
                            setDrawerTab("overview");
                          }}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                          title="View Full Seller Revenue & Performance Drawer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedSellerProducts(seller.sellerProducts || [])}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-zinc-800 transition-colors"
                          title="View Catalog Products"
                        >
                          <Package className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingSellerData({
                              id: seller.id,
                              business_name: seller.business_name || "",
                              owner_name: seller.owner_name || seller.full_name || "",
                              email: seller.email || "",
                              phone_number: seller.phone_number || seller.mobile_number || "",
                              upi_id: seller.upi_id || seller.phonepay_no || seller.phonepay_number || "",
                              category: seller.category || seller.business_category || "Polos & T-Shirts",
                              city: seller.city || seller.pickup_location || "",
                              pickup_location: seller.pickup_location || seller.city || "",
                              warehouse_address: seller.warehouse_address || seller.pickup_address || "",
                              account_status: seller.account_status || "Active"
                            });
                            setShowEditSellerModal(true);
                          }}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-blue-400 hover:bg-zinc-800 transition-colors"
                          title="Edit Merchant Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {!isPrimary && (
                          <button
                            onClick={() => {
                              if (isSuspended) {
                                handleReactivateSeller(seller.id);
                              } else {
                                setTargetSellerId(seller.id);
                                setShowSuspendModal(true);
                              }
                            }}
                            className={`p-2 rounded-xl transition-colors border ${
                              isSuspended
                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                            }`}
                            title={isSuspended ? "Reactivate Seller" : "Suspend Seller"}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 🌟 COMPREHENSIVE SELLER DETAILS DRAWER 🌟 ── */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-2xl h-full shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
            
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-700 text-white font-black text-xl flex items-center justify-center overflow-hidden shrink-0">
                    {selectedSeller.is_primary_brand ? (
                      <img src="/official-logo.png" alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      (selectedSeller.business_name || selectedSeller.full_name || "M")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {selectedSeller.business_name || selectedSeller.full_name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        selectedSeller.is_suspended 
                          ? "bg-rose-500/20 text-rose-400" 
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {selectedSeller.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Owner: {selectedSeller.owner_name || selectedSeller.full_name} • {selectedSeller.city || "Kolkata"}
                    </p>
                  </div>
                </div>

                <button onClick={() => setSelectedSeller(null)} className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900">
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-zinc-800/80 pt-4 pb-2">
                {[
                  { key: "overview", label: "Financial & Profile" },
                  { key: "products", label: `Catalog (${selectedSeller.sellerProducts?.length || 0})` },
                  { key: "orders", label: `Customer Orders (${selectedSeller.sellerOrders?.length || 0})` }
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDrawerTab(t.key as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      drawerTab === t.key
                        ? "bg-white text-black shadow-md"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB 1: FINANCIAL & PROFILE OVERVIEW */}
            {drawerTab === "overview" && (
              <div className="space-y-6 flex-1 text-xs">
                {/* Payout Routing Box */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CreditCard size={14} /> Direct Payout UPI Destination
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Instant Transfers</span>
                  </div>

                  <div className="flex items-center justify-between bg-black/50 p-3.5 rounded-2xl border border-zinc-800">
                    <span className="font-mono text-base font-black text-emerald-400 truncate">
                      {selectedSeller.phonepay_no || selectedSeller.phonepay_number || selectedSeller.upi_id || (selectedSeller.mobile_number ? `${selectedSeller.mobile_number}@phonepe` : "Not provided")}
                    </span>
                    <button
                      onClick={() => {
                        const target = selectedSeller.phonepay_no || selectedSeller.phonepay_number || selectedSeller.upi_id || (selectedSeller.mobile_number ? `${selectedSeller.mobile_number}@phonepe` : "");
                        if (target) handleCopyUpi(target);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      {copiedUpi ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedUpi ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Financial KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase text-zinc-400 font-bold block">Gross Sales (GMV)</span>
                    <p className="text-xl font-black text-white">
                      ₹{Number(selectedSeller.grossRevenue || 0).toLocaleString("en-IN")}
                    </p>
                    <span className="text-[10px] text-zinc-500">{selectedSeller.totalUnitsSold || 0} Units Sold</span>
                  </div>

                  <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase text-emerald-400 font-bold block">Seller Net Earnings</span>
                    <p className="text-xl font-black text-emerald-400">
                      ₹{Number(selectedSeller.netPayout || 0).toLocaleString("en-IN")}
                    </p>
                    <span className="text-[10px] text-zinc-500">Payable Balance</span>
                  </div>

                  <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase text-blue-400 font-bold block">Marketplace Commission</span>
                    <p className="text-xl font-black text-blue-400">
                      ₹{Number(selectedSeller.adminCommission || 0).toLocaleString("en-IN")}
                    </p>
                    <span className="text-[10px] text-zinc-500">{selectedSeller.is_primary_brand ? "0% (Direct)" : "10% Platform Cut"}</span>
                  </div>

                  <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase text-amber-400 font-bold block">Orders Fulfilled</span>
                    <p className="text-xl font-black text-white">
                      {selectedSeller.deliveredCount || 0} / {selectedSeller.totalOrdersCount || 0}
                    </p>
                    <span className="text-[10px] text-zinc-500">{selectedSeller.inTransitCount || 0} In-Transit</span>
                  </div>
                </div>

                {/* Comprehensive Merchant Profile Information */}
                <div className="p-4 bg-zinc-900/70 rounded-2xl border border-zinc-800 space-y-3 font-bold">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <p className="text-[10px] uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-black">
                      <Store size={13} className="text-purple-400" /> Merchant Identity & Registration
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      (selectedSeller.account_status || "Active").toLowerCase() === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
                      {selectedSeller.account_status || "Active"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">Store / Business Name</span>
                      <span className="text-white font-black">{selectedSeller.business_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">Owner / Full Name</span>
                      <span className="text-white font-bold">{selectedSeller.owner_name || selectedSeller.full_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">Registered Email</span>
                      <span className="text-white font-mono flex items-center gap-1">
                        {selectedSeller.email || "—"}
                        <span className="text-emerald-400 text-[9px]">✓ Verified</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">Contact Phone Number</span>
                      <span className="text-white font-mono">{selectedSeller.mobile_number || selectedSeller.phone_number || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">Business Category</span>
                      <span className="text-white">{selectedSeller.category || selectedSeller.business_category || "Apparel"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">GSTIN / Registration</span>
                      <span className="text-zinc-300 font-mono text-[11px]">{selectedSeller.gstin || "Unregistered / Composition"}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-zinc-800/60">
                      <span className="text-[10px] text-zinc-400 font-normal uppercase block">Verified Payout UPI / PhonePe</span>
                      <span className="text-emerald-400 font-mono text-xs font-bold">
                        {selectedSeller.phonepay_no || selectedSeller.phonepay_number || selectedSeller.upi_id || (selectedSeller.mobile_number ? `${selectedSeller.mobile_number}@phonepe` : "Not provided")}
                      </span>
                    </div>
                  </div>

                  {selectedSeller.created_at && (
                    <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono">
                      Joined: {new Date(selectedSeller.created_at).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>

                {/* All Registered Warehouse & Pickup Hubs */}
                <div className="p-4 bg-zinc-900/70 rounded-2xl border border-zinc-800 space-y-3 font-bold">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-black">
                    <MapPin size={13} className="text-emerald-400" /> Registered Pickup Hubs ({selectedSeller.pickupLocations?.length || 1})
                  </p>

                  {selectedSeller.pickupLocations && selectedSeller.pickupLocations.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSeller.pickupLocations.map((loc: any, idx: number) => (
                        <div key={loc.id || idx} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{loc.location_name || loc.name || `Warehouse Hub #${idx + 1}`}</span>
                              {loc.is_default && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase">
                                  Default Hub
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {loc.approval_status || "Approved"}
                            </span>
                          </div>

                          <div className="text-xs text-zinc-300 leading-relaxed space-y-0.5">
                            <p className="text-white font-bold">{loc.address_line1 || loc.address}</p>
                            {loc.address_line2 && loc.address_line2.trim().toLowerCase() !== (loc.address_line1 || "").trim().toLowerCase() && (
                              <p className="text-zinc-400">{loc.address_line2}</p>
                            )}
                            {loc.landmark && <p className="text-zinc-500 text-[11px]">Landmark: {loc.landmark}</p>}
                            <p className="text-zinc-300 font-bold">
                              {loc.city}, {loc.state} — <span className="font-mono text-white font-black">{loc.pincode}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                            <span>👤 {loc.contact_name || selectedSeller.owner_name || "Merchant"}</span>
                            <span>📞 {loc.contact_phone || loc.phone || selectedSeller.mobile_number}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="text-xs text-zinc-300 leading-relaxed space-y-1">
                        <p className="text-white font-bold">
                          {selectedSeller.warehouse_address || selectedSeller.pickup_address || "No address on file"}
                        </p>
                        <p className="text-zinc-300 font-bold">
                          {selectedSeller.city || "City"}, {selectedSeller.state || "State"} — <span className="font-mono text-white font-black">{selectedSeller.pincode || "—"}</span>
                        </p>
                      </div>
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <span>👤 {selectedSeller.owner_name || "Merchant"}</span>
                        <span>📞 {selectedSeller.mobile_number || selectedSeller.phone_number || "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SELLER PRODUCTS CATALOG */}
            {drawerTab === "products" && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                {(selectedSeller.sellerProducts || []).length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                    No products listed by this merchant.
                  </div>
                ) : (
                  (selectedSeller.sellerProducts || []).map((p: any) => (
                    <div key={p.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700 flex items-center justify-center">
                        {p.image_url || p.images?.[0] ? (
                          <img src={p.image_url || p.images?.[0]} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Shirt className="h-5 w-5 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{p.category || "Apparel"} • Stock: {p.stock ?? 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-400">₹{Number(p.price || 0).toLocaleString("en-IN")}</p>
                        <span className="text-[9px] font-black uppercase text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {p.status || "AVAILABLE"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: CUSTOMER ORDERS & LIVE DISPATCH TRACKING */}
            {drawerTab === "orders" && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                {(selectedSeller.sellerOrders || []).length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                    No customer orders placed for this merchant yet.
                  </div>
                ) : (
                  (selectedSeller.sellerOrders || []).map((ord: any) => {
                    const st = (ord.order_status || "placed").toLowerCase();
                    const awb = ord.tracking_number || ord.shipment_id || "AWB-PENDING";
                    const courier = ord.courier_name || "Delhivery Surface";

                    return (
                      <div key={ord.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-black text-white">#{ord.order_number || ord.id}</span>
                            <span className="text-[10px] text-zinc-500 block">
                              {new Date(ord.created_at).toLocaleDateString()} • {ord.customer_name || "Customer"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-400">₹{Number(ord.seller_order_amount || ord.total_amount || 0).toLocaleString("en-IN")}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full block mt-0.5 ${
                              st === "delivered" 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : ["shipped", "in_transit", "dispatched"].includes(st)
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}>
                              {ord.order_status || "Placed"}
                            </span>
                          </div>
                        </div>

                        {/* Live Dispatch Progress Bar */}
                        <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between text-zinc-400 font-bold">
                            <span className={st !== "cancelled" ? "text-emerald-400 font-black" : ""}>● Placed</span>
                            <span className={["ready_to_ship", "dispatched", "shipped", "in_transit", "delivered"].includes(st) ? "text-emerald-400 font-black" : ""}>➔ Packed</span>
                            <span className={["dispatched", "shipped", "in_transit", "delivered"].includes(st) ? "text-emerald-400 font-black" : ""}>➔ Dispatched</span>
                            <span className={st === "delivered" ? "text-emerald-400 font-black" : ""}>➔ Delivered</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                            <span>Courier: {courier}</span>
                            <span>AWB: {awb}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              {!selectedSeller.is_primary_brand && (
                <button
                  onClick={() => {
                    if (selectedSeller.is_suspended) {
                      handleReactivateSeller(selectedSeller.id);
                    } else {
                      setTargetSellerId(selectedSeller.id);
                      setShowSuspendModal(true);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedSeller.is_suspended
                      ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                  }`}
                >
                  {selectedSeller.is_suspended ? "Reactivate Merchant" : "Suspend Merchant"}
                </button>
              )}

              <button
                onClick={() => setSelectedSeller(null)}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-black hover:bg-zinc-200 transition-all shadow-md cursor-pointer ml-auto"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🌟 EDIT MERCHANT MODAL ── */}
      {showEditSellerModal && editingSellerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Merchant Settings</span>
                <h3 className="text-xl font-black text-white mt-0.5">Edit Merchant: {editingSellerData.business_name}</h3>
              </div>
              <button onClick={() => { setShowEditSellerModal(false); setEditingSellerData(null); }} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSellerEdit} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-zinc-300">Brand / Shop Name</label>
                <input
                  type="text"
                  required
                  value={editingSellerData.business_name}
                  onChange={(e) => setEditingSellerData({ ...editingSellerData, business_name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Owner / Designer Name</label>
                  <input
                    type="text"
                    required
                    value={editingSellerData.owner_name}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, owner_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Apparel Category</label>
                  <input
                    type="text"
                    value={editingSellerData.category}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, category: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={editingSellerData.phone_number}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, phone_number: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Email Address</label>
                  <input
                    type="email"
                    value={editingSellerData.email}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, email: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 flex items-center gap-1.5 text-emerald-400">
                  <CreditCard size={14} />
                  <span>Payout UPI ID / PhonePe / GPay Number</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingSellerData.upi_id}
                  onChange={(e) => setEditingSellerData({ ...editingSellerData, upi_id: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Dispatch City / Hub</label>
                  <input
                    type="text"
                    value={editingSellerData.city}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, city: e.target.value, pickup_location: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Account Status</label>
                  <select
                    value={editingSellerData.account_status}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, account_status: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300">Warehouse / Pickup Address</label>
                <textarea
                  rows={2}
                  value={editingSellerData.warehouse_address}
                  onChange={(e) => setEditingSellerData({ ...editingSellerData, warehouse_address: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditSellerModal(false); setEditingSellerData(null); }}
                  className="flex-1 py-3 rounded-2xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-wider hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 🌟 SUSPEND SELLER MODAL ── */}
      {showSuspendModal && targetSellerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="bg-zinc-950 border border-rose-900/50 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Security & Enforcement</span>
                <h3 className="text-base font-black text-white">Suspend Merchant Account</h3>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Suspending this merchant will immediately disable their catalog modifications, block new product publishing, and flag their account across the marketplace.
            </p>

            <div className="space-y-1.5 text-xs font-bold">
              <label className="text-zinc-300">Mandatory Suspension Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Policy non-compliance, fabric standard failure, or unfulfilled dispatches..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-white text-xs outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowSuspendModal(false); setTargetSellerId(null); setSuspensionReason(""); }}
                className="flex-1 py-3 rounded-2xl border border-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-900 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🌟 SELLER PRODUCTS MODAL PREVIEW ── */}
      {selectedSellerProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Live Catalog</span>
                <h3 className="text-xl font-black text-white mt-0.5">Apparel Listings ({selectedSellerProducts.length})</h3>
              </div>
              <button onClick={() => setSelectedSellerProducts(null)} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {selectedSellerProducts.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-bold text-xs">
                No active apparel listings found for this merchant.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                {selectedSellerProducts.map((p) => (
                  <div key={p.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex gap-3 items-center">
                    <div className="h-14 w-14 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                      {p.image_url || p.images?.[0] ? (
                        <img src={p.image_url || p.images?.[0]} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-500 text-xs">No Img</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white truncate">{p.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{p.category || "Apparel"}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs font-black text-emerald-400">₹{Number(p.price || 0).toLocaleString("en-IN")}</span>
                        <span className="text-[10px] font-bold text-zinc-400">Stock: {p.stock ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSellerProducts(null)}
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black cursor-pointer"
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

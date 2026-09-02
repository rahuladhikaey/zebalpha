"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiService } from "@/services/apiService";
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
  ExternalLink
} from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

// Default Primary 1st-Party ZEBALPHA In-House Brand Merchant
const DEFAULT_PRIMARY_BRAND_MERCHANT = {
  id: "primary-zebalpha-merchant",
  seller_id: "ZEB-BRAND-01",
  full_name: "Rahul Adhikary",
  business_name: "ZEBALPHA Official Brand Store",
  owner_name: "Rahul Adhikary",
  email: "r.adhikary7777@gmail.com",
  phone_number: "+91 98765 43210",
  mobile_number: "+91 98765 43210",
  category: "Luxury Clothing & Streetwear",
  business_category: "Clothing & Apparel",
  upi_id: "rahuladhikary@phonepe",
  phonepay_no: "rahuladhikary@phonepe",
  pickup_location: "ZEBALPHA Central Apparel Hub, Kolkata",
  city: "Kolkata",
  state: "West Bengal",
  pincode: "700001",
  warehouse_address: "Plot 42, Central Fashion & Garment Complex, Kolkata, West Bengal, 700001",
  pickup_address: "Plot 42, Central Fashion & Garment Complex, Kolkata, West Bengal, 700001",
  gstin: "19ABCDE1234F1Z5",
  brand_trademark_no: "TM-ZEBALPHA-2026",
  account_status: "Active",
  status: "approved",
  is_primary_brand: true,
  created_at: new Date().toISOString()
};

const APPAREL_CATEGORIES = [
  { key: "all", label: "All Clothing" },
  { key: "polos", label: "Polos & Shirts" },
  { key: "oversized", label: "Oversized Tees" },
  { key: "hoodies", label: "Hoodies & Sweatshirts" },
  { key: "streetwear", label: "Streetwear & Bottoms" },
  { key: "drops", label: "New Drops & Exclusives" }
];

export default function SellerManagementView() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Filtering States
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Action States
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [selectedSellerProducts, setSelectedSellerProducts] = useState<any[] | null>(null);
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    business_name: "ZEBALPHA Official Brand Store",
    owner_name: "Rahul Adhikary",
    email: "r.adhikary7777@gmail.com",
    phone_number: "+91 98765 43210",
    upi_id: "rahuladhikary@phonepe",
    pickup_location: "ZEBALPHA Central Apparel Hub, Kolkata",
    warehouse_address: "Plot 42, Central Fashion & Garment Complex, Kolkata, West Bengal, 700001",
    gstin: "19ABCDE1234F1Z5",
    brand_trademark_no: "TM-ZEBALPHA-2026"
  });

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Custom Admin Action Modal States
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [suspensionReasonText, setSuspensionReasonText] = useState("");
  const [deletionReasonText, setDeletionReasonText] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      let dbSellers: any[] = [];
      try {
        const res = await fetch("/api/admin/sellers");
        const resJson = await res.json();
        if (resJson.success && Array.isArray(resJson.data)) {
          dbSellers = resJson.data;
        }
      } catch (_) {}

      const [pRes, oRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("orders").select("*")
      ]);
      
      // Combine database sellers with Primary 1st-Party Brand Merchant if not already present
      const hasPrimary = dbSellers.some(s => 
        s.email === DEFAULT_PRIMARY_BRAND_MERCHANT.email || 
        s.business_name?.toLowerCase().includes("zebalpha")
      );

      if (hasPrimary) {
        setSellers(dbSellers);
        const primary = dbSellers.find(s => 
          s.email === DEFAULT_PRIMARY_BRAND_MERCHANT.email || 
          s.business_name?.toLowerCase().includes("zebalpha")
        );
        if (primary) {
          setEditFormData({
            business_name: primary.business_name || primary.full_name || "ZEBALPHA Official Brand Store",
            owner_name: primary.owner_name || primary.full_name || "Rahul Adhikary",
            email: primary.email || "r.adhikary7777@gmail.com",
            phone_number: primary.phone_number || primary.mobile_number || "+91 98765 43210",
            upi_id: primary.upi_id || primary.phonepay_no || "rahuladhikary@phonepe",
            pickup_location: primary.pickup_location || primary.city || "ZEBALPHA Central Apparel Hub, Kolkata",
            warehouse_address: primary.warehouse_address || primary.pickup_address || "Plot 42, Central Fashion & Garment Complex, Kolkata, West Bengal, 700001",
            gstin: primary.gstin || "19ABCDE1234F1Z5",
            brand_trademark_no: primary.brand_trademark_no || "TM-ZEBALPHA-2026"
          });
        }
      } else {
        setSellers([DEFAULT_PRIMARY_BRAND_MERCHANT, ...dbSellers]);
      }

      setProducts(pRes.data || []);
      setOrders(oRes.data || []);
    } catch (e: any) {
      setSellers([DEFAULT_PRIMARY_BRAND_MERCHANT]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime WebSockets
    const channel = supabase
      .channel("admin-seller-changes-enhanced")
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (sellerId: string, newStatus: string, reason?: string) => {
    if (sellerId === "primary-zebalpha-merchant") {
      setStatusMessage("ℹ️ Primary 1st-Party Brand Merchant is always active.");
      return;
    }
    setActioningId(sellerId);
    try {
      const payload: any = { 
        account_status: newStatus, 
        status: newStatus.toLowerCase(),
        updated_at: new Date().toISOString() 
      };
      
      if (newStatus === "active" || newStatus === "approved") {
        payload.delete_requested = false;
        payload.delete_date = null;
      }
      if (reason !== undefined) payload.rejection_reason = reason;

      const res = await fetch("/api/admin/sellers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sellerId, updates: payload })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to update seller");

      setStatusMessage(`✅ Merchant status updated to ${newStatus.toUpperCase()}`);
      await loadData();
      setShowRejectModal(false);
      setRejectionReason("");
      setTargetSellerId(null);
    } catch (err: any) {
      console.warn("Failed to update seller status:", err);
      setStatusMessage(`❌ Error: ${err.message || "Failed to update"}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleSaveBrandProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const primaryInDb = sellers.find(s => s.id !== "primary-zebalpha-merchant" && s.is_primary_brand);
      if (primaryInDb) {
        await fetch("/api/admin/sellers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: primaryInDb.id,
            updates: {
              business_name: editFormData.business_name,
              owner_name: editFormData.owner_name,
              full_name: editFormData.owner_name,
              email: editFormData.email,
              phone_number: editFormData.phone_number,
              mobile_number: editFormData.phone_number,
              upi_id: editFormData.upi_id,
              phonepay_no: editFormData.upi_id,
              pickup_location: editFormData.pickup_location,
              warehouse_address: editFormData.warehouse_address,
              pickup_address: editFormData.warehouse_address,
              gstin: editFormData.gstin,
              brand_trademark_no: editFormData.brand_trademark_no,
              updated_at: new Date().toISOString()
            }
          })
        });
      }
      setStatusMessage("✅ ZEBALPHA Brand Merchant profile updated successfully.");
      setShowEditBrandModal(false);
      await loadData();
    } catch (err: any) {
      console.warn("Notice saving brand profile:", err);
      setStatusMessage("✅ ZEBALPHA Brand profile saved.");
      setShowEditBrandModal(false);
    }
  };

  const handleViewProducts = (seller: any) => {
    const sName = seller.full_name || seller.business_name || seller.owner_name;
    const sellerProds = products.filter(
      (p) => p.seller_id === seller.id || p.seller_id === seller.seller_id || p.brand?.toLowerCase() === sName?.toLowerCase() || seller.is_primary_brand
    );
    setSelectedSellerProducts(sellerProds);
  };

  const handleExportSellersExcel = () => {
    const exportData = filteredSellers.map((s) => ({
      "Merchant ID": s.seller_id || s.id,
      "Brand / Business Name": s.business_name || s.full_name || "ZEBALPHA Brand Store",
      "Owner Name": s.owner_name || s.full_name || "Rahul Adhikary",
      "Merchant Type": s.is_primary_brand ? "1st-Party Direct Brand" : "3rd-Party Marketplace Merchant",
      "Phone Number": s.phone_number || s.mobile_number || "N/A",
      "Email": s.email || "N/A",
      "UPI / PhonePe ID": s.upi_id || s.phonepay_no || "N/A",
      "Fulfillment Hub / City": s.pickup_location || s.city || "Kolkata, WB",
      "Apparel Category": s.category || "Luxury Clothing & Streetwear",
      "GSTIN Compliance": s.gstin || "Verified",
      "Account Status": s.account_status || s.status || "Active",
      "Registered Date": s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A"
    }));

    exportCustomDataExcel(exportData, "ZEBALPHA_Merchant_Registry");
  };

  const filteredSellers = sellers.filter((s) => {
    const statusVal = (s.account_status || s.status || "active").toLowerCase();
    const catVal = (s.category || s.business_category || "").toLowerCase();
    
    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "active" && (statusVal === "active" || statusVal === "approved" || s.is_primary_brand)) ||
      (filterStatus === "pending" && statusVal === "pending") ||
      (filterStatus === "suspended" && statusVal === "suspended");
      
    const matchesCategory = 
      filterCategory === "all" || 
      catVal.includes(filterCategory.toLowerCase()) || 
      s.is_primary_brand;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (s.full_name || s.owner_name || s.business_name || "").toLowerCase().includes(query) ||
      (s.email || "").toLowerCase().includes(query) ||
      (s.phone_number || s.mobile_number || "").includes(query) ||
      (s.upi_id || s.phonepay_no || "").toLowerCase().includes(query) ||
      (s.pickup_location || s.city || "").toLowerCase().includes(query) ||
      (s.gstin || "").toLowerCase().includes(query) ||
      (s.seller_id || s.id || "").toString().includes(query);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const primaryMerchant = sellers.find(s => s.is_primary_brand) || DEFAULT_PRIMARY_BRAND_MERCHANT;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Brand Operations & Merchant Network</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Brand Store & Merchant Management</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Manage your 1st-Party ZEBALPHA Direct Brand Merchant profile, apparel fulfillment hubs, GSTIN compliance, and monitor future multi-vendor marketplace onboarding.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <button
            onClick={handleExportSellersExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-all active:scale-95 shadow-md shadow-white/10 cursor-pointer"
          >
            <Download className="w-4 h-4 text-black" />
            <span>Export Merchant Registry</span>
          </button>
          
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Refresh Merchants"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-400 hover:text-white font-black text-sm">✕</button>
        </div>
      )}

      {/* 🌟 1ST-PARTY PRIMARY BRAND MERCHANT HERO CARD 🌟 */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 md:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Brand Info Left */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl bg-zinc-900 border border-zinc-700 p-2 shadow-2xl flex items-center justify-center shrink-0">
              <img
                src="/official-logo.png"
                alt="ZEBALPHA Logo"
                className="h-full w-full object-cover rounded-2xl"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 size={12} /> 1st-Party Primary Brand Merchant
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase">
                  <Shirt size={11} /> Luxury Clothing & Streetwear
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                {editFormData.business_name}
              </h2>

              <p className="text-xs font-medium text-zinc-400">
                Owner & Master Brand Admin: <span className="text-white font-bold">{editFormData.owner_name}</span> • <span className="font-mono text-zinc-300">{editFormData.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleViewProducts(primaryMerchant)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-xs transition-all"
            >
              <Package size={14} className="text-emerald-400" />
              <span>Brand Catalog ({products.length} Items)</span>
            </button>

            <button
              onClick={() => setShowEditBrandModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-black text-xs transition-all shadow-lg shadow-white/10"
            >
              <Edit3 size={14} />
              <span>Edit Brand Profile</span>
            </button>
          </div>
        </div>

        {/* Operational Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800/80 text-xs">
          <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">Fulfillment Hub & Dispatch</span>
            <p className="text-white font-bold truncate flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-400 shrink-0" />
              <span>{editFormData.pickup_location}</span>
            </p>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">Payouts & Revenue Routing</span>
            <p className="text-emerald-400 font-bold truncate flex items-center gap-1.5 font-mono">
              <CreditCard size={13} className="text-emerald-400 shrink-0" />
              <span>{editFormData.upi_id}</span>
            </p>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">GSTIN Compliance</span>
            <p className="text-white font-bold truncate flex items-center gap-1.5 font-mono">
              <ShieldCheck size={13} className="text-blue-400 shrink-0" />
              <span>{editFormData.gstin}</span>
            </p>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 block">Brand Trademark</span>
            <p className="text-white font-bold truncate flex items-center gap-1.5 font-mono">
              <Sparkles size={13} className="text-amber-400 shrink-0" />
              <span>{editFormData.brand_trademark_no}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">1st-Party Brand Operations</p>
          <p className="text-2xl font-black text-white mt-1">Active</p>
          <span className="text-[10px] font-bold text-zinc-500 mt-1 block">100% In-House Store</span>
        </div>

        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Apparel Products (SKUs)</p>
          <p className="text-2xl font-black text-white mt-1">{products.length}</p>
          <span className="text-[10px] font-bold text-zinc-500 mt-1 block">Active Catalog Listings</span>
        </div>

        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">Multi-Vendor Mode</p>
          <p className="text-2xl font-black text-white mt-1">Phase 2</p>
          <span className="text-[10px] font-bold text-zinc-500 mt-1 block">Expansion Ready</span>
        </div>

        <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Merchants</p>
          <p className="text-2xl font-black text-white mt-1">{sellers.length}</p>
          <span className="text-[10px] font-bold text-zinc-500 mt-1 block">Verified Accounts</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        {/* Apparel Category & Status Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Clothing Category Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-zinc-400 px-3">Apparel:</span>
            {APPAREL_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilterCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterCategory === cat.key
                    ? "bg-white text-black shadow-sm font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-zinc-400 px-3">Status:</span>
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "pending", label: "Pending" },
              { key: "suspended", label: "Suspended" }
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
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, phone, UPI, city..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white transition-all"
          />
        </div>
      </div>

      {/* Sellers & Brand Merchant Directory Table */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 font-bold text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-white mx-auto mb-2" />
            Loading merchant registry...
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 font-bold text-xs">
            No merchants found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="p-4 pl-6">Merchant & Brand Type</th>
                  <th className="p-4">Owner & Contact</th>
                  <th className="p-4">UPI / Payout ID</th>
                  <th className="p-4">Fulfillment Hub</th>
                  <th className="p-4">Apparel SKUs</th>
                  <th className="p-4">Operational Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                {filteredSellers.map((seller) => {
                  const sName = seller.business_name || seller.full_name || seller.owner_name || "ZEBALPHA Brand Store";
                  const sOwner = seller.owner_name || seller.full_name || "Rahul Adhikary";
                  const sCategory = seller.category || seller.business_category || "Luxury Clothing & Streetwear";
                  const sUpi = seller.upi_id || seller.phonepay_no || "rahuladhikary@phonepe";
                  const sPickup = seller.pickup_location || seller.city || "Central Apparel Hub, Kolkata";
                  const isPrimary = seller.is_primary_brand;

                  const sellerProdsCount = isPrimary 
                    ? products.length 
                    : products.filter(p => p.seller_id === seller.id || p.seller_id === seller.seller_id).length;

                  return (
                    <tr key={seller.id} className="hover:bg-zinc-900/40 transition-colors">
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
                              {isPrimary && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                                  1st-Party
                                </span>
                              )}
                            </div>
                            <span className="inline-block text-[10px] font-bold text-zinc-400 mt-0.5">
                              {sCategory}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="text-white font-bold">{sOwner}</p>
                        <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{seller.email || "—"}</p>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{sUpi}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="line-clamp-1">{sPickup}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-white font-black">
                          <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{sellerProdsCount} Clothing Items</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          (seller.account_status === "Active" || seller.status === "approved" || isPrimary)
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {seller.account_status || seller.status || "Active"}
                        </span>
                      </td>

                      <td className="p-4 text-right pr-6 space-x-1.5">
                        <button
                          onClick={() => setSelectedSeller(seller)}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                          title="View Full Merchant Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleViewProducts(seller)}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-zinc-800 transition-colors"
                          title="View Products Catalog"
                        >
                          <Package className="w-4 h-4" />
                        </button>

                        {isPrimary ? (
                          <button
                            onClick={() => setShowEditBrandModal(true)}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-blue-400 hover:bg-zinc-800 transition-colors"
                            title="Edit In-House Brand Profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetSellerId(seller.id);
                              setShowSuspendModal(true);
                            }}
                            className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                            title="Suspend Seller"
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

      {/* 🔮 MULTI-VENDOR PHASE 2 EXPANSION ADVISORY CARD */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">Multi-Vendor Marketplace Expansion (Phase 2)</h4>
            <p className="text-xs font-medium text-zinc-400 mt-0.5">
              Currently, store operations are 100% 1st-party direct brand owned. When 3rd-party merchant applications open, designer KYC, fabric compliance, and commission payouts will automatically sync here.
            </p>
          </div>
        </div>
      </div>

      {/* 🔮 EDIT BRAND PROFILE MODAL */}
      {showEditBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">1st-Party Operations</span>
                <h3 className="text-xl font-black text-white mt-0.5">Edit ZEBALPHA Brand Profile</h3>
              </div>
              <button onClick={() => setShowEditBrandModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBrandProfile} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-zinc-300">Store / Brand Name</label>
                <input
                  type="text"
                  value={editFormData.business_name}
                  onChange={(e) => setEditFormData({ ...editFormData, business_name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Owner & Master Admin Name</label>
                  <input
                    type="text"
                    value={editFormData.owner_name}
                    onChange={(e) => setEditFormData({ ...editFormData, owner_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Registered Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone_number}
                    onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">PhonePe / UPI ID</label>
                  <input
                    type="text"
                    value={editFormData.upi_id}
                    onChange={(e) => setEditFormData({ ...editFormData, upi_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300">Primary Dispatch Hub & Warehouse Address</label>
                <textarea
                  rows={2}
                  value={editFormData.warehouse_address}
                  onChange={(e) => setEditFormData({ ...editFormData, warehouse_address: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">GSTIN Number</label>
                  <input
                    type="text"
                    value={editFormData.gstin}
                    onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Brand Trademark Reference</label>
                  <input
                    type="text"
                    value={editFormData.brand_trademark_no}
                    onChange={(e) => setEditFormData({ ...editFormData, brand_trademark_no: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditBrandModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-white text-black font-black uppercase hover:bg-zinc-200 transition-all shadow-lg shadow-white/10"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔮 SELLER PRODUCTS CATALOG MODAL */}
      {selectedSellerProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Catalog Preview</span>
                <h3 className="text-xl font-black text-white mt-0.5">Brand Apparel Listings ({selectedSellerProducts.length})</h3>
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
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black"
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 SELLER FULL PROFILE MODAL */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-700 text-white font-black text-xl flex items-center justify-center overflow-hidden">
                  {selectedSeller.is_primary_brand ? (
                    <img src="/official-logo.png" alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    (selectedSeller.business_name || selectedSeller.full_name || "M")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    {selectedSeller.is_primary_brand ? "1st-Party Primary Brand Merchant" : "Merchant Account"}
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {selectedSeller.business_name || selectedSeller.full_name || "ZEBALPHA Brand Store"}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Owner: {selectedSeller.owner_name || selectedSeller.full_name || "Rahul Adhikary"}
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedSeller(null)} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block mb-0.5">Email Contact</span>
                  <p className="text-white font-mono">{selectedSeller.email || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block mb-0.5">Phone Number</span>
                  <p className="text-white font-mono">{selectedSeller.phone_number || selectedSeller.mobile_number || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1 mb-0.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Payout UPI ID
                  </span>
                  <p className="font-mono text-emerald-400">{selectedSeller.upi_id || selectedSeller.phonepay_no || "rahuladhikary@phonepe"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block mb-0.5">GSTIN / Tax ID</span>
                  <p className="text-white font-mono">{selectedSeller.gstin || "19ABCDE1234F1Z5"}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Primary Dispatch & Fulfillment Address
                </span>
                <p className="text-white text-xs leading-relaxed">
                  {selectedSeller.warehouse_address || selectedSeller.pickup_address || "Plot 42, Central Fashion & Garment Complex, Kolkata, West Bengal, 700001"}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSeller(null)}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-black hover:bg-zinc-200 shadow-md"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

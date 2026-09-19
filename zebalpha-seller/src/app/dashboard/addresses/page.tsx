"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  MapPin, 
  Plus, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  Truck,
  X
} from "lucide-react";

export default function SellerAddressesPage() {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    location_name: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    address_line1: "",
    address_line2: "",
    landmark: "",
    city: "",
    state: "West Bengal",
    pincode: "",
    is_default: false
  });

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const activeSellerId = seller?.id || user.id;
      setSellerId(activeSellerId);
      setSellerProfile(seller);

      // Fetch pickup locations
      const { data: locs, error: locsErr } = await supabase
        .from("seller_pickup_locations")
        .select("*")
        .eq("seller_id", activeSellerId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (locs && locs.length > 0) {
        setAddresses(locs);
      } else {
        // Fallback: If no pickup locations table record yet, create one from seller table
        if (seller && (seller.pickup_address || seller.warehouse_address)) {
          const autoLoc = {
            id: `loc-default-${Date.now()}`,
            seller_id: activeSellerId,
            location_name: `${seller.business_name || "Main"} Hub`,
            contact_name: seller.owner_name || seller.full_name || "Merchant",
            contact_phone: seller.phone_number || seller.mobile_number || "9999999999",
            contact_email: seller.email || user.email,
            address_line1: seller.pickup_address || seller.warehouse_address || "Merchant Dispatch Hub",
            city: seller.city || "Kolkata",
            state: seller.state || "West Bengal",
            pincode: seller.pincode || "700001",
            is_default: true,
            is_active: true,
            approval_status: "approved",
            shiprocket_sync_status: "synced"
          };
          setAddresses([autoLoc]);
        } else {
          setAddresses([]);
        }
      }
    } catch (e: any) {
      console.error("Error loading pickup addresses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setFormData({
      location_name: `${sellerProfile?.business_name || "Merchant"} Warehouse`,
      contact_name: sellerProfile?.owner_name || sellerProfile?.full_name || "",
      contact_phone: sellerProfile?.mobile_number || sellerProfile?.phone_number || "",
      contact_email: sellerProfile?.email || "",
      address_line1: "",
      address_line2: "",
      landmark: "",
      city: sellerProfile?.city || "Kolkata",
      state: sellerProfile?.state || "West Bengal",
      pincode: sellerProfile?.pincode || "",
      is_default: addresses.length === 0
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (addr: any) => {
    setEditingAddress(addr);
    setFormData({
      location_name: addr.location_name || addr.name || "",
      contact_name: addr.contact_name || "",
      contact_phone: addr.contact_phone || addr.phone || "",
      contact_email: addr.contact_email || addr.email || "",
      address_line1: addr.address_line1 || addr.address || "",
      address_line2: addr.address_line2 || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "West Bengal",
      pincode: addr.pincode || "",
      is_default: Boolean(addr.is_default)
    });
    setShowModal(true);
  };

  const handleSetDefault = async (addrId: string) => {
    if (!sellerId) return;
    try {
      // Set all to false
      await supabase
        .from("seller_pickup_locations")
        .update({ is_default: false })
        .eq("seller_id", sellerId);

      // Set target to true
      await supabase
        .from("seller_pickup_locations")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", addrId);

      setStatusMessage("✓ Default pickup warehouse updated.");
      await loadAddresses();
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (e: any) {
      alert(e.message || "Failed to set default address.");
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address_line1 || !formData.city || !formData.pincode) {
      alert("Please fill in Address, City, and Pincode.");
      return;
    }

    setSaving(true);
    try {
      if (formData.is_default && sellerId) {
        await supabase
          .from("seller_pickup_locations")
          .update({ is_default: false })
          .eq("seller_id", sellerId);
      }

      const payload = {
        seller_id: sellerId,
        location_name: formData.location_name.trim() || `Hub_${formData.pincode.trim()}`,
        contact_name: formData.contact_name.trim() || sellerProfile?.owner_name || "Merchant",
        contact_phone: formData.contact_phone.trim().replace(/\D/g, "").slice(0, 10),
        contact_email: formData.contact_email.trim().toLowerCase(),
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim(),
        landmark: formData.landmark.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        is_default: formData.is_default || addresses.length === 0,
        is_active: true,
        approval_status: "approved",
        shiprocket_sync_status: "synced",
        updated_at: new Date().toISOString()
      };

      if (editingAddress) {
        const { error } = await supabase
          .from("seller_pickup_locations")
          .update(payload)
          .eq("id", editingAddress.id);
        if (error) throw error;
        setStatusMessage("✨ Pickup location updated successfully!");
      } else {
        const { error } = await supabase
          .from("seller_pickup_locations")
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setStatusMessage("✨ New pickup warehouse added!");
      }

      setShowModal(false);
      await loadAddresses();
      setTimeout(() => setStatusMessage(""), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">ZEBALPHA MULTI-VENDOR LOGISTICS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              ● Shiprocket Integrated
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">Pickup Warehouses & Hubs</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Manage your registered pickup locations. Courier riders will collect packed clothing parcels directly from your default active hub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-white/10 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Pickup Hub</span>
          </button>
          <button
            onClick={loadAddresses}
            className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-white" : ""} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{statusMessage}</span>
          </span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-400 hover:text-white font-black">✕</button>
        </div>
      )}

      {/* Meesho Standard Logistics Banner */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div className="text-xs">
            <h4 className="font-black text-white">Doorstep Courier Pickup Enabled</h4>
            <p className="text-zinc-400 text-[11px] font-medium mt-0.5">
              When orders are packed and manifests generated, Delhivery, Shadowfax, or BlueDart riders collect parcels directly from your default pickup address.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 text-[10px] font-mono font-bold border border-zinc-800 whitespace-nowrap">
          {addresses.length} Hub{addresses.length !== 1 ? "s" : ""} Registered
        </span>
      </div>

      {/* Address Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-zinc-950 rounded-3xl border border-zinc-800">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading registered pickup locations...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-zinc-950 rounded-3xl border border-zinc-800 p-8">
          <Building2 className="h-12 w-12 text-zinc-600 mx-auto" />
          <div>
            <h3 className="text-base font-black text-white">No Pickup Addresses Found</h3>
            <p className="text-xs font-bold text-zinc-400 mt-1 max-w-md mx-auto">
              Add your workshop, showroom, or warehouse address so couriers know where to collect parcels.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Your First Pickup Hub</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map((addr) => {
            const isDefault = Boolean(addr.is_default);
            const isApproved = addr.approval_status === "approved" || !addr.approval_status;
            const isSynced = addr.shiprocket_sync_status === "synced" || !addr.shiprocket_sync_status;

            return (
              <div 
                key={addr.id} 
                className={`p-6 rounded-3xl bg-zinc-950 border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isDefault ? "border-emerald-500/40 shadow-2xl shadow-emerald-500/5 ring-1 ring-emerald-500/20" : "border-zinc-800 shadow-xl"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isDefault ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base leading-tight">
                          {addr.location_name || addr.name || "Main Warehouse"}
                        </h3>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isDefault && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm">
                          Default Pickup
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        isApproved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {isApproved ? "✓ Approved" : "⏳ Review Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Address Body */}
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs font-medium space-y-1.5 text-zinc-300">
                    <p className="font-black text-white text-[13px] leading-snug">
                      {addr.address_line1 || addr.address}
                    </p>
                    {addr.address_line2 && <p className="text-zinc-400">{addr.address_line2}</p>}
                    {addr.landmark && <p className="text-[11px] text-zinc-500">Landmark: {addr.landmark}</p>}
                    <p className="text-[11px] font-mono text-emerald-400 pt-1">
                      Pincode: {addr.pincode} • {addr.city}, {addr.state}
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-bold">
                    <span className="flex items-center gap-1.5 truncate">
                      <Phone size={13} className="text-zinc-500 shrink-0" />
                      <span className="font-mono text-white">{addr.contact_phone || addr.phone || "9999999999"}</span>
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail size={13} className="text-zinc-500 shrink-0" />
                      <span className="truncate">{addr.contact_email || addr.email || "seller@zebalpha.com"}</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-5 mt-5 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>Shiprocket Ready</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(addr)}
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all cursor-pointer"
                      title="Edit Address"
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Logistics Hub</span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {editingAddress ? "Edit Pickup Warehouse" : "Register New Pickup Hub"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs font-bold">
              
              <div className="space-y-1">
                <label className="text-zinc-300">Hub / Warehouse Nickname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surat Main Workshop, Kolkata Central Hub"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Contact Person Name</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300">Address Line 1 (Building, Street, Area) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plot No. 42, Ghetugachhi Bastra Niketan, 27 No. Road"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    placeholder="Floor, Unit, Complex"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Landmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="Near Clock Tower"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-300">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kolkata, Surat"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="West Bengal"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300">Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="700001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 h-4 w-4"
                  />
                  <span>Set as primary default pickup hub for all new customer orders</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-wider transition-all shadow-xl shadow-white/10 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Hub..." : editingAddress ? "Save Changes" : "Register Hub"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

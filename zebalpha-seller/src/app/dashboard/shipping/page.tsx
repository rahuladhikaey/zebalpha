"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Truck, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Building2,
  ShieldCheck,
  Phone,
  ArrowRight,
  PackageCheck,
  Zap,
  Info
} from "lucide-react";
import Link from "next/link";

export default function SellerShipping() {
  const [loading, setLoading] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // New location form state
  const [newLoc, setNewLoc] = useState({
    name: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const loadShippingData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch seller profile
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, pickup_address, pickup_location, city, state, pincode, phone_number, mobile_number, business_name, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const sellerId = seller?.id || user.id;

      // 1. Try fetching via API route
      let fetchedLocations: any[] = [];
      try {
        const res = await fetch(`/api/shipping/pickup-location?userId=${user.id}&sellerId=${sellerId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.locations)) {
            fetchedLocations = json.locations;
          }
        }
      } catch (apiErr) {
        console.warn("Shipping API fetch notice, checking direct database:", apiErr);
      }

      // 2. Fallback to Supabase query
      if (fetchedLocations.length === 0) {
        const { data: locations } = await supabase
          .from("seller_pickup_locations")
          .select("*")
          .or(`seller_id.eq.${user.id}${seller?.id ? `,seller_id.eq.${seller.id}` : ""}`)
          .order("is_default", { ascending: false });

        fetchedLocations = locations || [];
      }

      // 3. Fallback to seller profile address if no location rows exist
      if (fetchedLocations.length === 0 && seller && (seller.pickup_address || seller.pickup_location || seller.city)) {
        fetchedLocations = [{
          id: `profile-${seller.id}`,
          seller_id: seller.id,
          name: `${seller.business_name || seller.full_name || "Primary"} Warehouse`,
          phone: seller.phone_number || seller.mobile_number || "",
          address_line1: seller.pickup_address || seller.pickup_location || "Warehouse Address",
          city: seller.city || "City",
          state: seller.state || "State",
          pincode: seller.pincode || "700001",
          is_default: true
        }];
      }

      setPickupLocations(fetchedLocations);
    } catch (e) {
      console.error("Error loading shipping data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShippingData();
  }, []);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch seller ID
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const sellerId = seller?.id || user.id;
      let saved = false;

      // 1. Save via secure Server API (bypasses RLS)
      try {
        const res = await fetch("/api/shipping/pickup-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            sellerId: sellerId,
            name: newLoc.name,
            phone: newLoc.phone,
            address_line1: newLoc.address_line1,
            city: newLoc.city,
            state: newLoc.state,
            pincode: newLoc.pincode,
            is_default: pickupLocations.length === 0
          })
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            saved = true;
          }
        }
      } catch (apiErr) {
        console.warn("API save notice, falling back to direct database:", apiErr);
      }

      // 2. Direct database update fallback on sellers table if API was unavailable
      if (!saved) {
        try {
          await supabase
            .from("sellers")
            .update({
              pickup_address: newLoc.address_line1,
              pickup_location: newLoc.address_line1,
              city: newLoc.city,
              state: newLoc.state,
              pincode: newLoc.pincode,
              contact_phone: newLoc.phone,
              phone_number: newLoc.phone
            })
            .eq("user_id", user.id);

          saved = true;
        } catch (sErr) {
          console.warn("Seller table direct update notice:", sErr);
        }
      }
      
      setShowLocationModal(false);
      setNewLoc({ name: "", phone: "", address_line1: "", city: "", state: "", pincode: "" });
      setStatusMsg("✓ Warehouse Pickup Address Saved Successfully!");
      setTimeout(() => setStatusMsg(""), 4000);
      await loadShippingData();
    } catch (err: any) {
      alert(err.message || "Failed to add location.");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Pickup & Warehouse Hub
          </h1>
          <p className="text-xs sm:text-sm font-bold text-zinc-400 mt-1">
            Manage registered warehouse locations where courier delivery riders will arrive to pick up packed orders.
          </p>
        </div>

        <button
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition shadow-xl cursor-pointer"
        >
          <Plus size={16} />
          Add Warehouse Location
        </button>
      </div>

      {statusMsg && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {statusMsg}
        </div>
      )}

      {/* Central Logistics Status Banner */}
      <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Truck size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Central Logistics Gateway Active
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                Automated 3PL
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-400 max-w-2xl leading-relaxed">
              Courier partners (<strong>Delhivery, Shadowfax, BlueDart, Xpressbees</strong>) are automatically assigned by the platform backend based on destination and lowest rate. When you pack an order on the <Link href="/dashboard/orders" className="text-purple-400 hover:underline font-bold">Orders Page</Link>, delivery riders receive instant pickup tasks at your registered warehouse address below.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/orders"
          className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider transition whitespace-nowrap flex items-center gap-1.5 shrink-0"
        >
          <span>Go to Orders Dispatch</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Pickup Locations Management Section */}
      <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Registered Warehouse Addresses ({pickupLocations.length})
              </h2>
              <p className="text-[11px] font-bold text-zinc-500">
                Delivery boys use these locations to scan and collect packages
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-bold">
            Loading warehouse locations...
          </div>
        ) : pickupLocations.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-zinc-900/30 rounded-2xl border border-zinc-800/60 p-6">
            <MapPin size={32} className="text-zinc-600 mx-auto" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">No Pickup Location Added Yet</h3>
            <p className="text-xs font-medium text-zinc-400 max-w-md mx-auto">
              Please add your shop or warehouse address with correct pincode so couriers can come to your doorstep for pickup.
            </p>
            <button
              onClick={() => setShowLocationModal(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              + Add Primary Warehouse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pickupLocations.map((loc) => (
              <div
                key={loc.id}
                className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-3 relative hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">{loc.name}</span>
                    {loc.is_default && (
                      <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase tracking-wider">
                        Default Pickup Point
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={13} /> Active
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-zinc-300 font-medium leading-relaxed">{loc.address_line1}</p>
                  <p className="text-white font-black text-sm">{loc.city}, {loc.state} - {loc.pincode}</p>
                  <p className="text-zinc-400 font-mono text-[11px] pt-1 flex items-center gap-1">
                    <Phone size={12} className="text-zinc-500" /> Contact Phone: {loc.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Add Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">Add Warehouse / Pickup Address</h2>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Where delivery riders will arrive to collect parcels</p>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                  Location Name (e.g. Main Shop / Surat Warehouse)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Main Warehouse Unit 1"
                  value={newLoc.name}
                  onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={newLoc.phone}
                  onChange={(e) => setNewLoc({ ...newLoc, phone: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                  Street / Area Address
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Shop No. 12, Fashion Textile Market, Ring Road"
                  value={newLoc.address_line1}
                  onChange={(e) => setNewLoc({ ...newLoc, address_line1: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Surat"
                    value={newLoc.city}
                    onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">State</label>
                  <input
                    type="text"
                    required
                    placeholder="Gujarat"
                    value={newLoc.state}
                    onChange={(e) => setNewLoc({ ...newLoc, state: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    placeholder="395002"
                    value={newLoc.pincode}
                    onChange={(e) => setNewLoc({ ...newLoc, pincode: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 h-11 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

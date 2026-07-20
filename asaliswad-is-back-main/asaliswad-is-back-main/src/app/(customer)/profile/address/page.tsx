"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { CartHeaderLink } from "@/components/CartHeaderLink";
import UserMenu from "@/components/UserMenu";

export default function AddressPage() {
  const { user, loading } = useAuth();
  
  const [savedAddress, setSavedAddress] = useState<{
    name: string;
    phone: string;
    village: string;
    postOffice: string;
    pincode: string;
    addressDetail: string;
  } | null>(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVillage, setEditVillage] = useState("");
  const [editPostOffice, setEditPostOffice] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [editAddressDetail, setEditAddressDetail] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const fetchProfileData = async () => {
      try {
        const { data: addr, error: addrErr } = await supabase
          .from("user_addresses")
          .select("*")
          .eq("user_email", user.email)
          .order("saved_at", { ascending: false })
          .limit(1)
          .single();

        if (addr && !addrErr) {
          const parsed = {
            name: addr.name,
            phone: addr.phone,
            village: addr.village,
            postOffice: addr.post_office,
            pincode: addr.pincode,
            addressDetail: addr.address_detail,
          };
          setSavedAddress(parsed);
          setEditName(parsed.name || "");
          setEditPhone(parsed.phone || "");
          setEditVillage(parsed.village || "");
          setEditPostOffice(parsed.postOffice || "");
          setEditPincode(parsed.pincode || "");
          setEditAddressDetail(parsed.addressDetail || "");
        } else if (addrErr) {
          console.error("No saved address found in DB for user or error:", addrErr);
          setSavedAddress(null);
        }
      } catch (e) {
        console.error("Profile data load error:", e);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleSaveAddress = () => {
    if (!editName.trim() || !editPhone.trim() || !editVillage.trim() || !editPostOffice.trim() || !editPincode.trim() || !editAddressDetail.trim()) {
      alert("Please fill in all address fields.");
      return;
    }

    const newAddressObj = {
      name: editName.trim(),
      phone: editPhone.trim(),
      village: editVillage.trim(),
      postOffice: editPostOffice.trim(),
      pincode: editPincode.trim(),
      addressDetail: editAddressDetail.trim(),
    };

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("asali-swad-user-address", JSON.stringify(newAddressObj));
      } catch (e) {}
      setSavedAddress(newAddressObj);

      (async () => {
        try {
          const addressPayload = {
            user_email: user?.email || 'anonymous@asaliswad.shop',
            name: editName.trim(),
            phone: editPhone.trim(),
            village: editVillage.trim(),
            post_office: editPostOffice.trim(),
            pincode: editPincode.trim(),
            address_detail: editAddressDetail.trim(),
          };

          const { error } = await supabase
            .from('user_addresses')
            .upsert(addressPayload, { onConflict: 'user_email' });

          if (error) console.error('Error saving address to Supabase:', error);
        } catch (e) {
          console.error('Address save error:', e);
        }
      })();
    }

    setIsEditingAddress(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/login" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900 overflow-x-hidden relative">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">Saved Addresses</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartHeaderLink />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-10 md:px-8">
        <div className="rounded-[2.5rem] bg-emerald-50/30 border border-emerald-100/50 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 block mb-0.5">Shipping Profile</span>
                <h3 className="text-md font-black text-slate-900">Saved Delivery Address</h3>
              </div>
            </div>
            {!isEditingAddress && savedAddress && (
              <button
                onClick={() => {
                  setIsEditingAddress(true);
                  setEditName(savedAddress.name || "");
                  setEditPhone(savedAddress.phone || "");
                  setEditVillage(savedAddress.village || "");
                  setEditPostOffice(savedAddress.postOffice || "");
                  setEditPincode(savedAddress.pincode || "");
                  setEditAddressDetail(savedAddress.addressDetail || "");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 shadow-sm transition hover:bg-slate-50 cursor-pointer select-none active:scale-95"
              >
                <span>✏️</span>
                <span>Edit Address</span>
              </button>
            )}
          </div>

          {isEditingAddress ? (
            <div className="space-y-4 text-left">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Rahul Adhikary"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Village / Town</label>
                  <input
                    type="text"
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    placeholder="e.g. Rampur"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Post Office</label>
                  <input
                    type="text"
                    value={editPostOffice}
                    onChange={(e) => setEditPostOffice(e.target.value)}
                    placeholder="e.g. Rampur P.O."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pincode</label>
                  <input
                    type="text"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value)}
                    placeholder="e.g. 700001"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Landmark / Extra Address Info</label>
                <textarea
                  value={editAddressDetail}
                  onChange={(e) => setEditAddressDetail(e.target.value)}
                  placeholder="e.g. Near Shiv Temple, Red House"
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 transition hover:bg-slate-50 cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="rounded-xl bg-emerald-600 border-b-4 border-emerald-800 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 transition hover:bg-emerald-500 active:translate-y-[2px] active:border-b-[2px] cursor-pointer shadow-md"
                >
                  💾 Save Address
                </button>
              </div>
            </div>
          ) : savedAddress ? (
            <div className="grid gap-5 md:grid-cols-2 text-left bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
              <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-5">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block leading-none">Recipient Name</span>
                  <p className="text-sm font-black text-slate-800">{savedAddress.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block leading-none">Phone Contact</span>
                  <p className="text-sm font-bold text-slate-700">{savedAddress.phone}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block leading-none">Delivery Location</span>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    🏡 Vill/Town: <span className="font-extrabold text-slate-900">{savedAddress.village}</span>, P.O: <span className="font-extrabold text-slate-900">{savedAddress.postOffice}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    📮 Pincode: <span className="font-extrabold text-slate-900">{savedAddress.pincode}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block leading-none">Landmark / Extra Details</span>
                  <p className="text-xs font-bold text-emerald-800 italic leading-relaxed">
                    &ldquo;{savedAddress.addressDetail}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-50/10 p-6 text-center">
              <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                📢 No delivery address saved yet. We will automatically save your address when you make your first purchase, or you can add one now!
              </p>
              <button
                onClick={() => {
                  setIsEditingAddress(true);
                  setEditName(user.user_metadata?.full_name || "");
                  setEditPhone("");
                  setEditVillage("");
                  setEditPostOffice("");
                  setEditPincode("");
                  setEditAddressDetail("");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-5 py-3 transition hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-950/5 cursor-pointer"
              >
                <span>➕</span>
                <span>Add Delivery Address</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

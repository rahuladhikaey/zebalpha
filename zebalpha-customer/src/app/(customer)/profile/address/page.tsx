"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { CartHeaderLink } from "@/components/CartHeaderLink";
import UserMenu from "@/components/UserMenu";

const normalizeAddressFromRecord = (record: any) => {
  const addressLine = record?.address_line || record?.address_line1 || record?.address_line2 || "";
  const lineParts = (addressLine || "").split(",").map((part: string) => part.trim()).filter(Boolean);

  return {
    name: record?.name || "",
    phone: record?.phone || "",
    village: record?.city || record?.village || lineParts[0] || "",
    postOffice: record?.post_office || record?.address_line2 || lineParts[1] || "",
    pincode: record?.pincode || "",
    addressDetail: record?.landmark || record?.address_detail || record?.addressDetail || "",
  };
};

const buildAddressPayload = (values: any, currentUser: any = null) => ({
  user_id: currentUser?.id || null,
  user_email: currentUser?.email || null,
  name: values.name || "",
  phone: values.phone || "",
  address_line: [values.village, values.postOffice].filter(Boolean).join(", "),
  address_line1: values.village || "",
  address_line2: values.postOffice || "",
  city: values.village || "",
  pincode: values.pincode || "",
  landmark: values.addressDetail || "",
  is_default: true,
  saved_at: new Date().toISOString(),
});

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
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (addr && !addrErr) {
          const parsed = normalizeAddressFromRecord(addr);
          setSavedAddress(parsed);
          setEditName(parsed.name || "");
          setEditPhone(parsed.phone || "");
          setEditVillage(parsed.village || "");
          setEditPostOffice(parsed.postOffice || "");
          setEditPincode(parsed.pincode || "");
          setEditAddressDetail(parsed.addressDetail || "");
        } else {
          // Fallback to localStorage
          if (typeof window !== "undefined") {
            const saved = window.localStorage.getItem("asali-swad-user-address");
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                setSavedAddress(parsed);
                setEditName(parsed.name || "");
                setEditPhone(parsed.phone || "");
                setEditVillage(parsed.village || "");
                setEditPostOffice(parsed.postOffice || "");
                setEditPincode(parsed.pincode || "");
                setEditAddressDetail(parsed.addressDetail || "");
              } catch (e) {}
            }
          }
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
          const addressPayload = buildAddressPayload({
            name: editName.trim(),
            phone: editPhone.trim(),
            village: editVillage.trim(),
            postOffice: editPostOffice.trim(),
            pincode: editPincode.trim(),
            addressDetail: editAddressDetail.trim(),
          }, user);

          const { data: existingRows, error: existingErr } = await supabase
            .from('user_addresses')
            .select('id')
            .eq('user_id', user?.id)
            .limit(1);

          if (existingErr) {
            console.error('Error loading existing address:', existingErr);
            return;
          }

          if (existingRows && existingRows.length > 0) {
            const { error } = await supabase
              .from('user_addresses')
              .update(addressPayload)
              .eq('user_id', user?.id);

            if (error) console.error('Error saving address to Supabase:', error);
          } else {
            const { error } = await supabase
              .from('user_addresses')
              .insert([addressPayload]);

            if (error) console.error('Error saving address to Supabase:', error);
          }
        } catch (e) {
          console.error('Address save error:', e);
        }
      })();
    }

    setIsEditingAddress(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center p-8 bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-800 text-white">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/login" className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200">Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center justify-center p-2 rounded-full hover:bg-zinc-900 transition-colors">
            <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Saved Addresses</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartHeaderLink />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-10 md:px-8">
        <div className="rounded-[2.5rem] bg-zinc-950 border border-zinc-800 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 block mb-0.5">Shipping Profile</span>
                <h3 className="text-md font-black text-white">Saved Delivery Address</h3>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 shadow-sm transition hover:bg-zinc-800 cursor-pointer select-none active:scale-95"
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
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Rahul Adhikary"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:border-white transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:border-white transition outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Village / Town</label>
                  <input
                    type="text"
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    placeholder="e.g. Rampur"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:border-white transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Post Office</label>
                  <input
                    type="text"
                    value={editPostOffice}
                    onChange={(e) => setEditPostOffice(e.target.value)}
                    placeholder="e.g. Rampur P.O."
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:border-white transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Pincode</label>
                  <input
                    type="text"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value)}
                    placeholder="e.g. 700001"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:border-white transition outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Landmark / Extra Address Info</label>
                <textarea
                  value={editAddressDetail}
                  onChange={(e) => setEditAddressDetail(e.target.value)}
                  placeholder="e.g. Near Shiv Temple, Red House"
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:border-white transition outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 transition hover:bg-zinc-800 cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="rounded-xl bg-white text-black font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 transition hover:bg-zinc-200 active:scale-95 cursor-pointer shadow-xl shadow-white/10"
                >
                  💾 Save Address
                </button>
              </div>
            </div>
          ) : savedAddress ? (
            <div className="grid gap-5 md:grid-cols-2 text-left bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-xl">
              <div className="space-y-3 border-b md:border-b-0 md:border-r border-zinc-800 pb-3 md:pb-0 md:pr-5">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block leading-none">Recipient Name</span>
                  <p className="text-sm font-black text-white">{savedAddress.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block leading-none">Phone Contact</span>
                  <p className="text-sm font-bold text-zinc-300">{savedAddress.phone}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block leading-none">Delivery Location</span>
                  <p className="text-xs font-bold text-zinc-300 leading-relaxed">
                    🏡 Vill/Town: <span className="font-extrabold text-white">{savedAddress.village}</span>, P.O: <span className="font-extrabold text-white">{savedAddress.postOffice}</span>
                  </p>
                  <p className="text-xs font-bold text-zinc-300">
                    📮 Pincode: <span className="font-extrabold text-white">{savedAddress.pincode}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block leading-none">Landmark / Extra Details</span>
                  <p className="text-xs font-bold text-zinc-300 italic leading-relaxed">
                    &ldquo;{savedAddress.addressDetail}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-6 text-center">
              <p className="text-xs font-bold text-zinc-400 leading-relaxed mb-4">
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-wider px-5 py-3 transition hover:bg-zinc-200 active:scale-95 shadow-xl shadow-white/10 cursor-pointer"
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

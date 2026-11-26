"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Plus,
  ShoppingBag,
  Smartphone,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { useAuth } from "@/context/AuthContext";
import { ZEB_QUICK_DELIVERY_FEE, ZEB_QUICK_FREE_DELIVERY_MIN } from "@shared/constants/zebQuick";

interface SavedZebQuickAddress {
  label: "Home" | "Work" | "Other";
  name: string;
  phone: string;
  houseLine: string;
  areaLine: string;
  pincode: string;
}

const ADDRESS_STORAGE_KEY = "zeb_quick_saved_address_v1";

export default function ZebQuickCartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    cart,
    cartCount,
    cartSubtotal,
    pincode,
    serviceability,
    setPincode,
    detectGpsPincode,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    openProductDetail,
  } = useZebQuick();

  // Step modals: address sheet & payment sheet
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);

  // Saved address state
  const [savedAddress, setSavedAddress] = useState<SavedZebQuickAddress | null>(null);
  const [addrLabel, setAddrLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [addrName, setAddrName] = useState(user?.user_metadata?.full_name || "");
  const [addrPhone, setAddrPhone] = useState(user?.user_metadata?.phone || "");
  const [addrHouse, setAddrHouse] = useState("");
  const [addrArea, setAddrArea] = useState(serviceability.areaName ? `${serviceability.areaName}, ${serviceability.city}` : "");
  const [addrPin, setAddrPin] = useState(pincode);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  // Upsells ("You might also like")
  const [upsells, setUpsells] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate saved address
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedZebQuickAddress;
        if (parsed?.houseLine && parsed?.pincode) {
          setSavedAddress(parsed);
          setAddrLabel(parsed.label || "Home");
          setAddrName(parsed.name || "");
          setAddrPhone(parsed.phone || "");
          setAddrHouse(parsed.houseLine || "");
          setAddrArea(parsed.areaLine || "");
          setAddrPin(parsed.pincode || pincode);
        }
      }
    } catch {}
  }, [pincode]);

  // Load "You might also like" items for current pincode
  useEffect(() => {
    let active = true;
    fetch(`/api/zeb-quick/products?pincode=${encodeURIComponent(pincode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const cartIds = new Set(cart.map((c) => c.id));
        const list = (Array.isArray(data.products) ? data.products : []).filter(
          (p: any) => !cartIds.has(p.id)
        );
        setUpsells(list.slice(0, 8));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pincode, cart.length]);

  const deliveryFee =
    cartSubtotal >= ZEB_QUICK_FREE_DELIVERY_MIN || cartSubtotal === 0 ? 0 : ZEB_QUICK_DELIVERY_FEE;
  const total = cartSubtotal + deliveryFee;

  const handleUseGps = async () => {
    setGpsLoading(true);
    setAddrError(null);
    const res = await detectGpsPincode();
    setGpsLoading(false);
    if (res.ok && res.pincode) {
      setAddrPin(res.pincode);
      setAddrArea(
        serviceability.areaName
          ? `${serviceability.areaName}, ${serviceability.city || "West Bengal"}`
          : `Detected Pincode ${res.pincode}`
      );
    } else {
      setAddrError(res.error || "Could not detect GPS location. Please enter pincode manually.");
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);
    const cleanPin = addrPin.replace(/\D/g, "").slice(0, 6);
    const cleanPhone = addrPhone.replace(/\D/g, "").slice(-10);
    if (!addrName.trim()) {
      setAddrError("Please enter receiver's name.");
      return;
    }
    if (cleanPhone.length !== 10) {
      setAddrError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!addrHouse.trim()) {
      setAddrError("Please enter House / Flat / Street details.");
      return;
    }
    if (cleanPin.length !== 6) {
      setAddrError("Please enter a valid 6-digit pincode.");
      return;
    }

    await setPincode(cleanPin);
    const nextAddr: SavedZebQuickAddress = {
      label: addrLabel,
      name: addrName.trim(),
      phone: cleanPhone,
      houseLine: addrHouse.trim(),
      areaLine: addrArea.trim() || `${serviceability.areaName}, ${serviceability.city}`,
      pincode: cleanPin,
    };
    setSavedAddress(nextAddr);
    try {
      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(nextAddr));
    } catch {}
    setAddressSheetOpen(false);
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const placeOrderOnServer = async (
    method: "ONLINE" | "COD",
    rzp?: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
  ) => {
    if (!savedAddress) return;
    const fullAddress = `${savedAddress.houseLine}${savedAddress.areaLine ? `, ${savedAddress.areaLine}` : ""} - ${savedAddress.pincode}`;
    const res = await fetch("/api/zeb-quick/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user?.id || null,
        customer_name: savedAddress.name,
        phone: savedAddress.phone,
        delivery_address: fullAddress,
        delivery_pincode: savedAddress.pincode,
        payment_method: method,
        items: cart,
        ...(rzp || {}),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to place ZebQuick order");
    }
    clearCart();
    setPaymentSheetOpen(false);
    router.push("/zeb-quick/orders");
  };

  const handlePayWithRazorpay = async () => {
    if (!savedAddress) {
      setPaymentSheetOpen(false);
      setAddressSheetOpen(true);
      return;
    }
    if (!serviceability.serviceable) {
      setError(`Pincode ${savedAddress.pincode} is not serviceable for ZebQuick 5–6 Hr delivery yet.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Could not load Razorpay checkout. Please check your internet.");
      }

      const orderRes = await fetch("/api/zeb-quick/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.orderId) {
        throw new Error(orderJson.error || "Failed to start Razorpay payment");
      }

      const RazorpayCtor = (window as any).Razorpay;
      const rzp = new RazorpayCtor({
        key: orderJson.keyId,
        amount: orderJson.amountPaise,
        currency: "INR",
        name: "ZebQuick Express",
        description: `5–6 Hr Express Order (${cartCount} items)`,
        order_id: orderJson.orderId,
        prefill: {
          name: savedAddress.name,
          contact: savedAddress.phone,
          email: user?.email || undefined,
        },
        theme: { color: "#0C831F" },
        handler: async (response: any) => {
          try {
            await placeOrderOnServer("ONLINE", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (err: any) {
            setError(err?.message || "Payment verification failed");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });
      rzp.open();
    } catch (err: any) {
      setError(err?.message || "Razorpay payment failed");
      setSubmitting(false);
    }
  };

  const handlePlaceCod = async () => {
    if (!savedAddress) return;
    if (!serviceability.serviceable) {
      setError(`Pincode ${savedAddress.pincode} is not serviceable yet.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await placeOrderOnServer("COD");
    } catch (err: any) {
      setError(err?.message || "Could not place COD order");
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-emerald-300" />
        <h1 className="mt-3 text-lg font-black text-neutral-900">Your ZebQuick Express Cart is empty</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Add innerwear or daily essentials for 5–6 hour express delivery.
        </p>
        <Link
          href="/zeb-quick"
          className="mt-5 inline-flex rounded-2xl bg-[#0C831F] px-5 py-2.5 text-xs font-extrabold text-white"
        >
          Shop ZebQuick Express
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-36">
      {/* Top Checkout Header */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white px-3.5 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-900" />
          </button>
          <h1 className="text-base font-black text-neutral-950">Checkout</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-3.5 py-4 space-y-4">
        {/* Delivery Shipment Card */}
        <div className="rounded-3xl bg-white p-4 shadow-xs border border-neutral-200/70 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#0C831F] shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-neutral-950">Delivery in 5–6 hours</p>
              <p className="text-xs font-semibold text-neutral-500">
                Shipment of {cartCount} {cartCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.size || ""}-${item.color || ""}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <img
                  src={item.image_url || "/official-logo-sm.png"}
                  alt={item.title}
                  className="h-16 w-16 rounded-2xl border border-neutral-100 object-cover bg-neutral-50 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-neutral-900 line-clamp-2">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">
                    {item.size ? `Size: ${item.size}` : "1 unit"}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await toggleWishlist(item.id);
                      removeFromCart(item.id, item.size, item.color);
                    }}
                    className="mt-1 text-[11px] font-semibold text-neutral-500 underline cursor-pointer"
                  >
                    Move to wishlist
                  </button>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="inline-flex h-8 items-center gap-2.5 rounded-xl bg-[#0C831F] px-2.5 text-xs font-black text-white">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.size, item.color, item.quantity - 1)}
                      className="cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <span className="min-w-[14px] text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.size, item.color, item.quantity + 1)}
                      className="cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                  <span className="text-xs font-black text-neutral-950">₹{item.price * item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* You might also like */}
        {upsells.length > 0 && (
          <div className="rounded-3xl bg-white p-4 shadow-xs border border-neutral-200/70 space-y-3">
            <h2 className="text-sm font-black text-neutral-950">You might also like</h2>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {upsells.map((p) => {
                const img = p.image_url || (Array.isArray(p.images) && p.images[0]) || "/official-logo-sm.png";
                const defSize = Array.isArray(p.sizes) && p.sizes.length > 0 ? String(p.sizes[0]) : undefined;
                const qty = cart.find((c) => c.id === p.id && (c.size || "") === (defSize || ""))?.quantity || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => openProductDetail(p)}
                    className="w-28 shrink-0 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-2 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="aspect-square w-full overflow-hidden rounded-xl bg-white">
                        <img src={img} alt={p.title} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-bold text-neutral-900 leading-tight">
                        {p.title}
                      </p>
                      <p className="mt-1 text-xs font-black text-neutral-950">₹{p.zeb_quick_price}</p>
                    </div>
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            addToCart({
                              id: p.id,
                              source_product_id: p.source_product_id || p.id,
                              seller_id: p.seller_id,
                              title: p.title,
                              image_url: img,
                              price: Number(p.zeb_quick_price),
                              mrp: p.mrp ? Number(p.mrp) : null,
                              size: defSize,
                              pickup_pincode: p.pickup_pincode,
                            })
                          }
                          className="w-full rounded-lg border border-[#0C831F] bg-white py-1 text-[10px] font-black text-[#0C831F] cursor-pointer"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="flex w-full items-center justify-between rounded-lg bg-[#0C831F] px-2 py-1 text-[10px] font-black text-white">
                          <button type="button" onClick={() => updateQty(p.id, defSize, undefined, qty - 1)} className="cursor-pointer">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => updateQty(p.id, defSize, undefined, qty + 1)} className="cursor-pointer">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bill Summary */}
        <div className="rounded-3xl bg-white p-4 shadow-xs border border-neutral-200/70 space-y-2 text-xs">
          <h2 className="text-sm font-black text-neutral-950">Bill details</h2>
          <div className="flex justify-between text-neutral-600">
            <span>Items total</span>
            <span className="font-bold text-neutral-900">₹{cartSubtotal}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>5–6 Hr Express Delivery</span>
            <span className="font-bold text-emerald-700">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
          </div>
          <div className="border-t border-neutral-100 pt-2 flex justify-between text-sm font-black text-neutral-950">
            <span>Bill total</span>
            <span>₹{total}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Address + Step CTA (Blinkit Image 1 & 2) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-2xl space-y-2.5">
          {savedAddress && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-neutral-950 truncate">
                    Delivering to {savedAddress.label}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {savedAddress.houseLine}, {savedAddress.areaLine} ({savedAddress.pincode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddressSheetOpen(true)}
                className="text-xs font-extrabold text-[#0C831F] shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          {!savedAddress ? (
            <button
              type="button"
              onClick={() => setAddressSheetOpen(true)}
              className="w-full rounded-2xl bg-[#0C831F] py-3.5 text-sm font-black text-white shadow-sm hover:bg-[#096b18] active:scale-[0.99] cursor-pointer"
            >
              Choose address at next step
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPaymentSheetOpen(true);
              }}
              className="w-full rounded-2xl bg-[#0C831F] py-3.5 text-sm font-black text-white shadow-sm hover:bg-[#096b18] active:scale-[0.99] cursor-pointer"
            >
              Select Payment Method
            </button>
          )}
        </div>
      </div>

      {/* Step 2 Modal: Blinkit Address Sheet (GPS or Manual Pincode + Full Details) */}
      {addressSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-neutral-950">Enter Complete Address</h2>
                <p className="text-xs text-neutral-500">Use GPS or enter pincode manually for 5–6 Hr delivery</p>
              </div>
              <button
                type="button"
                onClick={() => setAddressSheetOpen(false)}
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={gpsLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-extrabold text-emerald-800 cursor-pointer"
            >
              <Navigation className="h-4 w-4" />
              {gpsLoading ? "Detecting GPS Location..." : "Use Current GPS Location"}
            </button>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="flex gap-2">
                {(["Home", "Work", "Other"] as const).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setAddrLabel(lbl)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-extrabold cursor-pointer ${
                      addrLabel === lbl
                        ? "border-[#0C831F] bg-emerald-50 text-[#0C831F]"
                        : "border-neutral-200 text-neutral-600"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  placeholder="Receiver's Name"
                  className="rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-semibold"
                />
                <input
                  required
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  placeholder="10-digit Mobile"
                  maxLength={10}
                  className="rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-semibold"
                />
              </div>

              <input
                required
                value={addrHouse}
                onChange={(e) => setAddrHouse(e.target.value)}
                placeholder="House / Flat No., Building, Landmark"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-semibold"
              />

              <div className="grid grid-cols-3 gap-2.5">
                <input
                  value={addrArea}
                  onChange={(e) => setAddrArea(e.target.value)}
                  placeholder="Area / City"
                  className="col-span-2 rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-semibold"
                />
                <input
                  required
                  value={addrPin}
                  onChange={(e) => setAddrPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Pincode"
                  maxLength={6}
                  className="rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-black tracking-wider"
                />
              </div>

              {addrError && <p className="text-xs font-bold text-rose-600">{addrError}</p>}

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#0C831F] py-3 text-sm font-black text-white cursor-pointer"
              >
                Save &amp; Continue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 3 Modal: Blinkit Payment Sheet (Razorpay UPI/Cards/Wallets/Netbanking + COD) */}
      {paymentSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F4F6FB]">
          <div className="border-b border-neutral-200 bg-white px-4 py-3.5">
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              <button
                type="button"
                onClick={() => setPaymentSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5 text-neutral-900" />
              </button>
              <h2 className="text-base font-black text-neutral-950">Bill total: ₹{total}</h2>
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                {error}
              </div>
            )}

            {/* Recommended / Razorpay UPI */}
            <div className="rounded-3xl bg-white p-4 shadow-xs border border-neutral-200/70 space-y-2.5">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
                Recommended • Instant Razorpay
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={handlePayWithRazorpay}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-left transition hover:bg-emerald-50 cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0C831F] shadow-xs">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-neutral-950">Pay via UPI (PhonePe / GPay / Paytm)</p>
                    <p className="text-[11px] font-semibold text-neutral-500">Secured by Razorpay</p>
                  </div>
                </div>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin text-[#0C831F]" /> : <ChevronRight className="h-4 w-4 text-neutral-500" />}
              </button>
            </div>

            {/* Cards, Wallets & Netbanking via Razorpay */}
            <div className="rounded-3xl bg-white p-4 shadow-xs border border-neutral-200/70 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
                Cards, Wallets &amp; Netbanking
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={handlePayWithRazorpay}
                className="flex w-full items-center justify-between rounded-2xl p-3 text-left hover:bg-neutral-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                    <CreditCard className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-950">Credit / Debit Cards</p>
                    <p className="text-[11px] text-neutral-500">Visa, Mastercard, RuPay via Razorpay</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#0C831F]">PAY</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handlePayWithRazorpay}
                className="flex w-full items-center justify-between rounded-2xl p-3 text-left hover:bg-neutral-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                    <Wallet className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-950">Wallets &amp; Netbanking</p>
                    <p className="text-[11px] text-neutral-500">Amazon Pay, Mobikwik, All Banks</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#0C831F]">PAY</span>
              </button>
            </div>

            {/* Cash on Delivery */}
            <div className="rounded-3xl bg-white p-4 shadow-xs border border-neutral-200/70 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-500">Pay on Delivery</p>
              <button
                type="button"
                disabled={submitting}
                onClick={handlePlaceCod}
                className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-3.5 text-left hover:bg-neutral-50 cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-neutral-950">Cash on Delivery (COD)</p>
                    <p className="text-[11px] text-neutral-500">Pay ₹{total} via Cash or UPI at doorstep</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

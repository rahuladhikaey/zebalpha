"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Zap, Loader2 } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { useAuth } from "@/context/AuthContext";
import { ZEB_QUICK_DELIVERY_FEE, ZEB_QUICK_FREE_DELIVERY_MIN } from "@shared/constants/zebQuick";

export default function ZebQuickCartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartSubtotal, pincode, serviceability, updateQty, removeFromCart, clearCart } = useZebQuick();

  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryFee = cartSubtotal >= ZEB_QUICK_FREE_DELIVERY_MIN || cartSubtotal === 0 ? 0 : ZEB_QUICK_DELIVERY_FEE;
  const total = cartSubtotal + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!serviceability.serviceable) {
      setError(`Pincode ${pincode} is not serviceable for ZebQuick 5–6 Hr delivery yet.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/zeb-quick/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id || null,
          customer_name: name,
          phone,
          delivery_address: address,
          delivery_pincode: pincode,
          payment_method: paymentMethod,
          items: cart,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to place ZebQuick order");
        setSubmitting(false);
        return;
      }
      clearCart();
      router.push("/zeb-quick/orders");
    } catch {
      setError("Network error while placing order");
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-orange-300" />
        <h1 className="mt-3 text-lg font-black text-neutral-900">Your ZebQuick Express Cart is empty</h1>
        <p className="mt-1 text-xs text-neutral-500">
          ZebQuick cart is separate from your ZebAlpha cart for 5–6 hour hyperlocal delivery.
        </p>
        <Link
          href="/zeb-quick"
          className="mt-5 inline-flex rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-xs font-extrabold text-white"
        >
          Shop ZebQuick Express
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3.5 py-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-neutral-900">ZebQuick Express Cart</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-[11px] font-extrabold text-[#EE2B00]">
          <Zap className="h-3 w-3 fill-[#EE2B00]" />
          5–6 Hr Delivery to {pincode}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-5">
        <div className="md:col-span-3 space-y-3">
          {cart.map((item) => (
            <div
              key={`${item.id}-${item.size || ""}-${item.color || ""}`}
              className="flex gap-3 rounded-2xl border border-orange-100 bg-white p-3 shadow-xs"
            >
              <img
                src={item.image_url || "/official-logo-sm.png"}
                alt={item.title}
                className="h-20 w-20 rounded-xl object-cover bg-orange-50 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-neutral-900 line-clamp-2">{item.title}</h3>
                {item.size && <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">Size: {item.size}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-black text-neutral-950">₹{item.price * item.quantity}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-orange-200 bg-orange-50">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.size, item.color, item.quantity - 1)}
                        className="p-1.5 text-[#EE2B00] cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 text-xs font-black">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.size, item.color, item.quantity + 1)}
                        className="p-1.5 text-[#EE2B00] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id, item.size, item.color)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleCheckout} className="md:col-span-2 rounded-3xl border border-orange-200 bg-white p-4 space-y-3 h-fit shadow-xs">
          <h2 className="text-sm font-black text-neutral-900">Express Delivery Details</h2>

          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold"
          />
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-Digit Mobile Number"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold"
          />
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={`Full Address (Pincode: ${pincode})`}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold"
          />

          <div className="flex gap-2">
            {(["COD", "ONLINE"] as const).map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => setPaymentMethod(pm)}
                className={`flex-1 rounded-xl border py-2 text-xs font-extrabold cursor-pointer ${
                  paymentMethod === pm
                    ? "border-[#EE2B00] bg-orange-50 text-[#EE2B00]"
                    : "border-neutral-200 text-neutral-600"
                }`}
              >
                {pm === "COD" ? "Cash on Delivery" : "Online / UPI"}
              </button>
            ))}
          </div>

          <div className="border-t border-neutral-100 pt-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Items Subtotal</span>
              <span className="font-bold">₹{cartSubtotal}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>5–6 Hr Express Delivery</span>
              <span className="font-bold text-emerald-600">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-neutral-950 pt-1">
              <span>Total Payable</span>
              <span>₹{total}</span>
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EE2B00] py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#d42600] disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Place ZebQuick Express Order (₹{total})
          </button>
        </form>
      </div>
    </div>
  );
}

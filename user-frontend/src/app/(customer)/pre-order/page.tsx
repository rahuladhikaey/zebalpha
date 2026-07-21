"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Header } from "@/components/Header";
import Image from "next/image";

function PreOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [product, setProduct] = useState<any>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [postOffice, setPostOffice] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [billingSettings, setBillingSettings] = useState({ deliveryFee: 0, packagingFee: 0, tax: 0, freeDeliveryThreshold: 499 });

  const productId = searchParams.get("productId");
  const quantity = parseInt(searchParams.get("quantity") || "1");

  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        setIsLoadingProduct(true);
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("id", Number(productId))
            .single();

          if (data) {
            setProduct({ ...data, quantity });
          } else if (error) {
            setMessage("Could not load product details.");
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingProduct(false);
        }
      };
      fetchProduct();
    } else {
      setIsLoadingProduct(false);
    }
  }, [productId, quantity]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('store_settings').select('value').eq('key', 'billing').single();
        if (data && data.value) {
          setBillingSettings(data.value);
        }
      } catch (err) {
        console.error("Error fetching billing settings", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setIsAuthenticated(!!data.session);
        setIsCheckingAuth(false);

        if (data.session?.user?.email) {
          const { data: address } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_email', data.session.user.email)
            .order('saved_at', { ascending: false })
            .limit(1)
            .single();

          if (address) {
            if (address.name) setName(address.name);
            if (address.phone) setPhone(address.phone);
            if (address.village) setVillage(address.village);
            if (address.post_office) setPostOffice(address.post_office);
            if (address.pincode) setPincode(address.pincode);
          }
        }
      }
    };
    checkAuth();
    return () => { isMounted = false; };
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !phone || !village || !postOffice || !pincode || !state) {
      setMessage("Please fill in all delivery details to proceed.");
      return;
    }

    if (!product) {
      setMessage("Product information missing.");
      return;
    }

    setSaving(true);
    const fullAddress = `Vill: ${village}, P.O: ${postOffice}, State: ${state}, Pin: ${pincode}`;
    const bookingAmount = 2; // Fixed booking amount

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Handle Online Flow (Razorpay)
      const res = await loadRazorpay();
      if (!res) {
        setMessage("Razorpay SDK failed to load. Please check your connection.");
        setSaving(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/checkout/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: bookingAmount }),
      });

      let orderData;
      try {
        const text = await response.text();
        orderData = JSON.parse(text);
      } catch (err) {
        setMessage("Server error: Received an invalid response from the payment gateway.");
        setSaving(false);
        return;
      }

      if (!response.ok || !orderData.id) {
        setMessage("Could not create Razorpay order. " + (orderData.error || "Please try again."));
        setSaving(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Asali Swad",
        description: "Pre-Order Booking",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/preorder/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer_name: name,
                phone: phone,
                address: fullAddress,
                product_id: product.id,
                product_name: product.name,
                quantity: product.quantity,
                total_price: product.price * product.quantity,
                booking_amount: bookingAmount,
                user_id: userId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              router.push(`/pre-order/success?booking_id=${verifyData.bookingId}`);
            } else {
              setMessage("Payment verification failed. Please contact support.");
              setSaving(false);
            }
          } catch (err) {
            console.error(err);
            setMessage("Error verifying payment. Please contact support.");
            setSaving(false);
          }
        },
        prefill: { name, contact: phone },
        theme: { color: "#059669" },
        modal: {
          ondismiss: function () {
            setSaving(false);
          }
        }
      };

      const Razorpay = (window as any).Razorpay;
      const paymentObject = new Razorpay(options);
      paymentObject.open();

    } catch (err: unknown) {
      console.error(err);
      setMessage("An unexpected error occurred. Please try again.");
      setSaving(false);
    }
  };

  if (isCheckingAuth || isLoadingProduct) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white p-10 premium-shadow">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-slate-100 text-3xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-slate-900">Sign in required</h1>
          <p className="mt-3 text-slate-500 font-medium">Please login to your account to pre-order.</p>
          <Link href={`/login?redirect=/pre-order?productId=${productId}&quantity=${quantity}`} className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95">
            Login / Signup
          </Link>
        </div>
      </main>
    );
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900 overflow-x-hidden pb-20">
      <Header title="Order Booking Confirmation" subtitle="Secure your items today" />

      <section className="mx-auto max-w-4xl px-4 py-6 md:py-12 md:px-8">

        {/* Info Box */}
        <div className="mb-8 rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/50 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <h2 className="text-lg font-black text-emerald-900 flex items-center gap-2">
            <span className="text-2xl">📦</span> Reserve your order today for just ₹2.
          </h2>
          <div className="mt-3 space-y-2 text-sm font-bold text-emerald-800/80">
            <p>• Your ₹2 booking amount confirms your order reservation.</p>
            <p>• The remaining amount will be paid during final order processing or delivery.</p>
            <p className="text-xs text-rose-600 mt-4">* This booking amount is non-refundable.</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">

          {/* Form Area */}
          <div className="rounded-[2.5rem] bg-white p-6 md:p-8 premium-shadow border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-6">Customer Details</h3>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="group relative text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Full Name</label>
                <input
                  required
                  value={name}
                  maxLength={20}
                  placeholder="Your name"
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>

              <div className="group relative text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Mobile Number</label>
                <input
                  required
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g., 988363XXXX"
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="group relative text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Village / City</label>
                  <input
                    required
                    value={village}
                    maxLength={20}
                    placeholder="Village / City"
                    onChange={(event) => setVillage(event.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                  />
                </div>

                <div className="group relative text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Post Office</label>
                  <input
                    required
                    value={postOffice}
                    maxLength={20}
                    placeholder="Post office"
                    onChange={(event) => setPostOffice(event.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="group relative text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">State</label>
                  <input
                    required
                    value={state}
                    placeholder="State"
                    onChange={(event) => setState(event.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                  />
                </div>

                <div className="group relative text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">PIN Code</label>
                  <input
                    required
                    type="text"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={pincode}
                    placeholder="6-digit PIN"
                    onChange={(event) => setPincode(event.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-3 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                  />
                </div>
              </div>

              {message ? (
                <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100/50">
                  <span className="text-xl">⚠️</span>
                  <p className="text-xs font-bold text-rose-700 leading-snug">{message}</p>
                </div>
              ) : null}

              {/* Submit button moved to sidebar for better UX, or kept here but we need Payment Section too */}
            </form>

            <div className="mt-10 border-t border-slate-100 pt-8">
              <h3 className="text-xl font-black text-slate-900 mb-6">Payment Section</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Secure Online Payment</p>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-50/50">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Pay via Razorpay</p>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-0.5">Supports UPI, Google Pay, PhonePe, Cards & NetBanking</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={(e: any) => handleSubmit(e)}
                  disabled={saving}
                  className="flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {saving ? "Processing..." : "Confirm Booking & Pay ₹2"}
                </button>
              </div>
            </div>

          </div>

          {/* Sidebar Area: Order Summary */}
          <aside className="space-y-6">
            <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white premium-shadow sticky top-24">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-6">Order Summary</h3>

              {product && (
                <div className="flex items-center gap-4 border-b border-white/10 pb-6 mb-6">
                  <div className="h-20 w-20 bg-white rounded-2xl overflow-hidden relative p-2 flex-shrink-0">
                    <Image src={product.images?.[0] || product.image_url} alt={product.name} fill className="object-contain" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold leading-tight line-clamp-2">{product.name}</h4>
                    <p className="text-xs text-slate-400 font-bold mt-1">Qty: {product.quantity}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm font-bold text-slate-300">
                <div className="flex justify-between items-center">
                  <span>Product Price</span>
                  <span className="text-white">₹{product ? product.price * product.quantity : 0}</span>
                </div>

                {billingSettings.packagingFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Packaging Fee</span>
                    <span className="text-white">₹{billingSettings.packagingFee}</span>
                  </div>
                )}

                {billingSettings.tax > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Tax</span>
                    <span className="text-white">₹{billingSettings.tax}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Delivery Fee</span>
                  <span className="text-white">
                    {billingSettings.deliveryFee === 0 || (product && (product.price * product.quantity) >= billingSettings.freeDeliveryThreshold)
                      ? "FREE"
                      : `₹${billingSettings.deliveryFee}`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Booking Charge</span>
                  <span className="text-white">- ₹2</span>
                </div>

                <div className="flex justify-between items-center text-emerald-400 border-t border-white/10 pt-3 mt-3">
                  <span>Pay Later</span>
                  <span>₹{product ? (product.price * product.quantity)
                    + billingSettings.packagingFee
                    + billingSettings.tax
                    + ((product.price * product.quantity) >= billingSettings.freeDeliveryThreshold ? 0 : billingSettings.deliveryFee)
                    - 2 : 0}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center text-lg font-black text-white">
                  <span>Payment Amount</span>
                  <span>₹2 Only</span>
                </div>
              </div>

              <div className="mt-8 bg-emerald-900/40 rounded-xl p-4 border border-emerald-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 text-center">Estimated Delivery Date</p>
                <p className="text-sm font-bold text-white text-center mt-1">{estimatedDelivery.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              </div>

            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function PreOrderPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </main>
    }>
      <PreOrderContent />
    </Suspense>
  );
}

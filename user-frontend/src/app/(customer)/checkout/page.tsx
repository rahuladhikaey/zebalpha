"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { Header } from "@/components/Header";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMethod = searchParams.get("method")?.toUpperCase() === "COD" ? "COD" : "ONLINE";

  const isBuyNow = searchParams.get("buyNow") === "true";
  const { cart: contextCart, totalValue: contextTotalValue, clearCart } = useCart();
  const [buyNowItem, setBuyNowItem] = useState<any>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isBuyNow);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [postOffice, setPostOffice] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">(initialMethod);

  // Saved Address UI state
  const [useSavedAddress, setUseSavedAddress] = useState(false);

  // Card membership UI states
  const [hasMembershipCard, setHasMembershipCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardValidated, setCardValidated] = useState(false);
  const [cardError, setCardError] = useState("");
  const [appliedCardType, setAppliedCardType] = useState<string | null>(null);

  // VIP Offer states
  const [storeProducts, setStoreProducts] = useState<any[]>([]);

  // Billing Settings State
  const [billingSettings, setBillingSettings] = useState({
    deliveryFee: 29,
    freeDeliveryThreshold: 100,
    packagingFee: 9,
    tax: 3
  });
  const [cartOffer, setCartOffer] = useState({
    threshold: 139,
    percentage: 50,
    isActive: true
  });

  const productId = searchParams.get("productId");
  const quantity = parseInt(searchParams.get("quantity") || "1");

  useEffect(() => {
    // Fetch products
    const fetchAllProducts = async () => {
      try {
        const { data } = await supabase.from("products").select("*");
        if (data) setStoreProducts(data);
      } catch (err) {
        console.error("Error fetching products", err);
      }
    };
    fetchAllProducts();

    // Fetch Billing Settings
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

    const fetchOffer = async () => {
      try {
        const { data } = await supabase.from('store_settings').select('value').eq('key', 'global_cart_offer').single();
        if (data && data.value) {
          setCartOffer(data.value);
        }
      } catch (err) {
        console.error("Error fetching cart offer", err);
      }
    };
    fetchOffer();

    // Fetch saved address from Supabase and LocalStorage
    const fetchSavedAddress = async () => {
      let loadedFromDB = false;
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email) {
        const { data, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_email', session.user.email)
          .order('saved_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          if (data.name) setName(data.name);
          if (data.phone) setPhone(data.phone);
          if (data.village) setVillage(data.village);
          if (data.post_office) setPostOffice(data.post_office);
          if (data.pincode) setPincode(data.pincode);
          if (data.address_detail) setAddressDetail(data.address_detail);
          setUseSavedAddress(true);
          loadedFromDB = true;
        }
      }

      // Fallback to localStorage ONLY if user is NOT logged in (guest) to prevent cross-account leaks
      if (!session?.user?.email && typeof window !== "undefined") {
        const saved = window.localStorage.getItem("asali-swad-user-address");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.name) setName(parsed.name);
            if (parsed.phone) setPhone(parsed.phone);
            if (parsed.village) setVillage(parsed.village);
            if (parsed.postOffice || parsed.post_office) setPostOffice(parsed.postOffice || parsed.post_office);
            if (parsed.pincode) setPincode(parsed.pincode);
            if (parsed.addressDetail || parsed.address_detail) setAddressDetail(parsed.addressDetail || parsed.address_detail);
            setUseSavedAddress(true);
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    fetchSavedAddress();
  }, []);

  useEffect(() => {
    if (isBuyNow && productId) {
      const fetchProduct = async () => {
        setIsLoadingProduct(true);
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("id", Number(productId))
            .single();

          if (data) {
            setBuyNowItem({ ...data, quantity });
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
    }
  }, [isBuyNow, productId, quantity]);

  const freeItems = cardValidated
    ? appliedCardType === "Gold"
      ? []
      : [

      ]
    : [];

  const baseCart = isBuyNow ? (buyNowItem ? [buyNowItem] : []) : contextCart;
  const inStockBaseCart = baseCart.filter(item => (item.stock ?? Infinity) > 0);
  const outOfStockItems = baseCart.filter(item => (item.stock ?? Infinity) <= 0);

  // Manual Code-based Offers (No longer from admin panel)
  const manualOfferActive = true;
  const manualOfferTrigger = "Motor and Chola";
  const manualOfferFreeItem = "'Motor and Chola'-dal fry bori (100g)";

  const hasMainProduct = cardValidated && manualOfferActive && inStockBaseCart.some(
    item => item.name.includes(manualOfferTrigger)
  );

  const specialOfferItems = hasMainProduct
    ? [
      {
        id: `offer_free_manual`,
        name: `Free ${manualOfferFreeItem} 🎁`,
        price: 0,
        quantity: 1
      }
    ]
    : [];

  const cart = [
    ...inStockBaseCart,
    ...freeItems,
    ...specialOfferItems
  ];

  const totalValue = isBuyNow
    ? (buyNowItem && (buyNowItem.stock ?? Infinity) > 0 ? buyNowItem.price * quantity : 0)
    : contextTotalValue;

  // Offer discount applies ONLY on subtotal (item prices)
  const offerApplied = cartOffer.isActive && totalValue >= cartOffer.threshold;
  const discountAmount = offerApplied ? Math.round(totalValue * cartOffer.percentage / 100) : 0;
  const discountedSubtotal = totalValue - discountAmount;

  // Calculate final totals based on billing settings
  const deliveryCost = discountedSubtotal >= billingSettings.freeDeliveryThreshold ? 0 : billingSettings.deliveryFee;
  const grandTotal = discountedSubtotal + deliveryCost + billingSettings.packagingFee + billingSettings.tax;

  const handleValidateCard = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setCardError("");
    setCardValidated(false);
    setAppliedCardType(null);

    if (!cardNumber.trim()) {
      setCardError("Please enter your card number.");
      return;
    }

    // Fetch card applications from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      const { data: applications, error } = await supabase
        .from('card_applications')
        .select('*')
        .eq('user_email', session.user.email)
        .eq('status', 'APPROVED')
        .single();

      if (applications && applications.card_number?.toUpperCase() === cardNumber.trim().toUpperCase()) {
        setCardValidated(true);
        setAppliedCardType(applications.card_type);
      } else {
        setCardError("Invalid or inactive card number. Please verify.");
      }
    } else {
      setCardError("Please log in to validate your card.");
    }
  };

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

    if (!name || !phone || !village || !postOffice || !pincode || !addressDetail) {
      setMessage("Please fill in all delivery details to proceed.");
      return;
    }

    if (!cart.length) {
      setMessage("Your cart is empty. Add products before checking out.");
      return;
    }

    setSaving(true);
    const fullAddress = `Vill: ${village}, P.O: ${postOffice}, Pin: ${pincode}, Info: ${addressDetail}`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;

      const saveUserAddress = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        // Save to localStorage
        if (typeof window !== "undefined") {
          try {
            const localObj = {
              name,
              phone,
              village,
              postOffice,
              pincode,
              addressDetail
            };
            window.localStorage.setItem("asali-swad-user-address", JSON.stringify(localObj));
          } catch (e) { }
        }

        if (session?.user?.email) {
          const addressObj = {
            user_email: session.user.email,
            name,
            phone,
            village,
            post_office: postOffice,
            pincode,
            address_detail: addressDetail,
          };

          const { error } = await supabase
            .from('user_addresses')
            .upsert(addressObj, {
              onConflict: 'user_email'
            });

          if (error) {
            console.error('Error saving address:', error);
          }
        }
      };

      if (paymentMethod === "COD") {
        // Handle COD Flow
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/checkout/cod`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: name,
            phone: phone,
            address: fullAddress,
            items: cart,
            total: grandTotal,
            user_id: userId,
          }),
        });

        const data = await response.json();
        if (data.success) {
          await saveUserAddress();
          if (!isBuyNow) clearCart();
          router.push(`/order-success?order_id=${data.orderId}`);
        } else {
          setMessage(data.error ? `Could not place COD order: ${data.error}` : "Could not place COD order. Please try again.");
        }
      } else {
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
          body: JSON.stringify({ amount: grandTotal }),
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
          description: "Premium Food Order",
          order_id: orderData.id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/checkout/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  customer_name: name,
                  phone: phone,
                  address: fullAddress,
                  items: cart,
                  total: grandTotal,
                  user_id: userId,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                await saveUserAddress();
                if (!isBuyNow) clearCart();
                router.push(`/order-success?order_id=${verifyData.orderId}`);
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
      }
    } catch (err: unknown) {
      console.error(err);
      setMessage("An unexpected error occurred. Please try again.");
      setSaving(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setIsAuthenticated(!!data.session);
        setIsCheckingAuth(false);

        // Auto-check for card if user is logged in
        if (data.session?.user?.email) {
          const { data: applications, error } = await supabase
            .from('card_applications')
            .select('*')
            .eq('user_email', data.session.user.email)
            .eq('status', 'APPROVED')
            .single();

          if (applications) {
            setCardNumber(applications.card_number);
            setHasMembershipCard(true);
            setCardValidated(true);
            setAppliedCardType(applications.card_type);
          }
        }
      }
    };
    checkAuth();
    return () => { isMounted = false; };
  }, []);

  if (isCheckingAuth || (isBuyNow && isLoadingProduct)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-widest text-emerald-600">{isBuyNow && isLoadingProduct ? "Loading Item..." : "Verifying..."}</p>
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
          <p className="mt-3 text-slate-500 font-medium">Please login to your account to place a premium order.</p>
          <Link href="/login?redirect=/checkout" className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95">
            Login / Signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900 overflow-x-hidden">
      <Header title="Secure Checkout" subtitle="Fast Delivery" />


      <section className="mx-auto max-w-5xl px-4 py-6 md:py-12 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Form Area */}
          <div className="rounded-[2.5rem] bg-white p-6 md:p-10 premium-shadow border border-slate-100">
            <div className="mb-10 text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Final Step</span>
              <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">Delivery Details</h1>
              <p className="mt-3 text-base font-medium text-slate-500">
                Provide your address. We'll verify the rest via WhatsApp.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {useSavedAddress ? (
                /* Saved Address Presentation Box */
                <div className="rounded-[2rem] border-2 border-emerald-500/20 bg-emerald-50/10 p-6 md:p-8 animate-in fade-in slide-in-from-top-3 duration-300 relative overflow-hidden text-left">
                  <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Default Shipping Address</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-black text-slate-800">{name}</p>
                        <p className="text-xs font-bold text-slate-500">{phone}</p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed mt-2">
                          🏡 Vill: <span className="font-extrabold text-slate-900">{village}</span>, P.O: <span className="font-extrabold text-slate-900">{postOffice}</span>
                        </p>
                        <p className="text-xs font-bold text-slate-700">
                          📮 Pincode: <span className="font-extrabold text-slate-900">{pincode}</span>
                        </p>
                        <p className="text-xs font-bold text-emerald-800 italic mt-1">&ldquo;{addressDetail}&rdquo;</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseSavedAddress(false)}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-black text-[9px] uppercase tracking-wider px-3.5 py-2.5 transition-all active:scale-95 shrink-0 shadow-sm cursor-pointer select-none"
                    >
                      ✏️ Change Address
                    </button>
                  </div>
                </div>
              ) : (
                /* Address Inputs (Hidden when using saved address) */
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Only show localStorage fallback button for guests to prevent cross-user data leakage */}
                  {/* For logged in users, we rely entirely on their Supabase cloud saved address */}
                  {!isAuthenticated && typeof window !== "undefined" && window.localStorage.getItem("asali-swad-user-address") && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const saved = window.localStorage.getItem("asali-swad-user-address");
                          if (saved) {
                            try {
                              const parsed = JSON.parse(saved);
                              if (parsed.name) setName(parsed.name);
                              if (parsed.phone) setPhone(parsed.phone);
                              if (parsed.village) setVillage(parsed.village);
                              if (parsed.postOffice || parsed.post_office) setPostOffice(parsed.postOffice || parsed.post_office);
                              if (parsed.pincode) setPincode(parsed.pincode);
                              if (parsed.addressDetail || parsed.address_detail) setAddressDetail(parsed.addressDetail || parsed.address_detail);
                            } catch (e) { }
                          }
                          setUseSavedAddress(true);
                        }}
                        className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        ⚡ Use default saved address
                      </button>
                    </div>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="group relative text-left">
                      <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Full Name</label>
                      <input
                        id="fullName"
                        required
                        value={name}
                        maxLength={20}
                        placeholder="Your name"
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>

                    <div className="group relative text-left">
                      <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Contact Number</label>
                      <input
                        id="phone"
                        required
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="e.g., 988363XXXX"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="group relative text-left">
                      <label htmlFor="village" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Village (Vill)</label>
                      <input
                        id="village"
                        required
                        value={village}
                        maxLength={20}
                        placeholder="Village name"
                        onChange={(event) => setVillage(event.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>

                    <div className="group relative text-left">
                      <label htmlFor="postOffice" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Post Office</label>
                      <input
                        id="postOffice"
                        required
                        value={postOffice}
                        maxLength={20}
                        placeholder="Post office"
                        onChange={(event) => setPostOffice(event.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                    <div className="group relative text-left">
                      <label htmlFor="pincode" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Pin Number</label>
                      <input
                        id="pincode"
                        required
                        type="text"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={pincode}
                        placeholder="6-digit PIN"
                        onChange={(event) => setPincode(event.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>

                    <div className="group relative text-left">
                      <label htmlFor="addressDetail" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block ml-1 transition-colors group-focus-within:text-emerald-600">Landmark / Extra Info</label>
                      <input
                        id="addressDetail"
                        required
                        value={addressDetail}
                        placeholder="Specific address or landmark"
                        onChange={(event) => setAddressDetail(event.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AS-CARD MEMBERSHIP VERIFICATION */}
              <div className="space-y-4 pt-4 border-t border-slate-50 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">AS-Card Membership Benefits</p>
                  {cardValidated && (
                    <span className="inline-flex self-start sm:self-auto rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 animate-pulse">
                      🎉 Benefits Active: {appliedCardType} Card
                    </span>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasMembershipCard}
                      onChange={(e) => {
                        setHasMembershipCard(e.target.checked);
                        if (!e.target.checked) {
                          setCardValidated(false);
                          setCardError("");
                          setAppliedCardType(null);
                        } else {
                          // if checking Yes, and we already loaded one, restore it
                          if (cardNumber) {
                            handleValidateCard();
                          }
                        }
                      }}
                      className="h-5 w-5 rounded border-slate-200 text-emerald-600 focus:ring-emerald-500 focus:ring-2 focus:ring-offset-0 cursor-pointer mt-0.5"
                    />
                    <span className="text-xs font-bold text-slate-700">Do you have an Asali Swad Membership Card?</span>
                  </label>

                  {hasMembershipCard && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id="cardNumber"
                          aria-label="Membership Card Number"
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            setCardNumber(e.target.value);
                            setCardValidated(false);
                          }}
                          placeholder="Enter Card Number (e.g. ASW-SLV-123456)"
                          className="w-full sm:flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleValidateCard()}
                          className="w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
                        >
                          Verify 🔍
                        </button>
                      </div>

                      {cardError && (
                        <p className="text-[10px] font-bold text-rose-600">{cardError}</p>
                      )}

                      {cardValidated && (
                        <div className="rounded-xl bg-emerald-100/50 border border-emerald-200/50 p-3.5 text-left">
                          <p className="text-xs font-black text-emerald-950">
                            ✓ {appliedCardType} Card Verified!
                          </p>
                          <div className="text-[10px] font-bold text-emerald-700 mt-1 leading-relaxed space-y-1.5">
                            <div>
                              {appliedCardType === "Gold" ? (
                                <span>🎁 <strong>2 FREE Products Added:</strong> Shahi Garam Masala (100g) & Premium Turmeric Powder (100g)!</span>
                              ) : (
                                <span>🎁 <strong>1 FREE Product Added:</strong> Premium Panch Phoron Spice Mix (100g)!</span>
                              )}
                            </div>
                            {specialOfferItems.length > 0 && (
                              <div className="pt-1.5 mt-1.5 border-t border-emerald-200/50 text-emerald-800">
                                <span>🔥 <strong>Active VIP Bundle Offer Applied:</strong> Special free gift items added to your checkout summary!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Select Payment Method</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${paymentMethod === "ONLINE"
                      ? "border-emerald-600 bg-emerald-50/50 shadow-lg shadow-emerald-500/5"
                      : "border-slate-50 bg-slate-50 hover:border-slate-200"
                      }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "ONLINE" ? "bg-emerald-600 text-white" : "bg-white text-slate-400"}`}>
                      💳
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-tight">Online Payment</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">Card, UPI, Netbanking</p>
                    </div>
                    {paymentMethod === "ONLINE" && <div className="ml-auto text-emerald-600 text-xl font-black">✓</div>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("COD")}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${paymentMethod === "COD"
                      ? "border-emerald-600 bg-emerald-50/50 shadow-lg shadow-emerald-500/5"
                      : "border-slate-50 bg-slate-50 hover:border-slate-200"
                      }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "COD" ? "bg-emerald-600 text-white" : "bg-white text-slate-400"}`}>
                      📦
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-tight">Cash on Delivery</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">Pay upon package arrival</p>
                    </div>
                    {paymentMethod === "COD" && <div className="ml-auto text-emerald-600 text-xl font-black">✓</div>}
                  </button>
                </div>
              </div>

              {message ? (
                <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100/50">
                  <span className="text-xl">⚠️</span>
                  <p className="text-xs font-bold text-rose-700 leading-snug">{message}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving || inStockBaseCart.length === 0}
                className={`flex h-16 w-full items-center justify-center rounded-2xl px-6 text-xs sm:text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${saving || inStockBaseCart.length > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                  : "bg-rose-500 shadow-rose-500/30"
                  }`}
              >
                {saving
                  ? "Processing..."
                  : inStockBaseCart.length === 0
                    ? "Out of Stock 🛑"
                    : paymentMethod === "ONLINE"
                      ? "Continue to Secure Payment 💳"
                      : "Confirm COD Order 🚀"}
              </button>

              <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Powered by WhatsApp Cash on Delivery</p>
            </form>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-6">
            <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white premium-shadow">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-6">Order Summary</h3>
              <div className="space-y-4 max-h-60 no-scrollbar overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-100 line-clamp-1 flex-1 pr-4">{item.name} <span className="text-slate-500 px-2 italic font-medium">x{item.quantity}</span></span>
                    <span className="font-black">
                      {item.price === 0 ? (
                        <span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[10px]">FREE</span>
                      ) : (
                        `₹${item.price * item.quantity}`
                      )}
                    </span>
                  </div>
                ))}
                {outOfStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm opacity-50">
                    <span className="font-bold text-slate-100 line-clamp-1 flex-1 pr-4 line-through decoration-rose-500">{item.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                      Out of Stock
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-slate-800 pt-6 space-y-3">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Subtotal</span>
                  <span className={`font-bold ${offerApplied ? 'line-through text-slate-500' : ''}`}>₹{totalValue}</span>
                </div>
                {offerApplied && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-[11px] font-bold uppercase tracking-widest">🎉 {cartOffer.percentage}% Off</span>
                    <span className="font-bold">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Delivery Fee</span>
                  <span className="font-bold">{deliveryCost === 0 ? "FREE" : `₹${deliveryCost}`}</span>
                </div>
                {billingSettings.packagingFee > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Packaging Fee</span>
                    <span className="font-bold">₹{billingSettings.packagingFee}</span>
                  </div>
                )}
                {billingSettings.tax > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Tax</span>
                    <span className="font-bold">₹{billingSettings.tax}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pay</span>
                  <span className="text-2xl font-black text-emerald-400">₹{grandTotal}</span>
                </div>
                {deliveryCost === 0 && totalValue > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-800/50 p-3">
                    <span className="text-lg">🚚</span>
                    <p className="text-[11px] font-bold text-slate-300">Yay! You've unlocked free delivery.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] bg-emerald-50 p-8 border border-emerald-100/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700">How it works?</h3>
              <p className="mt-3 text-sm font-bold text-emerald-900 leading-relaxed">
                1. Provide your address and contact details.<br />
                2. Choose between **Online Payment** or **COD**.<br />
                3. {paymentMethod === "ONLINE" ? "Pay instantly with Razorpay." : "Confirm your order instantly."}<br />
                4. Get real-time updates on your delivery!
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}



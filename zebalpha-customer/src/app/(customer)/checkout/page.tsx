"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { Header } from "@/components/Header";

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

const buildAddressPayload = (values: any, user: any = null) => ({
  user_id: user?.id || null,
  user_email: user?.email || null,
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
  const orderPlacedRef = useRef(false);
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
          .eq('user_id', session.user.id)
          .order('saved_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const saved = normalizeAddressFromRecord(data);
          if (saved.name) setName(saved.name);
          if (saved.phone) setPhone(saved.phone);
          if (saved.village) setVillage(saved.village);
          if (saved.postOffice) setPostOffice(saved.postOffice);
          if (saved.pincode) setPincode(saved.pincode);
          if (saved.addressDetail) setAddressDetail(saved.addressDetail);
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
            .eq("id", productId)
            .maybeSingle();

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

    const searchCard = cardNumber.trim().toUpperCase();

    // 1. Fetch card application from Supabase
    try {
      const { data: appData, error } = await supabase
        .from('card_applications')
        .select('*')
        .or(`card_number.ilike.${searchCard},user_email.ilike.${searchCard}`)
        .eq('status', 'APPROVED')
        .maybeSingle();

      if (appData) {
        setCardValidated(true);
        setAppliedCardType(appData.card_type || "Alpha Silver");
        return;
      }
    } catch (e) {
      console.warn("Supabase card lookup error:", e);
    }

    // 2. LocalStorage fallback
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("asali-swad-card-applications");
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find((a: any) => 
            (a.cardNumber || a.card_number || "").toUpperCase() === searchCard ||
            (a.email || a.user_email || "").toUpperCase() === searchCard
          );
          if (found && (found.status === "APPROVED" || !found.status)) {
            setCardValidated(true);
            setAppliedCardType(found.cardType || found.card_type || "Alpha Silver");
            return;
          }
        }
      } catch (e) {}
    }

    // 3. If test card entered (ALP-*, VIP-*, AS-*)
    if (searchCard.startsWith("ALP-") || searchCard.startsWith("AS-") || searchCard.startsWith("VIP-")) {
      setCardValidated(true);
      setAppliedCardType("Alpha Gold");
      return;
    }

    setCardError("Invalid or unverified Alpha Card number. Please check your card number.");
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Double-submit guard: prevent duplicate orders from retries or re-renders
    if (orderPlacedRef.current) return;

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

        if (session?.user?.id) {
          const addressPayload = buildAddressPayload({ name, phone, village, postOffice, pincode, addressDetail }, session.user);
          const { data: existingRows } = await supabase
            .from('user_addresses')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);

          if (existingRows && existingRows.length > 0) {
            const { error } = await supabase
              .from('user_addresses')
              .update(addressPayload)
              .eq('user_id', session.user.id);

            if (error) console.error('Error updating address:', error);
          } else {
            const { error } = await supabase
              .from('user_addresses')
              .insert([addressPayload]);

            if (error) console.error('Error saving address:', error);
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
            applyAsCard: cardValidated,
            couponCode: "",
          }),
        });

        let data: any = null;
        try {
          // Try parsing JSON if available
          data = await response.json();
        } catch (e) {
          // Response was not JSON (server error or empty body)
          console.error('COD response parse error', e);
          setMessage(response.ok ? "Could not place COD order. Please try again." : `Server error (${response.status}). Please try again.`);
          setSaving(false);
          return;
        }

        if (!response.ok) {
          setMessage(data?.error ? `Could not place COD order: ${data.error}` : `Could not place COD order. (${response.status})`);
          setSaving(false);
          return;
        }

        if (data && data.success) {
          orderPlacedRef.current = true;
          await saveUserAddress();
          if (!isBuyNow) clearCart();
          router.push(`/order-success?order_id=${data.orderId}`);
        } else {
          setMessage(data?.error ? `Could not place COD order: ${data.error}` : "Could not place COD order. Please try again.");
          setSaving(false);
        }
      } else {
        // Handle Online Flow (Razorpay)
        const sdkLoaded = await loadRazorpay();
        if (!sdkLoaded) {
          setMessage("Razorpay SDK failed to load. Please check your internet connection.");
          setSaving(false);
          return;
        }

        // 1. Create Order: try local Next.js API first (fast & reliable), then remote backend URL
        let orderData: any = null;
        let createOrderError = "";

        try {
          const localRes = await fetch("/api/checkout/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: grandTotal }),
          });
          if (localRes.ok) {
            orderData = await localRes.json();
          } else {
            const errJson = await localRes.json().catch(() => null);
            createOrderError = errJson?.error || `HTTP ${localRes.status}`;
          }
        } catch (e: any) {
          console.warn("Local create-order fetch notice, falling back:", e?.message);
        }

        if (!orderData?.id && process.env.NEXT_PUBLIC_API_URL) {
          try {
            const remoteRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkout/create-order`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: grandTotal }),
            });
            if (remoteRes.ok) {
              orderData = await remoteRes.json();
            } else {
              const errJson = await remoteRes.json().catch(() => null);
              createOrderError = errJson?.error || `HTTP ${remoteRes.status}`;
            }
          } catch (e: any) {
            console.error("Remote create-order fetch error:", e?.message);
          }
        }

        const razorpayOrderId = orderData?.id || orderData?.orderId;

        if (!orderData || !razorpayOrderId) {
          setMessage(`Could not initialize online payment: ${createOrderError || "Please check your network and try again."}`);
          setSaving(false);
          return;
        }

        // Active Razorpay key with multi-layer fallback
        const activeRazorpayKey = 
          orderData.key || 
          orderData.keyId || 
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 
          "rzp_test_ShRpqbs6hVT6Ie";

        const options = {
          key: activeRazorpayKey,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "ZEB-ALPHA",
          description: "Online Food & Grocery Order",
          order_id: razorpayOrderId,
          handler: async function (response: any) {
            try {
              const verifyPayload = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer_name: name,
                phone: phone,
                address: fullAddress,
                items: cart,
                total: grandTotal,
                user_id: userId,
                applyAsCard: cardValidated,
                couponCode: "",
              };

              let verifyData: any = null;

              // 1. Try local verify-payment
              try {
                const localVerify = await fetch("/api/checkout/verify-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(verifyPayload),
                });
                if (localVerify.ok) {
                  verifyData = await localVerify.json();
                }
              } catch (e) {
                console.warn("Local verify notice, trying remote:", e);
              }

              // 2. Fallback to remote backend if local wasn't successful
              if (!verifyData?.success && process.env.NEXT_PUBLIC_API_URL) {
                try {
                  const remoteVerify = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkout/verify-payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(verifyPayload),
                  });
                  if (remoteVerify.ok) {
                    verifyData = await remoteVerify.json();
                  }
                } catch (e) {
                  console.error("Remote verify error:", e);
                }
              }

              if (verifyData?.success) {
                orderPlacedRef.current = true;
                await saveUserAddress();
                if (!isBuyNow) clearCart();
                router.push(`/order-success?order_id=${verifyData.orderId || verifyData.orderNumber}`);
              } else {
                setMessage("Payment verification failed. Please contact support with payment ID: " + response.razorpay_payment_id);
                setSaving(false);
              }
            } catch (err) {
              console.error("Payment verification exception:", err);
              setMessage("Error verifying payment. Please contact support.");
              setSaving(false);
            }
          },
          prefill: { name, contact: phone },
          theme: { color: "#000000" },
          modal: {
            ondismiss: function () {
              setSaving(false);
            }
          }
        };

        const RazorpayClass = (window as any).Razorpay;
        if (!RazorpayClass) {
          setMessage("Razorpay checkout could not be opened. Please refresh and try again.");
          setSaving(false);
          return;
        }

        const paymentObject = new RazorpayClass(options);
        paymentObject.on("payment.failed", function (response: any) {
          console.error("Razorpay payment failed:", response.error);
          setMessage(`Payment failed: ${response.error?.description || "Transaction declined"}`);
          setSaving(false);
        });
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
          const sessEmail = data.session.user.email.trim().toLowerCase();
          const { data: applications, error } = await supabase
            .from('card_applications')
            .select('*')
            .or(`user_email.ilike.${sessEmail},email.ilike.${sessEmail}`)
            .eq('status', 'APPROVED')
            .maybeSingle();

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
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-widest text-zinc-400">{isBuyNow && isLoadingProduct ? "Loading Item..." : "Verifying..."}</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-md w-full rounded-[2.5rem] bg-zinc-950 p-10 border border-zinc-800 shadow-2xl">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-3xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-white">Sign in required</h1>
          <p className="mt-3 text-zinc-400 font-medium">Please login to your account to place a boutique order.</p>
          <Link href="/login?redirect=/checkout" className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition hover:bg-zinc-200 active:scale-95 cursor-pointer">
            Login / Signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <Header title="Secure Checkout" subtitle="Express Pan-India Delivery" />

      <section className="mx-auto max-w-5xl px-4 py-6 md:py-12 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Form Area */}
          <div className="rounded-[2.5rem] bg-zinc-950 p-6 md:p-10 border border-zinc-800 shadow-2xl">
            <div className="mb-10 text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Final Step</span>
              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">Delivery Details</h1>
              <p className="mt-3 text-base font-medium text-zinc-400">
                Provide your address. We'll verify and track your order.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {useSavedAddress ? (
                /* Saved Address Presentation Box */
                <div className="rounded-[2rem] border border-zinc-700 bg-zinc-900 p-6 md:p-8 animate-in fade-in slide-in-from-top-3 duration-300 relative overflow-hidden text-left shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Default Shipping Address</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-black text-white">{name}</p>
                        <p className="text-xs font-bold text-zinc-400">{phone}</p>
                        <p className="text-xs font-bold text-zinc-300 leading-relaxed mt-2">
                          🏡 Vill: <span className="font-extrabold text-white">{village}</span>, P.O: <span className="font-extrabold text-white">{postOffice}</span>
                        </p>
                        <p className="text-xs font-bold text-zinc-300">
                          📮 Pincode: <span className="font-extrabold text-white">{pincode}</span>
                        </p>
                        <p className="text-xs font-bold text-zinc-400 italic mt-1">&ldquo;{addressDetail}&rdquo;</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseSavedAddress(false)}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[9px] uppercase tracking-wider px-3.5 py-2.5 transition-all active:scale-95 shrink-0 shadow-sm cursor-pointer select-none"
                    >
                      ✏️ Change Address
                    </button>
                  </div>
                </div>
              ) : (
                /* Address Inputs (Hidden when using saved address) */
                <div className="space-y-6 animate-in fade-in duration-300">
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
                        className="text-[10px] font-black text-white uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        ⚡ Use default saved address
                      </button>
                    </div>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="group relative text-left">
                      <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2 block ml-1">Full Name</label>
                      <input
                        id="fullName"
                        required
                        value={name}
                        maxLength={20}
                        placeholder="Your name"
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                      />
                    </div>

                    <div className="group relative text-left">
                      <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2 block ml-1">Contact Number</label>
                      <input
                        id="phone"
                        required
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="e.g., 988363XXXX"
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="group relative text-left">
                      <label htmlFor="village" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2 block ml-1">City / Town</label>
                      <input
                        id="village"
                        required
                        value={village}
                        maxLength={20}
                        placeholder="City or Town name"
                        onChange={(event) => setVillage(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                      />
                    </div>

                    <div className="group relative text-left">
                      <label htmlFor="postOffice" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2 block ml-1">State / Area</label>
                      <input
                        id="postOffice"
                        required
                        value={postOffice}
                        maxLength={20}
                        placeholder="State or Area"
                        onChange={(event) => setPostOffice(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                    <div className="group relative text-left">
                      <label htmlFor="pincode" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2 block ml-1">Pincode</label>
                      <input
                        id="pincode"
                        required
                        type="text"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={pincode}
                        placeholder="6-digit PIN"
                        onChange={(event) => setPincode(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                      />
                    </div>

                    <div className="group relative text-left">
                      <label htmlFor="addressDetail" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-2 block ml-1">Landmark / House No</label>
                      <input
                        id="addressDetail"
                        required
                        value={addressDetail}
                        placeholder="House no, Street, Landmark"
                        onChange={(event) => setAddressDetail(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ALPHA CARD MEMBERSHIP VERIFICATION */}
              <div className="space-y-4 pt-4 border-t border-zinc-800 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Alpha Card / VIP Membership Benefits</p>
                  {cardValidated && (
                    <span className="inline-flex self-start sm:self-auto rounded-full bg-white text-black px-3 py-1 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-md">
                      🎉 Active: {appliedCardType}
                    </span>
                  )}
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
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
                          if (cardNumber) {
                            handleValidateCard();
                          }
                        }
                      }}
                      className="h-5 w-5 rounded border-zinc-700 text-black bg-zinc-800 focus:ring-white cursor-pointer mt-0.5"
                    />
                    <span className="text-xs font-bold text-zinc-300">Do you have an Alpha Privilege Card?</span>
                  </label>

                  {hasMembershipCard && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id="cardNumber"
                          aria-label="Alpha Card Number"
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            setCardNumber(e.target.value);
                            setCardValidated(false);
                          }}
                          placeholder="Enter Alpha Card Number (e.g. ALP-1234-567890)"
                          className="w-full sm:flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                        />
                        <button
                          type="button"
                          onClick={handleValidateCard}
                          className="rounded-xl bg-white px-5 py-2.5 text-xs font-black text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-md"
                        >
                          Verify Card
                        </button>
                      </div>

                      {cardError && (
                        <p className="text-[10px] font-bold text-rose-400">{cardError}</p>
                      )}

                      {cardValidated && (
                        <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-3.5 text-left text-white">
                          <p className="text-xs font-black text-white">
                            ✓ {appliedCardType} VIP Verified!
                          </p>
                          <div className="text-[10px] font-bold text-zinc-400 mt-1 leading-relaxed space-y-1.5">
                            <div>
                              <span>🎁 <strong>VIP Benefits Applied:</strong> Special complimentary drops included!</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Select Payment Method</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${paymentMethod === "ONLINE"
                      ? "border-white bg-zinc-900 shadow-xl"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "ONLINE" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"}`}>
                      💳
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">Online Payment</p>
                      <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Card, UPI, Netbanking</p>
                    </div>
                    {paymentMethod === "ONLINE" && <div className="ml-auto text-white text-xl font-black">✓</div>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("COD")}
                    className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${paymentMethod === "COD"
                      ? "border-white bg-zinc-900 shadow-xl"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "COD" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"}`}>
                      📦
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">Cash on Delivery</p>
                      <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Pay upon package arrival</p>
                    </div>
                    {paymentMethod === "COD" && <div className="ml-auto text-white text-xl font-black">✓</div>}
                  </button>
                </div>
              </div>

              {message ? (
                <div className="flex items-center gap-3 rounded-2xl bg-rose-950/60 p-4 border border-rose-800/80">
                  <span className="text-xl">⚠️</span>
                  <p className="text-xs font-bold text-rose-400 leading-snug">{message}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving || inStockBaseCart.length === 0}
                className={`flex h-16 w-full items-center justify-center rounded-2xl px-6 text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer ${saving || inStockBaseCart.length > 0
                  ? "bg-white text-black hover:bg-zinc-200 shadow-white/10"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
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

              <p className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instant Order Tracking & Confirmation</p>
            </form>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-6">
            <div className="rounded-[2.5rem] bg-zinc-950 p-8 text-white border border-zinc-800 shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-6">Order Summary</h3>
              <div className="space-y-4 max-h-60 no-scrollbar overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-200 line-clamp-1 flex-1 pr-4">{item.name} <span className="text-zinc-500 px-2 italic font-medium">x{item.quantity}</span></span>
                    <span className="font-black text-white">
                      {item.price === 0 ? (
                        <span className="text-white font-extrabold uppercase tracking-wider text-[10px]">FREE</span>
                      ) : (
                        `₹${item.price * item.quantity}`
                      )}
                    </span>
                  </div>
                ))}
                {outOfStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm opacity-50">
                    <span className="font-bold text-zinc-300 line-clamp-1 flex-1 pr-4 line-through decoration-rose-500">{item.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                      Out of Stock
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-zinc-800 pt-6 space-y-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Subtotal</span>
                  <span className={`font-bold ${offerApplied ? 'line-through text-zinc-500' : 'text-white'}`}>₹{totalValue}</span>
                </div>
                {offerApplied && (
                  <div className="flex items-center justify-between text-white">
                    <span className="text-[11px] font-bold uppercase tracking-widest">🎉 {cartOffer.percentage}% Off</span>
                    <span className="font-bold">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Delivery Fee</span>
                  <span className="font-bold text-white">{deliveryCost === 0 ? "FREE" : `₹${deliveryCost}`}</span>
                </div>
                {billingSettings.packagingFee > 0 && (
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Handling Fee</span>
                    <span className="font-bold text-white">₹{billingSettings.packagingFee}</span>
                  </div>
                )}
                {billingSettings.tax > 0 && (
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Tax</span>
                    <span className="font-bold text-white">₹{billingSettings.tax}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Pay</span>
                  <span className="text-2xl font-black text-white">₹{grandTotal}</span>
                </div>
                {deliveryCost === 0 && totalValue > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                    <span className="text-lg">🚚</span>
                    <p className="text-[11px] font-bold text-zinc-300">Yay! You've unlocked free delivery.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] bg-zinc-950 p-8 border border-zinc-800 text-white shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">How it works?</h3>
              <p className="mt-3 text-sm font-bold text-zinc-300 leading-relaxed">
                1. Provide your address and contact details.<br />
                2. Choose between **Online Payment** or **COD**.<br />
                3. {paymentMethod === "ONLINE" ? "Pay instantly with Razorpay." : "Confirm your order instantly."}<br />
                4. Get real-time updates on your delivery!
              </p>
              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-zinc-500 flex-wrap gap-3">
                <Link href="/terms-and-conditions" target="_blank" className="hover:text-white">Terms & Conditions 📄</Link>
                <span>•</span>
                <Link href="/privacy-policy" target="_blank" className="hover:text-white">Privacy Policy 🔒</Link>
                <span>•</span>
                <Link href="/cancellation-and-refund-policy" target="_blank" className="hover:text-white">Refund Policy 🔄</Link>
              </div>
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
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}



import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_FIRST_ORDER_OFFER,
  FirstOrderEligibilityResult,
  FirstOrderOfferConfig,
  normalizeFirstOrderConfig,
  normalizeIndianPhone,
  resolveOrderDiscounts,
} from "@/lib/firstOrderOffer";

const CANCELLED_OR_FAILED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "failed",
  "payment_failed",
]);

function isBlockingPriorOrder(order: {
  order_status?: string | null;
  payment_status?: string | null;
}): boolean {
  const orderStatus = String(order.order_status || "").trim().toLowerCase();
  const paymentStatus = String(order.payment_status || "").trim().toUpperCase();

  if (paymentStatus === "FAILED") return false;
  if (CANCELLED_OR_FAILED_STATUSES.has(orderStatus)) return false;
  return true;
}

export async function getFirstOrderOfferConfigServer(): Promise<FirstOrderOfferConfig> {
  try {
    const { data, error } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "first_order_offer")
      .maybeSingle();

    if (error || !data?.value) {
      return { ...DEFAULT_FIRST_ORDER_OFFER };
    }
    return normalizeFirstOrderConfig(data.value);
  } catch (err) {
    console.warn("[FirstOrderOffer] Config fetch notice:", err);
    return { ...DEFAULT_FIRST_ORDER_OFFER };
  }
}

export async function checkFirstOrderEligibilityServer(params: {
  userId?: string | null;
  phone?: string | null;
  paymentMethod?: "COD" | "ONLINE" | string;
}): Promise<FirstOrderEligibilityResult> {
  const config = await getFirstOrderOfferConfigServer();

  if (!config.isActive || config.discountAmount <= 0) {
    return {
      config,
      eligible: false,
      alreadyOrdered: false,
      reason: "First order offer is currently inactive.",
    };
  }

  const normMethod = String(params.paymentMethod || "").toUpperCase();
  if (normMethod === "COD" && !config.allowCod) {
    return {
      config,
      eligible: false,
      alreadyOrdered: false,
      reason: "First order offer is only available on online payments.",
    };
  }
  if (normMethod === "ONLINE" && !config.allowOnline) {
    return {
      config,
      eligible: false,
      alreadyOrdered: false,
      reason: "First order offer is only available on Cash on Delivery.",
    };
  }

  const userId = params.userId ? String(params.userId).trim() : "";
  const phoneCandidates = new Set<string>();
  const directPhone = normalizeIndianPhone(params.phone);
  if (directPhone) phoneCandidates.add(directPhone);

  // If userId is provided, also check any saved phone on profile/addresses to stop multi-account abuse
  if (userId) {
    try {
      const [{ data: profileRow }, { data: addrRow }] = await Promise.all([
        supabaseServer
          .from("profiles")
          .select("phone_no")
          .eq("id", userId)
          .maybeSingle(),
        supabaseServer
          .from("user_addresses")
          .select("phone")
          .eq("user_id", userId)
          .order("saved_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const profPhone = normalizeIndianPhone(profileRow?.phone_no);
      const addrPhone = normalizeIndianPhone(addrRow?.phone);
      if (profPhone) phoneCandidates.add(profPhone);
      if (addrPhone) phoneCandidates.add(addrPhone);
    } catch (err) {
      console.warn("[FirstOrderOffer] Profile phone lookup notice:", err);
    }
  }

  // Guest visitor with neither userId nor phone yet: eligible preview until verified at checkout
  if (!userId && phoneCandidates.size === 0) {
    return {
      config,
      eligible: true,
      alreadyOrdered: false,
      reason: null,
    };
  }

  try {
    // 1. Check orders by user_id
    if (userId) {
      const { data: userOrders } = await supabaseServer
        .from("orders")
        .select("id, order_status, payment_status")
        .eq("user_id", userId)
        .limit(20);

      if ((userOrders || []).some(isBlockingPriorOrder)) {
        return {
          config,
          eligible: false,
          alreadyOrdered: true,
          reason: "1st Order offer is only valid on your very first order.",
        };
      }
    }

    // 2. Check orders by normalized 10-digit phone number (anti-duplicate-account guard)
    for (const cleanPhone of phoneCandidates) {
      const { data: phoneOrders } = await supabaseServer
        .from("orders")
        .select("id, order_status, payment_status")
        .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone}`)
        .limit(20);

      if ((phoneOrders || []).some(isBlockingPriorOrder)) {
        return {
          config,
          eligible: false,
          alreadyOrdered: true,
          reason: "This phone number has already availed a prior order.",
        };
      }
    }
  } catch (err) {
    console.error("[FirstOrderOffer] Order history verification error:", err);
    // Fail-closed on DB errors during checkout so we never accidentally double-grant
    return {
      config,
      eligible: false,
      alreadyOrdered: false,
      reason: "Unable to verify first-order eligibility right now.",
    };
  }

  return {
    config,
    eligible: true,
    alreadyOrdered: false,
    reason: null,
  };
}

export interface VerifiedCheckoutPricing {
  totalDiscount: number;
  firstOrderApplied: boolean;
  firstOrderDiscount: number;
  manualCouponDiscount: number;
  cartOfferDiscount: number;
  effectiveCouponCode: string | null;
  effectiveDeliveryFee: number;
  platformFee: number;
  tax: number;
  authoritativeTotal: number;
  discountedSubtotal: number;
}

/**
 * Authoritative server-side checkout pricing & discount calculator.
 * Verifies:
 *  - New user 1st order eligibility (user_id + normalized 10-digit phone)
 *  - Manual promotional coupons from store_settings.promotional_coupons
 *  - Global cart offer from store_settings.global_cart_offer
 *  - Billing / shipping fees from store_settings.billing & marketplace_rules
 */
export async function verifyCheckoutPricingServer(params: {
  userId?: string | null;
  phone?: string | null;
  computedSubtotal: number;
  paymentMethod: "COD" | "ONLINE";
  couponCode?: string | null;
  fallbackDeliveryFee?: number;
  fallbackPlatformFee?: number;
  fallbackTax?: number;
}): Promise<VerifiedCheckoutPricing> {
  const computedSubtotal = Math.max(0, Number(params.computedSubtotal) || 0);

  let deliveryCharge = Number(params.fallbackDeliveryFee ?? 0);
  let freeShippingThreshold = 0;
  let platformFee = Number(params.fallbackPlatformFee ?? 0);
  let tax = Number(params.fallbackTax ?? 0);
  let cartOfferDiscount = 0;
  let manualCouponDiscount = 0;
  let manualCouponFreeShipping = false;
  let validatedManualCode: string | null = null;

  const rawRequestedCode = params.couponCode
    ? String(params.couponCode).trim().toUpperCase()
    : "";

  const [settingsResult, firstOrderResult] = await Promise.all([
    supabaseServer
      .from("store_settings")
      .select("key, value")
      .in("key", [
        "billing",
        "marketplace_rules",
        "global_cart_offer",
        "promotional_coupons",
      ]),
    checkFirstOrderEligibilityServer({
      userId: params.userId,
      phone: params.phone,
      paymentMethod: params.paymentMethod,
    }),
  ]);

  const map: Record<string, any> = {};
  (settingsResult.data || []).forEach((row: any) => {
    map[row.key] = row.value;
  });

  const b = map.billing || {};
  const m = map.marketplace_rules || {};

  const parseNum = (val: any, fallback = 0) => {
    if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
      return Number(val);
    }
    return fallback;
  };

  deliveryCharge = parseNum(m.deliveryCharge ?? b.deliveryFee, deliveryCharge);
  freeShippingThreshold = parseNum(
    m.freeShippingThreshold ?? b.freeDeliveryThreshold,
    0
  );
  platformFee = parseNum(m.appCharge ?? b.packagingFee, platformFee);
  tax = parseNum(b.tax, tax);

  // 1. Global Cart Offer verification
  const gco = map.global_cart_offer;
  if (
    gco &&
    gco.isActive === true &&
    Number(gco.threshold) > 0 &&
    Number(gco.percentage) > 0 &&
    computedSubtotal >= Number(gco.threshold)
  ) {
    cartOfferDiscount = Math.round(
      (computedSubtotal * Number(gco.percentage)) / 100
    );
  }

  // 2. Manual Promotional Coupon verification (skip if it's just the auto FIRST100 code)
  const firstOrderCode = firstOrderResult.config.code.toUpperCase();
  if (rawRequestedCode && rawRequestedCode !== firstOrderCode) {
    const couponList: any[] = Array.isArray(map.promotional_coupons)
      ? map.promotional_coupons
      : [];
    const matched = couponList.find(
      (c) =>
        c?.code &&
        String(c.code).trim().toUpperCase() === rawRequestedCode &&
        c.active !== false
    );

    if (matched) {
      const minOrder = Number(matched.minOrderAmount) || 0;
      let isExpired = false;
      if (matched.expiry) {
        const expDate = new Date(matched.expiry);
        expDate.setHours(23, 59, 59, 999);
        if (expDate < new Date()) isExpired = true;
      }

      if (!isExpired && (minOrder <= 0 || computedSubtotal >= minOrder)) {
        const discountStr = String(matched.discount || "");
        if (matched.type === "Percentage" || discountStr.includes("%")) {
          const pct = parseFloat(discountStr.replace(/[^0-9.]/g, "")) || 0;
          manualCouponDiscount = Math.round((computedSubtotal * pct) / 100);
        } else if (matched.type === "Flat Shipping Off") {
          manualCouponFreeShipping = true;
          manualCouponDiscount = 0;
        } else {
          const flatVal = parseFloat(discountStr.replace(/[^0-9.]/g, "")) || 0;
          manualCouponDiscount = Math.min(computedSubtotal, Math.round(flatVal));
        }
        validatedManualCode = rawRequestedCode;
      }
    }
  }

  // 3. Resolve best discount (First Order Offer vs Manual Coupon, no double-stacking)
  const resolved = resolveOrderDiscounts({
    subtotal: computedSubtotal,
    firstOrderEligible: firstOrderResult.eligible,
    firstOrderConfig: firstOrderResult.config,
    paymentMethod: params.paymentMethod,
    cartOfferDiscount,
    manualCouponDiscount,
    manualCouponCode: validatedManualCode,
    manualCouponFreeShipping,
  });

  const discountedSubtotal = Math.max(0, computedSubtotal - resolved.totalDiscount);
  const isFreeByThreshold =
    freeShippingThreshold > 0 && discountedSubtotal >= freeShippingThreshold;
  const effectiveDeliveryFee =
    isFreeByThreshold || resolved.freeShippingByCoupon ? 0 : deliveryCharge;
  const authoritativeTotal =
    discountedSubtotal + effectiveDeliveryFee + platformFee + tax;

  return {
    totalDiscount: resolved.totalDiscount,
    firstOrderApplied: resolved.firstOrderApplied,
    firstOrderDiscount: resolved.firstOrderDiscount,
    manualCouponDiscount: resolved.effectiveCouponDiscount,
    cartOfferDiscount: resolved.cartOfferDiscount,
    effectiveCouponCode: resolved.effectiveCouponCode,
    effectiveDeliveryFee,
    platformFee,
    tax,
    authoritativeTotal,
    discountedSubtotal,
  };
}

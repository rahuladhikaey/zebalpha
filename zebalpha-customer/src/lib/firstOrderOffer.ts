export interface FirstOrderOfferConfig {
  isActive: boolean;
  discountAmount: number;
  minOrderAmount: number;
  code: string;
  badgeText: string;
  bannerTitle: string;
  allowCod: boolean;
  allowOnline: boolean;
}

export const DEFAULT_FIRST_ORDER_OFFER: FirstOrderOfferConfig = {
  isActive: true,
  discountAmount: 100,
  minOrderAmount: 399,
  code: "FIRST100",
  badgeText: "1st Order Special",
  bannerTitle: "Flat ₹100 OFF on Your 1st Order",
  allowCod: true,
  allowOnline: true,
};

export interface FirstOrderEligibilityResult {
  config: FirstOrderOfferConfig;
  eligible: boolean;
  alreadyOrdered: boolean;
  reason: string | null;
}

export function normalizeIndianPhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

export function normalizeFirstOrderConfig(raw: unknown): FirstOrderOfferConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_FIRST_ORDER_OFFER };
  }
  const obj = raw as Record<string, unknown>;
  const discountNum = Number(obj.discountAmount);
  const minOrderNum = Number(obj.minOrderAmount);

  const discountAmount =
    Number.isFinite(discountNum) && discountNum >= 0
      ? Math.round(discountNum)
      : DEFAULT_FIRST_ORDER_OFFER.discountAmount;
  const minOrderAmount =
    Number.isFinite(minOrderNum) && minOrderNum >= 0
      ? Math.round(minOrderNum)
      : DEFAULT_FIRST_ORDER_OFFER.minOrderAmount;

  const code =
    typeof obj.code === "string" && obj.code.trim()
      ? obj.code.trim().toUpperCase().slice(0, 24)
      : DEFAULT_FIRST_ORDER_OFFER.code;

  const badgeText =
    typeof obj.badgeText === "string" && obj.badgeText.trim()
      ? obj.badgeText.trim()
      : DEFAULT_FIRST_ORDER_OFFER.badgeText;

  const bannerTitle =
    typeof obj.bannerTitle === "string" && obj.bannerTitle.trim()
      ? obj.bannerTitle.trim()
      : `Flat ₹${discountAmount} OFF on Your 1st Order`;

  return {
    isActive: obj.isActive !== false,
    discountAmount,
    minOrderAmount,
    code,
    badgeText,
    bannerTitle,
    allowCod: obj.allowCod !== false,
    allowOnline: obj.allowOnline !== false,
  };
}

export interface DiscountResolutionInput {
  subtotal: number;
  firstOrderEligible: boolean;
  firstOrderConfig: FirstOrderOfferConfig | null;
  paymentMethod?: "COD" | "ONLINE" | string;
  cartOfferDiscount?: number;
  manualCouponDiscount?: number;
  manualCouponCode?: string | null;
  manualCouponFreeShipping?: boolean;
}

export interface DiscountResolutionOutput {
  firstOrderQualified: boolean;
  firstOrderApplied: boolean;
  firstOrderDiscount: number;
  amountNeededForFirstOrder: number;
  effectiveCouponDiscount: number;
  effectiveCouponCode: string | null;
  cartOfferDiscount: number;
  totalDiscount: number;
  supersededByBetterCoupon: boolean;
  freeShippingByCoupon: boolean;
}

/**
 * Pure deterministic discount resolver shared by Cart, Checkout, and Server APIs.
 * Rule: Manual coupon and First-Order Auto-Offer NEVER double-stack;
 * whichever gives the customer the bigger saving wins automatically.
 */
export function resolveOrderDiscounts(
  input: DiscountResolutionInput
): DiscountResolutionOutput {
  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const cfg = input.firstOrderConfig;
  const cartOfferDiscount = Math.max(
    0,
    Math.min(Math.round(Number(input.cartOfferDiscount) || 0), subtotal)
  );
  const manualCouponDiscount = Math.max(
    0,
    Math.min(Math.round(Number(input.manualCouponDiscount) || 0), subtotal)
  );
  const manualCode = input.manualCouponCode
    ? String(input.manualCouponCode).trim().toUpperCase()
    : null;

  const normMethod = String(input.paymentMethod || "").toUpperCase();
  const paymentAllowed =
    !cfg
      ? false
      : normMethod === "COD"
      ? cfg.allowCod
      : normMethod === "ONLINE"
      ? cfg.allowOnline
      : cfg.allowCod || cfg.allowOnline;

  const offerEnabled = Boolean(
    cfg && cfg.isActive && cfg.discountAmount > 0 && paymentAllowed && input.firstOrderEligible
  );

  const amountNeededForFirstOrder =
    offerEnabled && cfg ? Math.max(0, cfg.minOrderAmount - subtotal) : 0;

  const firstOrderQualified = Boolean(
    offerEnabled && cfg && subtotal > 0 && subtotal >= cfg.minOrderAmount
  );

  const potentialFirstOrderDiscount =
    firstOrderQualified && cfg ? Math.min(cfg.discountAmount, subtotal) : 0;

  // Compare First-Order Offer vs Manual Coupon (no double-stacking)
  const hasManualCoupon = Boolean(
    manualCode && (manualCouponDiscount > 0 || input.manualCouponFreeShipping)
  );

  let firstOrderApplied = false;
  let firstOrderDiscount = 0;
  let effectiveCouponDiscount = 0;
  let effectiveCouponCode: string | null = null;
  let supersededByBetterCoupon = false;
  let freeShippingByCoupon = false;

  if (potentialFirstOrderDiscount > 0 && (!hasManualCoupon || potentialFirstOrderDiscount >= manualCouponDiscount)) {
    firstOrderApplied = true;
    firstOrderDiscount = potentialFirstOrderDiscount;
    effectiveCouponCode = cfg ? cfg.code : DEFAULT_FIRST_ORDER_OFFER.code;
  } else if (hasManualCoupon) {
    effectiveCouponDiscount = manualCouponDiscount;
    effectiveCouponCode = manualCode;
    freeShippingByCoupon = Boolean(input.manualCouponFreeShipping);
    if (potentialFirstOrderDiscount > 0) {
      supersededByBetterCoupon = true;
    }
  }

  const totalDiscount = Math.min(
    subtotal,
    cartOfferDiscount + firstOrderDiscount + effectiveCouponDiscount
  );

  return {
    firstOrderQualified,
    firstOrderApplied,
    firstOrderDiscount,
    amountNeededForFirstOrder,
    effectiveCouponDiscount,
    effectiveCouponCode,
    cartOfferDiscount,
    totalDiscount,
    supersededByBetterCoupon,
    freeShippingByCoupon,
  };
}

"use client";

export const ZEBALPHA_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.zebalpha.customer";
export const ZEBALPHA_WEB_URL = "https://zebalpha.shop";

export interface SharePayload {
  title: string;
  text: string;
  url: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
}

type ShareSheetListener = (payload: SharePayload) => void;

const listeners = new Set<ShareSheetListener>();

export function subscribeToShareSheet(listener: ShareSheetListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openShareSheet(payload: SharePayload): void {
  listeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // Isolate listener errors
    }
  });
}

export function buildFormattedShareMessage(payload: SharePayload): string {
  const cleanText = (payload.text || "").trim();
  const cleanUrl = (payload.url || "").trim();
  if (!cleanText) return cleanUrl;
  if (!cleanUrl || cleanText.includes(cleanUrl)) return cleanText;
  return `${cleanText}\n\n${cleanUrl}`;
}

export async function copyTextSilently(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to legacy execCommand below (crucial inside Android WebViews)
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function buildAppInviteSharePayload(isNativeApp: boolean): SharePayload {
  const shareUrl = isNativeApp ? ZEBALPHA_PLAY_STORE_URL : ZEBALPHA_WEB_URL;
  return {
    title: "ZebAlpha - Online Shopping App",
    text: isNativeApp
      ? "Shop trending streetwear, fashion & daily drops on ZebAlpha! Download the official ZebAlpha app on Google Play:"
      : "Discover trending streetwear, fashion & daily drops on ZebAlpha! Shop online or get the app:",
    url: shareUrl,
    subtitle: isNativeApp
      ? "Download ZebAlpha on Google Play Store"
      : "Shop India's Culture Marketplace",
    imageUrl: "/official-logo.png",
    badge: isNativeApp ? "Google Play App" : "Official Store",
  };
}

export function buildProductSharePayload(product: {
  id: string | number;
  name: string;
  brand?: string | null;
  price?: number | null;
  mrp?: number | null;
  image_url?: string | null;
  images?: string[] | null;
}): SharePayload {
  const origin =
    typeof window !== "undefined" && window.location.origin.startsWith("http")
      ? window.location.origin
      : ZEBALPHA_WEB_URL;
  const productUrl = `${origin}/products/${product.id}`;
  const priceNum = Number(product.price) || 0;
  const mrpNum = Number(product.mrp) || 0;
  const discount =
    mrpNum > priceNum && mrpNum > 0
      ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
      : 0;

  const priceLine =
    priceNum > 0
      ? discount > 0
        ? `Only ₹${priceNum.toLocaleString("en-IN")} (${discount}% OFF!)`
        : `Price: ₹${priceNum.toLocaleString("en-IN")}`
      : "Check out this product on ZebAlpha!";

  const previewImg =
    (Array.isArray(product.images) && product.images.find(Boolean)) ||
    product.image_url ||
    "/official-logo.png";

  return {
    title: `${product.name} | ZebAlpha`,
    text: `Check out ${product.name} on ZebAlpha — ${priceLine}`,
    url: productUrl,
    subtitle: `${product.brand || "ZEBALPHA"} • ${priceLine}`,
    imageUrl: previewImg,
    badge: "Share Product",
  };
}

type NativeShareBridge = {
  hasNativeShareSupport?: () => boolean;
  shareContent?: (title: string, text: string, url: string) => void;
};

/**
 * Universal Flipkart/Meesho-grade share dispatcher:
 * 1. Native Android System Share Sheet via ZebAlphaNative bridge (WhatsApp, Instagram, Telegram, SMS, etc.)
 * 2. Native Web Share API on supported mobile browsers (Chrome/Safari)
 * 3. Sleek in-app ShareBottomSheet (zero ugly window.alert() fallbacks)
 */
export async function shareProfessionally(
  payload: SharePayload
): Promise<"native-android" | "web-share" | "sheet"> {
  if (typeof window === "undefined") return "sheet";

  const bridge = (window as unknown as { ZebAlphaNative?: NativeShareBridge })
    .ZebAlphaNative;

  if (bridge && typeof bridge.shareContent === "function") {
    try {
      bridge.shareContent(payload.title || "ZebAlpha", payload.text || "", payload.url || "");
      return "native-android";
    } catch {
      // Fall through cleanly if bridge throws
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return "web-share";
    } catch (err: unknown) {
      const errName =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: unknown }).name)
          : "";
      if (errName === "AbortError") {
        // User intentionally dismissed the OS share sheet
        return "web-share";
      }
      // WebView or browser rejected navigator.share -> open sleek ShareBottomSheet
    }
  }

  openShareSheet(payload);
  return "sheet";
}

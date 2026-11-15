import { headers } from "next/headers";
import { isNativeUserAgent } from "@/lib/platformShared";

/**
 * Server-side platform detector for dynamic App Router pages.
 * Matches User-Agent headers (ZEBALPHA_ANDROID_APP / Capacitor / Android WebView)
 * or `?view=app` preview search param so SSR outputs true Android UI immediately.
 */
export async function detectNativeAppOnServer(
  searchParams?: Record<string, string | string[] | undefined> | null
): Promise<boolean> {
  const viewParam = searchParams?.view;
  if (viewParam === "app" || (Array.isArray(viewParam) && viewParam.includes("app"))) {
    return true;
  }

  try {
    const reqHeaders = await headers();
    const ua = reqHeaders.get("user-agent");
    if (isNativeUserAgent(ua)) {
      return true;
    }
  } catch {
    // Gracefully fallback when invoked outside a request scope (e.g. build/static analysis)
  }

  return false;
}

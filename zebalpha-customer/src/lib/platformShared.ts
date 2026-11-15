/**
 * Shared client & server User-Agent detector for the ZebAlpha Android WebView app.
 * Keep this file free of "use client" and Node/Next server imports so both SSR
 * pages and client components share identical detection logic.
 */
export function isNativeUserAgent(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== "string") return false;
  return (
    userAgent.includes("ZEBALPHA_ANDROID_APP") ||
    userAgent.includes("Capacitor") ||
    userAgent.includes("; wv") ||
    (userAgent.includes("Android") &&
      userAgent.includes("Version/") &&
      !userAgent.includes("Chrome/"))
  );
}

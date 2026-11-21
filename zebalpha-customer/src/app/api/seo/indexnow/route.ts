import { NextRequest, NextResponse } from "next/server";

const INDEXNOW_KEY = "zebalpha-indexnow-2026-prod-key-9f3a7c1e";
const SITE_HOST = "zebalpha.shop";
const BASE_URL = `https://${SITE_HOST}`;

const DEFAULT_PRIORITY_URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/products`,
  `${BASE_URL}/customize`,
  `${BASE_URL}/new-drops`,
  `${BASE_URL}/categories`,
  `${BASE_URL}/collections`,
  `${BASE_URL}/category/oversized-t-shirts`,
  `${BASE_URL}/category/polos`,
  `${BASE_URL}/category/hoodies`,
  `${BASE_URL}/category/t-shirts`,
  `${BASE_URL}/category/shirts`,
  `${BASE_URL}/category/custom-t-shirts`,
  `${BASE_URL}/about`,
  `${BASE_URL}/seller`,
  `${BASE_URL}/blogs`,
  `${BASE_URL}/guides`,
  `${BASE_URL}/size-guide`,
];

/**
 * POST /api/seo/indexnow
 * Notifies Bing, Yandex, DuckDuckGo, and AI Search indexes immediately when URLs launch or update.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrls: unknown[] = Array.isArray(body?.urls) ? body.urls : DEFAULT_PRIORITY_URLS;

    const urlList = rawUrls
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .map((u) => (u.startsWith("http") ? u.trim() : `${BASE_URL}${u.startsWith("/") ? "" : "/"}${u.trim()}`))
      .filter((u) => u.startsWith(BASE_URL))
      .slice(0, 100);

    if (urlList.length === 0) {
      return NextResponse.json({ success: false, error: "No valid zebalpha.shop URLs supplied" }, { status: 400 });
    }

    const indexNowRes = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });

    return NextResponse.json({
      success: indexNowRes.ok || indexNowRes.status === 202,
      status: indexNowRes.status,
      submittedCount: urlList.length,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "IndexNow submission failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

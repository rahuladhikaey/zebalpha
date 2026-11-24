import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { invalidateCacheKey, invalidateCachePattern } from "@/lib/cacheHelper";

export const dynamic = "force-dynamic";

function buildCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowedOrigin =
    origin === "https://zebalpha.shop" ||
    origin === "https://www.zebalpha.shop" ||
    origin === "https://seller.zebalpha.shop" ||
    origin === "https://admin.zebalpha.shop" ||
    origin === "https://superadmin.zebalpha.shop" ||
    origin.endsWith(".zebalpha.shop") ||
    origin.startsWith("http://localhost:");

  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://zebalpha.shop",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-revalidate-secret",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}

/**
 * Storefront Instant Cache Revalidation Webhook
 * Invoked by zebalpha-seller and zebalpha-superadmin immediately after
 * creating, updating, approving, or deleting products/categories/banners.
 * Flushes L1 RAM, L2 Upstash Redis, and Next.js ISR route caches in < 1s.
 */
export async function POST(req: NextRequest) {
  const corsHeaders = buildCorsHeaders(req);
  try {
    const body = await req.json().catch(() => ({}));
    const target = String(body?.target || "product").toLowerCase();
    const id = body?.id ? String(body.id) : undefined;
    const categoryId = body?.categoryId ? String(body.categoryId) : undefined;

    // Optional shared secret check when configured in environment
    const configuredSecret = (process.env.CACHE_REVALIDATE_SECRET || "").trim();
    if (configuredSecret) {
      const provided =
        req.headers.get("x-revalidate-secret") ||
        (typeof body?.secret === "string" ? body.secret : "");
      if (provided !== configuredSecret) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    const tasks: Promise<void>[] = [];

    if (target === "product" || target === "seller" || target === "seller_lifecycle" || target === "all") {
      tasks.push(
        invalidateCachePattern("homepage:section:featured:*"),
        invalidateCachePattern("api:products:*"),
        invalidateCachePattern("products:*"),
        invalidateCacheKey("rec:catalog-snapshot:v1")
      );
      if (id) {
        tasks.push(
          invalidateCacheKey(`pdp:product:v3:${id}`),
          invalidateCacheKey(`pdp:product:v2:${id}`),
          invalidateCacheKey(`pdp:reviews:v1:${id}`),
          invalidateCacheKey(`product:detail:v2:${id}`),
          invalidateCacheKey(`product:detail:${id}`),
          invalidateCacheKey(`product:variants:v2:${id}`),
          invalidateCacheKey(`product:variants:v1:${id}`),
          invalidateCacheKey(`product:variants:${id}`)
        );
      } else {
        tasks.push(
          invalidateCachePattern("pdp:product:*"),
          invalidateCachePattern("product:detail:*"),
          invalidateCachePattern("product:variants:*")
        );
      }
      if (categoryId) {
        tasks.push(invalidateCachePattern(`products:cat:${categoryId}:*`));
      }
    }

    if (target === "category" || target === "homepage" || target === "sdui" || target === "dems" || target === "custom_studio" || target === "all") {
      tasks.push(
        invalidateCachePattern("navigation:*"),
        invalidateCachePattern("api:categories:*"),
        invalidateCachePattern("homepage:section:*"),
        invalidateCachePattern("homepage:sdui:*"),
        invalidateCachePattern("homepage:dems:*"),
        invalidateCacheKey("homepage:sdui:layout:v1"),
        invalidateCacheKey("homepage:dems:current:v1"),
        invalidateCacheKey("custom:studio:config:v1"),
        invalidateCacheKey("notifications:broadcast:latest:v1")
      );
    }

    await Promise.allSettled(tasks);

    // Revalidate Next.js App Router pages immediately
    try {
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/customize");
      revalidatePath("/new-drops");
      revalidatePath("/premium-store");
      revalidatePath("/categories");
      if (id) {
        revalidatePath(`/products/${id}`);
      }
    } catch (revalErr) {
      console.warn("[Revalidate Notice]:", revalErr);
    }

    return NextResponse.json(
      {
        success: true,
        revalidated: true,
        target,
        id: id || null,
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/cache/revalidate Error]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders });
  }
}

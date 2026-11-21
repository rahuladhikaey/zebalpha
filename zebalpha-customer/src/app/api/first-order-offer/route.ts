import { NextResponse } from "next/server";
import { checkFirstOrderEligibilityServer } from "@/lib/firstOrderOfferServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || null;
    const phone = url.searchParams.get("phone") || null;
    const paymentMethod = url.searchParams.get("paymentMethod") || undefined;

    const result = await checkFirstOrderEligibilityServer({
      userId,
      phone,
      paymentMethod,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to check first order offer";
    console.error("[GET /api/first-order-offer] Error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  getCachedActiveCustomerExperience,
  DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD,
} from "@/lib/cachedQueries";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/app/experience/current
 * Public Customer Android App & Storefront Endpoint
 * Returns ONLY currently valid, time-evaluated, published, customer-safe experience configuration.
 */
export async function GET() {
  try {
    const experience = await getCachedActiveCustomerExperience();
    return NextResponse.json(
      {
        success: true,
        data: experience,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: true,
        data: DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD,
      },
      { status: 200 }
    );
  }
}

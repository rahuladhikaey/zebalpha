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
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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

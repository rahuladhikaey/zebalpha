import { NextResponse } from "next/server";
import { getCachedActiveCustomerExperience } from "@/lib/cachedQueries";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/app/experience/version
 * Ultra-lightweight (~120 bytes) version check endpoint for the Customer Android App.
 * Allows the app to compare its cached localStorage configuration version before downloading full config.
 */
export async function GET() {
  try {
    const exp = await getCachedActiveCustomerExperience();
    return NextResponse.json(
      {
        success: true,
        version: exp.version,
        schemaVersion: exp.schemaVersion,
        activeExperienceId: exp.activeExperienceId,
        festivalName: exp.festivalName,
        isDefault: exp.isDefault,
        lastUpdatedAt: exp.lastUpdatedAt,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json({
      success: true,
      version: 1,
      schemaVersion: 1,
      activeExperienceId: "exp_default_zebalpha",
      festivalName: "ZebAlpha Official Everyday",
      isDefault: true,
      lastUpdatedAt: "2026-11-24T00:00:00.000Z",
    });
  }
}

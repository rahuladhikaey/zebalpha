import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Bank settlement registrations are deprecated.
 * ZebAlpha operates on a strictly UPI-Only settlement model.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({
    success: false,
    error: "Bank account settlements are disabled. ZebAlpha uses instant, verified UPI settlements only."
  }, { status: 400 });
}

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    success: false,
    error: "Bank account settlements are disabled. Please use UPI settlement methods."
  }, { status: 400 });
}

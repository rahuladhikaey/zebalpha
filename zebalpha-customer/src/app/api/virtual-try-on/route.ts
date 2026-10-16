import { NextRequest, NextResponse } from 'next/server';

/**
 * ZEBALPHA — STRICT VIEW-ONLY PRIVACY ENFORCEMENT
 * 
 * PHOTO UPLOADS AND FRAME TRANSMISSIONS ARE PERMANENTLY PROHIBITED.
 * All virtual fitting room experiences run 100% locally in browser runtime memory.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Photo upload and external AI frame processing are permanently disabled. Zebalpha operates exclusively on a live, real-time view-only fitting room with zero photo storage.',
      isLiveOnly: true,
    },
    { status: 410 } // 410 Gone
  );
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'active',
    mode: 'live_view_only',
    privacy: 'zero_retention_local_processing',
    notice: 'Your camera is used for a live virtual-fitting preview. Zebalpha does not upload or save your camera images. You can turn off the camera or exit at any time.',
  });
}

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://asaliswad-backend.onrender.com';
    
    // Fire background call to Express backend (non-blocking)
    fetch(`${backendUrl}/api/v1/cron/customer/auto-complete-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        domain: 'asaliswad.com',
        service: 'Customer Storefront Cron',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: true, message: 'Cron processed' }, { status: 200 });
  }
}

export async function POST() {
  return GET();
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}

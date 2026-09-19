import { NextResponse } from 'next/server';
import { checkServiceability } from '@/lib/shiprocket';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pickup_postcode = searchParams.get('pickup_postcode') || searchParams.get('pickup_pincode');
    const delivery_postcode = searchParams.get('delivery_postcode') || searchParams.get('delivery_pincode');
    const weight = parseFloat(searchParams.get('weight') || '0.5');
    const cod = searchParams.get('cod');

    if (!pickup_postcode || !delivery_postcode) {
      return NextResponse.json(
        { success: false, error: 'Both pickup_postcode and delivery_postcode are required.' },
        { status: 400 }
      );
    }

    const result = await checkServiceability({
      pickup_postcode,
      delivery_postcode,
      weight,
      cod: cod === 'true' || cod === '1' || cod === 'COD',
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[API check-serviceability Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pickup_postcode, delivery_postcode, weight = 0.5, cod = false } = body;

    if (!pickup_postcode || !delivery_postcode) {
      return NextResponse.json(
        { success: false, error: 'Both pickup_postcode and delivery_postcode are required.' },
        { status: 400 }
      );
    }

    const result = await checkServiceability({
      pickup_postcode,
      delivery_postcode,
      weight,
      cod,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[API check-serviceability Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getShiprocketToken } from '@/lib/shiprocket';
import { getShiprocketOrFallbackEDD, formatEDDDisplay } from '@/lib/eddService';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const delivery_pincode = searchParams.get('delivery_pincode') || searchParams.get('delivery_postcode') || searchParams.get('pincode') || '';
    const seller_id = searchParams.get('seller_id');
    const product_id = searchParams.get('product_id');

    let pickup_pincode = searchParams.get('pickup_pincode') || searchParams.get('pickup_postcode');

    // If seller_id or product_id supplied, resolve seller's pickup location
    if (!pickup_pincode && (seller_id || product_id)) {
      try {
        let targetSellerId = seller_id;
        if (!targetSellerId && product_id) {
          const { data: prod } = await supabaseServer
            .from('products')
            .select('seller_id')
            .eq('id', product_id)
            .maybeSingle();
          if (prod?.seller_id) targetSellerId = prod.seller_id;
        }

        if (targetSellerId) {
          const { data: pickupLoc } = await supabaseServer
            .from('seller_pickup_locations')
            .select('pin_code')
            .eq('seller_id', targetSellerId)
            .eq('is_primary', true)
            .maybeSingle();

          if (pickupLoc?.pin_code) {
            pickup_pincode = pickupLoc.pin_code;
          }
        }
      } catch (_) {}
    }

    let token = null;
    try {
      token = await getShiprocketToken();
    } catch (_) {}

    const eddResult = await getShiprocketOrFallbackEDD({
      pickupPincode: pickup_pincode || '700001',
      deliveryPincode: delivery_pincode,
      weight: 0.5,
      shiprocketToken: token,
    });

    const displayInfo = formatEDDDisplay(eddResult);

    return NextResponse.json({
      success: true,
      edd: eddResult,
      display: displayInfo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to estimate EDD' },
      { status: 500 }
    );
  }
}

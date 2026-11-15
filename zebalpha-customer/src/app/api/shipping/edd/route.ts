import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getShiprocketToken, checkServiceability } from '@/lib/shiprocket';
import {
  computeStandardDeliveryWindow,
  isValidIndianPincode,
  normalizeIndianPincode,
  STANDARD_DELIVERY_MIN_DAYS,
  STANDARD_DELIVERY_MAX_DAYS,
} from '@/lib/deliveryWindow';

export const dynamic = 'force-dynamic';

/**
 * Resolves standard 7-day Flipkart/Meesho-style expected delivery estimates (+7 to +8 days)
 * for any valid 6-digit Indian PIN code, while checking product stock and enriching
 * carrier metadata when Shiprocket is configured.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPincode = searchParams.get('pincode') || searchParams.get('delivery_pincode');
    const pincode = normalizeIndianPincode(rawPincode);
    const productId = searchParams.get('product_id') || searchParams.get('productId') || '';
    const requestedSellerId = searchParams.get('seller_id') || searchParams.get('sellerId') || '';
    const weight = Math.max(0.1, Number(searchParams.get('weight')) || 0.5);

    if (!isValidIndianPincode(pincode)) {
      return NextResponse.json(
        {
          serviceable: false,
          has_estimate: false,
          in_stock: true,
          pincode,
          error: 'Enter a valid 6-digit Indian PIN code.',
          message: 'Enter a valid 6-digit Indian PIN code.',
        },
        { status: 400 }
      );
    }

    let resolvedSellerId = requestedSellerId;
    let inStock = true;

    // 1. Verify product stock & seller when productId is specified
    if (productId) {
      try {
        const { data: prod } = await supabaseServer
          .from('products')
          .select('id, stock, is_active, seller_id')
          .eq('id', productId)
          .maybeSingle();

        if (prod) {
          if (prod.is_active === false || Number(prod.stock ?? 0) <= 0) {
            inStock = false;
            return NextResponse.json(
              {
                serviceable: false,
                has_estimate: false,
                in_stock: false,
                pincode,
                message: 'Currently out of stock.',
              },
              {
                status: 200,
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
              }
            );
          }
          if (!resolvedSellerId && prod.seller_id) {
            resolvedSellerId = String(prod.seller_id);
          }
        }
      } catch {
        // Non-fatal: continue with standard estimate
      }
    }

    // 2. Compute deterministic 7-day standard delivery window in IST
    const standardWindow = computeStandardDeliveryWindow(
      new Date(),
      STANDARD_DELIVERY_MIN_DAYS,
      STANDARD_DELIVERY_MAX_DAYS
    );

    let courierName: string | null = 'Standard Express Delivery';
    let codAvailable = true;
    let eddSource: 'STANDARD_7_DAY' | 'SHIPROCKET' = 'STANDARD_7_DAY';

    // 3. Best-effort Shiprocket carrier enrichment when pickup PIN & credentials exist
    if (resolvedSellerId) {
      try {
        let pickupPincode = '';
        const { data: pickupLoc } = await supabaseServer
          .from('seller_pickup_locations')
          .select('pin_code, pincode')
          .eq('seller_id', resolvedSellerId)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pickupLoc) {
          pickupPincode = normalizeIndianPincode(pickupLoc.pin_code || pickupLoc.pincode);
        } else {
          const { data: sellerRow } = await supabaseServer
            .from('sellers')
            .select('pincode')
            .eq('id', resolvedSellerId)
            .maybeSingle();
          if (sellerRow?.pincode) {
            pickupPincode = normalizeIndianPincode(sellerRow.pincode);
          }
        }

        if (isValidIndianPincode(pickupPincode)) {
          const token = await getShiprocketToken().catch(() => null);
          if (token) {
            const sr = await checkServiceability({
              pickup_postcode: pickupPincode,
              delivery_postcode: pincode,
              weight,
              cod: false,
            });
            if (sr?.serviceable && Array.isArray(sr.couriers) && sr.couriers.length > 0) {
              const bestCourier =
                sr.couriers.find((c) => c.courier_company_id === sr.recommended_courier_id) ||
                sr.couriers[0];
              if (bestCourier?.courier_name) {
                courierName = bestCourier.courier_name;
              }
              codAvailable = Boolean(bestCourier?.cod_available ?? true);
              eddSource = 'SHIPROCKET';
            }
          }
        }
      } catch {
        // Gracefully keep 7-day standard estimate even when carrier API is unavailable
      }
    }

    return NextResponse.json(
      {
        serviceable: true,
        has_estimate: true,
        in_stock: inStock,
        pincode,
        cod_available: codAvailable,
        courier_name: courierName,
        estimated_days: standardWindow.min_days,
        estimated_days_max: standardWindow.max_days,
        expected_delivery_from: standardWindow.expected_delivery_from,
        expected_delivery_to: standardWindow.expected_delivery_to,
        expected_delivery_date: standardWindow.expected_delivery_date,
        formatted_date: standardWindow.formatted_date,
        display_text: standardWindow.display_text,
        edd_source: eddSource,
        message: null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch {
    const fallback = computeStandardDeliveryWindow();
    return NextResponse.json(
      {
        serviceable: true,
        has_estimate: true,
        in_stock: true,
        cod_available: true,
        courier_name: 'Standard Express Delivery',
        estimated_days: fallback.min_days,
        estimated_days_max: fallback.max_days,
        expected_delivery_from: fallback.expected_delivery_from,
        expected_delivery_to: fallback.expected_delivery_to,
        expected_delivery_date: fallback.expected_delivery_date,
        formatted_date: fallback.formatted_date,
        display_text: fallback.display_text,
        edd_source: 'STANDARD_7_DAY',
        message: null,
      },
      { status: 200 }
    );
  }
}

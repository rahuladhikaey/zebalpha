import { NextResponse } from 'next/server';
import { getShiprocketToken, checkServiceability, calculateDeliveryEstimate } from '@/lib/shiprocket';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPincode = searchParams.get('delivery_pincode') ||
      searchParams.get('delivery_postcode') ||
      searchParams.get('pincode') ||
      searchParams.get('destination_pincode') || '';

    const cleanDelivery = String(rawPincode).replace(/\D/g, '').slice(0, 6);

    // 1. Destination Pincode Validation (Indian 6-digit PIN code)
    if (!cleanDelivery || !/^[1-9][0-9]{5}$/.test(cleanDelivery)) {
      return NextResponse.json(
        {
          success: false,
          serviceable: false,
          has_estimate: false,
          error: 'Please enter a valid 6-digit delivery PIN code.',
        },
        { status: 400 }
      );
    }

    const productId = searchParams.get('product_id') || searchParams.get('productId');
    let sellerId = searchParams.get('seller_id') || searchParams.get('sellerId');
    let pickupPincode = searchParams.get('pickup_pincode') || searchParams.get('pickup_postcode');
    let weight = parseFloat(searchParams.get('weight') || '0');
    let dispatchDays = 0;

    // 2. Fetch actual product record from database if productId supplied
    if (productId) {
      const { data: product, error: prodErr } = await supabaseServer
        .from('products')
        .select('id, name, seller_id, stock, status, is_active, specifications')
        .eq('id', productId)
        .maybeSingle();

      if (prodErr || !product) {
        return NextResponse.json(
          { success: false, error: `Product with ID ${productId} not found.` },
          { status: 404 }
        );
      }

      // Verify product availability and dispatch readiness
      const currentStock = Number(product.stock) || 0;
      const isAvailable = product.is_active !== false && product.status !== 'OUT_OF_STOCK' && currentStock > 0;
      if (!isAvailable) {
        return NextResponse.json({
          success: true,
          serviceable: false,
          in_stock: false,
          has_estimate: false,
          message: 'Product is currently out of stock or unavailable for order.',
        });
      }

      sellerId = sellerId || product.seller_id;

      // Extract genuine weight from specifications if available
      if (weight <= 0 && product.specifications?.weight_grams) {
        const grams = parseFloat(product.specifications.weight_grams);
        if (!isNaN(grams) && grams > 0) {
          weight = grams / 1000;
        }
      }

      // Extract genuine dispatch buffer if present
      if (product.specifications?.dispatch_days) {
        const d = parseInt(product.specifications.dispatch_days, 10);
        if (!isNaN(d) && d > 0) dispatchDays = d;
      }
    }

    if (weight <= 0) {
      weight = 0.5; // Standard 500g parcel
    }

    // 3. Resolve seller's actual pickup pincode from trusted database records
    if (!pickupPincode && sellerId) {
      // Priority 1: Check seller_pickup_locations
      const { data: pickupLoc } = await supabaseServer
        .from('seller_pickup_locations')
        .select('pincode, is_default, is_active')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pickupLoc?.pincode) {
        pickupPincode = pickupLoc.pincode;
      } else {
        // Priority 2: Check sellers table
        const { data: sellerRecord } = await supabaseServer
          .from('sellers')
          .select('id, pincode, pickup_address, warehouse_address, address, dispatch_days')
          .eq('id', sellerId)
          .maybeSingle();

        if (sellerRecord?.pincode) {
          pickupPincode = sellerRecord.pincode;
        } else if (sellerRecord) {
          const combinedAddr = `${sellerRecord.pickup_address || ''} ${sellerRecord.warehouse_address || ''} ${sellerRecord.address || ''}`;
          const m = combinedAddr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || combinedAddr.match(/\b([1-9][0-9]{5})\b/);
          if (m) pickupPincode = m[1];
        }

        if (sellerRecord?.dispatch_days && dispatchDays === 0) {
          const sd = parseInt(sellerRecord.dispatch_days, 10);
          if (!isNaN(sd) && sd > 0) dispatchDays = sd;
        }
      }
    }

    // If still no real pickup pincode found in database records:
    if (!pickupPincode) {
      return NextResponse.json({
        success: false,
        serviceable: false,
        has_estimate: false,
        message: 'Seller pickup location is not configured. Delivery estimate is unavailable.',
      });
    }

    // 4. Check Shiprocket serviceability
    const servResult = await checkServiceability({
      pickup_postcode: pickupPincode,
      delivery_postcode: cleanDelivery,
      weight,
      cod: 0,
    });

    if (!servResult.success || !servResult.serviceable || !servResult.couriers?.length) {
      return NextResponse.json({
        success: true,
        serviceable: false,
        has_estimate: false,
        delivery_postcode: cleanDelivery,
        message: servResult.message || `Delivery is not available to PIN code ${cleanDelivery}.`,
        couriers: [],
      });
    }

    // 5. Select best courier option
    const couriers = servResult.couriers;
    const recommended = couriers.find((c) => c.is_recommended);
    const eligible = couriers.filter((c) => c.etd || (c.estimated_delivery_days !== null && c.estimated_delivery_days !== undefined));
    const bestCourier = recommended || (eligible.length > 0 ? eligible[0] : couriers[0]);

    // 6. Calculate verified dynamic delivery date (Zero Hardcoded Data)
    const estimate = calculateDeliveryEstimate({
      courier: bestCourier,
      dispatchDays,
      dispatchCutoffHour: 16,
      baseDateInput: new Date(),
    });

    return NextResponse.json({
      success: true,
      serviceable: true,
      delivery_postcode: cleanDelivery,
      has_estimate: estimate.has_estimate,
      delivery_date: estimate.delivery_date,
      formatted_date: estimate.formatted_date,
      display_text: estimate.display_text,
      day: estimate.day,
      month: estimate.month,
      weekday: estimate.weekday,
      transit_days: estimate.transit_days,
      dispatch_buffer_days: estimate.dispatch_buffer_days,
      courier_name: estimate.courier_name || bestCourier.courier_name,
      rate: bestCourier.total_charge || bestCourier.freight_charge || 0,
      cod_available: bestCourier.cod_available,
      available_couriers_count: couriers.length,
      calculation_method: estimate.calculation_method,
      message: estimate.has_estimate ? null : estimate.message,
    });
  } catch (error: any) {
    console.error('[API /api/shipping/edd Error]:', error);
    return NextResponse.json(
      {
        success: false,
        serviceable: false,
        has_estimate: false,
        error: error.message || 'Failed to estimate delivery date.',
      },
      { status: 500 }
    );
  }
}

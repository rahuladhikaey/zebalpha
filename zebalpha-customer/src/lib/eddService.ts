/**
 * ZEBALPHA — EXPECTED DELIVERY DATE (EDD) SERVICE MODULE
 * Centralized EDD service supporting:
 * 1. Deterministic IST 7-day standard expected delivery window (+7 to +8 days)
 * 2. Optional live Shiprocket courier metadata enrichment
 * 3. Multi-vendor seller order aggregation
 * 4. Safe formatting and state resolution (delivered, delayed, cancelled, pending)
 */

import {
  computeStandardDeliveryWindow,
  formatDeliveryDateRange,
  normalizeIndianPincode,
  STANDARD_DELIVERY_MIN_DAYS,
} from "@/lib/deliveryWindow";

export interface EDDResult {
  has_estimate: boolean;
  expected_delivery_from?: string | null;
  expected_delivery_to?: string | null;
  expected_delivery_date?: string | null;
  formatted_date?: string | null;
  display_text?: string | null;
  edd_source: "SHIPROCKET" | "CARRIER" | "SERVER_ESTIMATE" | "UNAVAILABLE" | "MANUAL_ADMIN_OVERRIDE";
  courier_name?: string | null;
  transit_days?: number | null;
  is_delayed?: boolean;
  delayed_reason?: string;
  message?: string | null;
}

/**
 * 1. Deterministic 7-day standard EDD window (+7 to +8 days in IST).
 * Example: order/view on 15 Nov -> "22 – 23 Nov".
 */
export function calculateFallbackEDD(
  _pickupPincode?: string | null,
  _deliveryPincode?: string | null,
  startDateInput?: Date | string | null
): EDDResult {
  const win = computeStandardDeliveryWindow(startDateInput);
  return {
    has_estimate: true,
    expected_delivery_from: win.expected_delivery_from,
    expected_delivery_to: win.expected_delivery_to,
    expected_delivery_date: win.expected_delivery_date,
    formatted_date: win.formatted_date,
    display_text: win.display_text,
    edd_source: "SERVER_ESTIMATE",
    transit_days: STANDARD_DELIVERY_MIN_DAYS,
    message: null,
  };
}

/**
 * 2. Compute order/shipment EDD, enriching courier info from Shiprocket when configured
 * while keeping the customer-facing 7-day delivery promise consistent.
 */
export async function getShiprocketOrFallbackEDD(params: {
  pickupPincode?: string | null;
  deliveryPincode?: string | null;
  weight?: number;
  cod?: boolean;
  orderDate?: Date | string | null;
  shiprocketToken?: string | null;
  dispatchDays?: number;
}): Promise<EDDResult> {
  const { pickupPincode, deliveryPincode, weight = 0.5, cod = false, orderDate, shiprocketToken } = params;

  const cleanPickup = normalizeIndianPincode(pickupPincode);
  const cleanDelivery = normalizeIndianPincode(deliveryPincode);
  const standardWindow = computeStandardDeliveryWindow(orderDate);

  if (cleanPickup.length === 6 && cleanDelivery.length === 6 && shiprocketToken) {
    try {
      const query = new URLSearchParams({
        pickup_postcode: cleanPickup,
        delivery_postcode: cleanDelivery,
        weight: String(weight),
        cod: cod ? "1" : "0",
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${query}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${shiprocketToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const couriers = data?.data?.available_courier_companies || [];
        if (Array.isArray(couriers) && couriers.length > 0) {
          const recommendedId = data?.data?.recommended_courier_company_id;
          const recCourier = couriers.find((c: { courier_company_id?: unknown }) => c.courier_company_id === recommendedId);
          const bestCourier = recCourier || couriers[0];

          return {
            has_estimate: true,
            expected_delivery_from: standardWindow.expected_delivery_from,
            expected_delivery_to: standardWindow.expected_delivery_to,
            expected_delivery_date: standardWindow.expected_delivery_date,
            formatted_date: standardWindow.formatted_date,
            display_text: standardWindow.display_text,
            edd_source: "SHIPROCKET",
            courier_name: bestCourier?.courier_name || "Standard Express Courier",
            transit_days: STANDARD_DELIVERY_MIN_DAYS,
            message: null,
          };
        }
      }
    } catch {
      // Fall back seamlessly to standard 7-day window
    }
  }

  return calculateFallbackEDD(cleanPickup, cleanDelivery, orderDate);
}

/**
 * 3. Multi-Vendor EDD Aggregator for Parent Orders
 * Calculates combined delivery window across active seller shipments.
 */
export function aggregateMultiVendorEDD(sellerOrdersOrShipments: Array<Record<string, unknown>>): EDDResult {
  if (!Array.isArray(sellerOrdersOrShipments) || sellerOrdersOrShipments.length === 0) {
    return calculateFallbackEDD();
  }

  const activeShipments = sellerOrdersOrShipments.filter((item) => {
    const status = String(item.shipping_status || item.seller_status || item.status || "").toLowerCase();
    return status !== "cancelled" && status !== "rto";
  });

  if (activeShipments.length === 0) {
    return calculateFallbackEDD();
  }

  let latestTo: Date | null = null;
  let earliestFrom: Date | null = null;
  let primarySource: EDDResult["edd_source"] = "SERVER_ESTIMATE";

  for (const item of activeShipments) {
    const itemEDD = (item.expected_delivery_to || item.expected_delivery_date) as string | undefined;
    const itemFrom = item.expected_delivery_from as string | undefined;
    const itemSource = item.edd_source as EDDResult["edd_source"] | undefined;

    if (itemSource === "SHIPROCKET" || itemSource === "CARRIER") {
      primarySource = itemSource;
    }

    if (itemEDD) {
      const dTo = new Date(itemEDD);
      if (!isNaN(dTo.getTime()) && (!latestTo || dTo > latestTo)) {
        latestTo = dTo;
      }
    }

    if (itemFrom) {
      const dFrom = new Date(itemFrom);
      if (!isNaN(dFrom.getTime()) && (!earliestFrom || dFrom < earliestFrom)) {
        earliestFrom = dFrom;
      }
    }
  }

  if (!latestTo) {
    return calculateFallbackEDD();
  }

  const finalFrom = earliestFrom && earliestFrom <= latestTo ? earliestFrom : new Date(latestTo.getTime() - 86400000);
  const formattedDate = formatDeliveryDateRange(finalFrom, latestTo);

  return {
    has_estimate: true,
    expected_delivery_from: finalFrom.toISOString(),
    expected_delivery_to: latestTo.toISOString(),
    expected_delivery_date: latestTo.toISOString(),
    formatted_date: formattedDate,
    display_text: `Delivery by ${formattedDate}`,
    edd_source: primarySource,
  };
}

/**
 * 4. Format EDD for Clean User Display
 */
export function formatEDDDisplay(options: {
  expected_delivery_from?: string | Date | null;
  expected_delivery_to?: string | Date | null;
  expected_delivery_date?: string | Date | null;
  actual_delivery_date?: string | Date | null;
  status?: string | null;
  is_delayed?: boolean | null;
}): { text: string; subtext?: string; isDelivered: boolean; isDelayed: boolean } {
  const { expected_delivery_from, expected_delivery_to, expected_delivery_date, actual_delivery_date, status, is_delayed } = options;

  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "delivered" || actual_delivery_date) {
    const delDate = actual_delivery_date ? new Date(actual_delivery_date) : new Date();
    const formattedDate = !isNaN(delDate.getTime())
      ? delDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })
      : "recently";
    return {
      text: `Delivered on ${formattedDate}`,
      isDelivered: true,
      isDelayed: false,
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return { text: "Order Cancelled", isDelivered: false, isDelayed: false };
  }
  if (normalizedStatus === "rto") {
    return { text: "Returned to Origin (RTO)", isDelivered: false, isDelayed: true };
  }

  const dFrom = expected_delivery_from ? new Date(expected_delivery_from) : null;
  const dTo = (expected_delivery_to || expected_delivery_date) ? new Date(expected_delivery_to || expected_delivery_date!) : null;

  if (dTo && !isNaN(dTo.getTime())) {
    const rangeStart = dFrom && !isNaN(dFrom.getTime()) && dFrom <= dTo ? dFrom : dTo;
    const formattedRange = formatDeliveryDateRange(rangeStart, dTo);
    const mainText = `Delivery by ${formattedRange}`;

    if (is_delayed) {
      return {
        text: mainText,
        subtext: "Status: Shipment Delayed in Transit",
        isDelivered: false,
        isDelayed: true,
      };
    }

    return {
      text: mainText,
      isDelivered: false,
      isDelayed: false,
    };
  }

  const fallback = computeStandardDeliveryWindow();
  return {
    text: fallback.display_text,
    isDelivered: false,
    isDelayed: false,
  };
}

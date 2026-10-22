/**
 * ZEBALPHA — EXPECTED DELIVERY DATE (EDD) SERVICE MODULE
 * Centralized, production-grade EDD service supporting:
 * 1. Shiprocket live courier ETD extraction
 * 2. Deterministic server-side fallback EDD calculation
 * 3. Multi-vendor seller order aggregation
 * 4. Safe formatting and state resolution (delivered, delayed, cancelled, pending)
 */

export interface EDDResult {
  has_estimate: boolean;
  expected_delivery_from?: string | null; // ISO date string
  expected_delivery_to?: string | null;   // ISO date string
  expected_delivery_date?: string | null; // ISO date string (primary target)
  formatted_date?: string | null;         // e.g. "30 Oct, Fri"
  display_text?: string | null;           // e.g. "Delivery by 30 Oct, Fri"
  edd_source: "SHIPROCKET" | "CARRIER" | "SERVER_ESTIMATE" | "UNAVAILABLE" | "MANUAL_ADMIN_OVERRIDE";
  courier_name?: string | null;
  transit_days?: number | null;
  is_delayed?: boolean;
  delayed_reason?: string;
  message?: string | null;
}

/**
 * 1. Truthful unavailable state when no verified courier transit data exists.
 * Per Zero-Hardcoding Policy: Never fabricate fixed day offsets or mock delivery dates.
 */
export function calculateFallbackEDD(
  _pickupPincode?: string | null,
  _deliveryPincode?: string | null,
  _startDateInput?: Date | string | null
): EDDResult {
  return {
    has_estimate: false,
    expected_delivery_from: null,
    expected_delivery_to: null,
    expected_delivery_date: null,
    formatted_date: null,
    display_text: null,
    edd_source: "UNAVAILABLE",
    message: "Delivery estimate is currently unavailable until verified by carrier.",
  };
}

/**
 * 2. Get Live Shiprocket EDD using verified provider response.
 * Uses genuine carrier ETD or estimated_delivery_days only.
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
  const { pickupPincode, deliveryPincode, weight = 0.5, cod = false, orderDate, shiprocketToken, dispatchDays = 0 } = params;

  const cleanPickup = String(pickupPincode || "").replace(/\D/g, "").slice(0, 6);
  const cleanDelivery = String(deliveryPincode || "").replace(/\D/g, "").slice(0, 6);

  if (!cleanPickup || !cleanDelivery || cleanPickup.length !== 6 || cleanDelivery.length !== 6) {
    return calculateFallbackEDD();
  }

  // Query live Shiprocket serviceability if token is available
  if (shiprocketToken) {
    try {
      const query = new URLSearchParams({
        pickup_postcode: cleanPickup,
        delivery_postcode: cleanDelivery,
        weight: String(weight),
        cod: cod ? "1" : "0",
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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
          const recCourier = couriers.find((c: any) => c.courier_company_id === recommendedId);
          const eligible = couriers.filter((c: any) => c.etd || (c.estimated_delivery_days !== undefined && c.estimated_delivery_days !== null));
          const bestCourier = recCourier || (eligible.length > 0 ? eligible[0] : couriers[0]);

          if (bestCourier) {
            const baseDate = orderDate ? new Date(orderDate) : new Date();
            const istHour = parseInt(
              new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(baseDate),
              10
            ) || 0;
            let buffer = Number(dispatchDays) || 0;
            if (istHour >= 16) buffer += 1;

            let finalDate: Date | null = null;
            let transitDays: number | null = null;

            if (bestCourier.etd) {
              const parsedEtd = new Date(bestCourier.etd);
              if (!isNaN(parsedEtd.getTime())) {
                const d = new Date(parsedEtd);
                if (buffer > 0) d.setDate(d.getDate() + buffer);
                finalDate = d;
                const diffMs = finalDate.getTime() - baseDate.getTime();
                transitDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
              }
            }

            if (!finalDate && bestCourier.estimated_delivery_days !== undefined && bestCourier.estimated_delivery_days !== null) {
              const rawDays = parseInt(String(bestCourier.estimated_delivery_days), 10);
              if (!isNaN(rawDays) && rawDays > 0) {
                transitDays = rawDays;
                const d = new Date(baseDate);
                d.setDate(d.getDate() + buffer + rawDays);
                finalDate = d;
              }
            }

            if (finalDate) {
              const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" }).format(finalDate);
              const month = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(finalDate);
              const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).format(finalDate);
              const formattedDate = `${day} ${month}, ${weekday}`;

              return {
                has_estimate: true,
                expected_delivery_from: finalDate.toISOString(),
                expected_delivery_to: finalDate.toISOString(),
                expected_delivery_date: finalDate.toISOString(),
                formatted_date: formattedDate,
                display_text: `Delivery by ${formattedDate}`,
                edd_source: "SHIPROCKET",
                courier_name: bestCourier.courier_name || "Shiprocket Verified Courier",
                transit_days: transitDays,
              };
            }
          }
        }
      }
    } catch (_) {
      // Graceful fallback to unavailable state
    }
  }

  return calculateFallbackEDD();
}

/**
 * 3. Multi-Vendor EDD Aggregator for Parent Orders
 * Calculates latest delivery date among all active seller shipments
 */
export function aggregateMultiVendorEDD(sellerOrdersOrShipments: any[]): EDDResult {
  if (!Array.isArray(sellerOrdersOrShipments) || sellerOrdersOrShipments.length === 0) {
    return calculateFallbackEDD();
  }

  const activeShipments = sellerOrdersOrShipments.filter(item => {
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
    const itemEDD = item.expected_delivery_date || item.expected_delivery_to;
    const itemFrom = item.expected_delivery_from;
    const itemSource = item.edd_source;

    if (itemSource === "SHIPROCKET" || itemSource === "CARRIER") {
      primarySource = itemSource;
    }

    if (itemEDD) {
      const dTo = new Date(itemEDD);
      if (!isNaN(dTo.getTime())) {
        if (!latestTo || dTo > latestTo) {
          latestTo = dTo;
        }
      }
    }

    if (itemFrom) {
      const dFrom = new Date(itemFrom);
      if (!isNaN(dFrom.getTime())) {
        if (!earliestFrom || dFrom < earliestFrom) {
          earliestFrom = dFrom;
        }
      }
    }
  }

  if (!latestTo) {
    return calculateFallbackEDD();
  }

  const finalFrom = earliestFrom || new Date(latestTo.getTime() - 2 * 86400000);

  const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" }).format(latestTo);
  const month = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(latestTo);
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).format(latestTo);
  const formattedDate = `${day} ${month}, ${weekday}`;

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

  // 1. Delivered state
  if (normalizedStatus === "delivered" || actual_delivery_date) {
    const delDate = actual_delivery_date ? new Date(actual_delivery_date) : new Date();
    const formattedDate = !isNaN(delDate.getTime())
      ? delDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "recently";
    return {
      text: `Delivered on ${formattedDate}`,
      isDelivered: true,
      isDelayed: false,
    };
  }

  // 2. Cancelled or RTO
  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return { text: "Order Cancelled", isDelivered: false, isDelayed: false };
  }
  if (normalizedStatus === "rto") {
    return { text: "Returned to Origin (RTO)", isDelivered: false, isDelayed: true };
  }

  // 3. Date Range formatting
  const dFrom = expected_delivery_from ? new Date(expected_delivery_from) : null;
  const dTo = (expected_delivery_to || expected_delivery_date) ? new Date(expected_delivery_to || expected_delivery_date!) : null;

  if (dTo && !isNaN(dTo.getTime())) {
    const dayTo = dTo.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" });
    const monthTo = dTo.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
    const weekdayTo = dTo.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });

    let mainText = `Delivery by ${dayTo} ${monthTo}, ${weekdayTo}`;

    if (dFrom && !isNaN(dFrom.getTime()) && dFrom < dTo) {
      const dayFrom = dFrom.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" });
      const monthFrom = dFrom.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
      if (monthFrom === monthTo) {
        mainText = `Delivery by ${dayFrom} – ${dayTo} ${monthTo}, ${weekdayTo}`;
      } else {
        mainText = `Delivery by ${dayFrom} ${monthFrom} – ${dayTo} ${monthTo}, ${weekdayTo}`;
      }
    }

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

  return {
    text: "Delivery estimate unavailable.",
    isDelivered: false,
    isDelayed: false,
  };
}

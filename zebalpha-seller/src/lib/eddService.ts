/**
 * ZEBALPHA — EXPECTED DELIVERY DATE (EDD) SERVICE MODULE
 * Centralized, production-grade EDD service supporting:
 * 1. Shiprocket live courier ETD extraction
 * 2. Deterministic server-side fallback EDD calculation
 * 3. Multi-vendor seller order aggregation
 * 4. Safe formatting and state resolution (delivered, delayed, cancelled, pending)
 */

export interface EDDResult {
  expected_delivery_from: string; // ISO date string
  expected_delivery_to: string;   // ISO date string
  expected_delivery_date: string; // ISO date string (primary target)
  edd_source: "SHIPROCKET" | "CARRIER" | "SERVER_ESTIMATE" | "MANUAL_ADMIN_OVERRIDE";
  courier_name?: string;
  is_delayed?: boolean;
  delayed_reason?: string;
}

const METRO_PIN_PREFIXES = ["11", "40", "70", "56", "60", "50"]; // Delhi, Mumbai, Kolkata, Blr, Chn, Hyd

/**
 * 1. Calculate deterministic server-side fallback EDD based on Pincode Distance / Zone
 */
export function calculateFallbackEDD(
  pickupPincode?: string | null,
  deliveryPincode?: string | null,
  startDateInput?: Date | string | null
): EDDResult {
  const baseDate = startDateInput ? new Date(startDateInput) : new Date();
  if (isNaN(baseDate.getTime())) {
    return calculateFallbackEDD(pickupPincode, deliveryPincode, new Date());
  }

  const cleanPickup = String(pickupPincode || "").replace(/\D/g, "").slice(0, 6);
  const cleanDelivery = String(deliveryPincode || "").replace(/\D/g, "").slice(0, 6);

  let minDays = 4;
  let maxDays = 6;

  if (cleanPickup && cleanDelivery) {
    if (cleanPickup === cleanDelivery || cleanPickup.slice(0, 3) === cleanDelivery.slice(0, 3)) {
      // Intra-city / Same local hub
      minDays = 2;
      maxDays = 3;
    } else if (cleanPickup.slice(0, 2) === cleanDelivery.slice(0, 2)) {
      // Intra-state / Same zone
      minDays = 3;
      maxDays = 4;
    } else if (
      METRO_PIN_PREFIXES.includes(cleanPickup.slice(0, 2)) &&
      METRO_PIN_PREFIXES.includes(cleanDelivery.slice(0, 2))
    ) {
      // Metro to Metro
      minDays = 3;
      maxDays = 5;
    } else if (cleanDelivery.startsWith("79") || cleanDelivery.startsWith("19") || cleanDelivery.startsWith("744")) {
      // Remote / NE / J&K / Islands
      minDays = 6;
      maxDays = 9;
    } else {
      // Rest of India standard inter-state
      minDays = 4;
      maxDays = 6;
    }
  }

  // Add order cutoff time buffer (+1 day if order after 4 PM)
  if (baseDate.getHours() >= 16) {
    minDays += 1;
    maxDays += 1;
  }

  const addDays = (d: Date, days: number): Date => {
    const res = new Date(d);
    let added = 0;
    while (added < days) {
      res.setDate(res.getDate() + 1);
      // Skip Sundays for courier dispatch estimation
      if (res.getDay() !== 0) {
        added++;
      }
    }
    return res;
  };

  const eddFromDate = addDays(baseDate, minDays);
  const eddToDate = addDays(baseDate, maxDays);

  return {
    expected_delivery_from: eddFromDate.toISOString(),
    expected_delivery_to: eddToDate.toISOString(),
    expected_delivery_date: eddToDate.toISOString(),
    edd_source: "SERVER_ESTIMATE",
  };
}

/**
 * 2. Get Live Shiprocket EDD or fallback to Server Estimate
 */
export async function getShiprocketOrFallbackEDD(params: {
  pickupPincode?: string | null;
  deliveryPincode?: string | null;
  weight?: number;
  cod?: boolean;
  orderDate?: Date | string | null;
  shiprocketToken?: string | null;
}): Promise<EDDResult> {
  const { pickupPincode, deliveryPincode, weight = 0.5, cod = false, orderDate, shiprocketToken } = params;

  // Try live Shiprocket ETD if token and pincodes are available
  if (shiprocketToken && pickupPincode && deliveryPincode && pickupPincode.length === 6 && deliveryPincode.length === 6) {
    try {
      const query = new URLSearchParams({
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        weight: String(weight),
        cod: cod ? "1" : "0",
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second strict timeout

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
          // Select fastest/best rated courier
          const bestCourier = couriers.sort((a, b) => {
            const daysA = Number(a.estimated_delivery_days) || 99;
            const daysB = Number(b.estimated_delivery_days) || 99;
            return daysA - daysB;
          })[0];

          if (bestCourier) {
            const estDays = Number(bestCourier.estimated_delivery_days);
            if (estDays && estDays > 0) {
              const base = orderDate ? new Date(orderDate) : new Date();
              const eddFrom = new Date(base);
              eddFrom.setDate(eddFrom.getDate() + Math.max(1, estDays - 1));
              const eddTo = new Date(base);
              eddTo.setDate(eddTo.getDate() + estDays);

              return {
                expected_delivery_from: eddFrom.toISOString(),
                expected_delivery_to: eddTo.toISOString(),
                expected_delivery_date: eddTo.toISOString(),
                edd_source: "SHIPROCKET",
                courier_name: bestCourier.courier_name || "Shiprocket Direct",
              };
            }

            if (bestCourier.etd) {
              const parsedEtd = new Date(bestCourier.etd);
              if (!isNaN(parsedEtd.getTime())) {
                const eddFrom = new Date(parsedEtd);
                eddFrom.setDate(eddFrom.getDate() - 1);
                return {
                  expected_delivery_from: eddFrom.toISOString(),
                  expected_delivery_to: parsedEtd.toISOString(),
                  expected_delivery_date: parsedEtd.toISOString(),
                  edd_source: "SHIPROCKET",
                  courier_name: bestCourier.courier_name || "Shiprocket Direct",
                };
              }
            }
          }
        }
      }
    } catch (err) {
      // Graceful fallback to server estimate on network/timeout error
    }
  }

  // Fallback to deterministic server-side estimation
  return calculateFallbackEDD(pickupPincode, deliveryPincode, orderDate);
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

  return {
    expected_delivery_from: finalFrom.toISOString(),
    expected_delivery_to: latestTo.toISOString(),
    expected_delivery_date: latestTo.toISOString(),
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
    const monthTo = dTo.toLocaleDateString("en-IN", { month: "short" });
    const dayTo = dTo.getDate();

    let mainText = `Expected delivery by ${dayTo} ${monthTo}`;

    if (dFrom && !isNaN(dFrom.getTime()) && dFrom < dTo) {
      const monthFrom = dFrom.toLocaleDateString("en-IN", { month: "short" });
      const dayFrom = dFrom.getDate();
      if (monthFrom === monthTo) {
        mainText = `Delivery by ${dayFrom} – ${dayTo} ${monthTo}`;
      } else {
        mainText = `Delivery by ${dayFrom} ${monthFrom} – ${dayTo} ${monthTo}`;
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
    text: "Delivery estimate will be available after shipment confirmation.",
    isDelivered: false,
    isDelayed: false,
  };
}

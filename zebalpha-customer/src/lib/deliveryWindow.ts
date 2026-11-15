/**
 * Shared IST (Asia/Kolkata) 7-day standard expected delivery date utilities.
 * Keeps product cards, pincode checks, checkout, and order pages consistent.
 */

export const STANDARD_DELIVERY_MIN_DAYS = 7;
export const STANDARD_DELIVERY_MAX_DAYS = 8;
export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export interface StandardDeliveryWindow {
  fromDate: Date;
  toDate: Date;
  expected_delivery_from: string;
  expected_delivery_to: string;
  expected_delivery_date: string;
  formatted_date: string;
  display_text: string;
  from_label: string;
  to_label: string;
  min_days: number;
  max_days: number;
}

export interface OrderDeliveryDisplay {
  isDelivered: boolean;
  isCancelled: boolean;
  formattedRange: string;
  displayText: string;
}

/** Extracts 6 digits from a raw pincode input. */
export function normalizeIndianPincode(raw?: string | number | null): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 6);
}

/** Validates a 6-digit Indian postal PIN code (first digit 1-9). */
export function isValidIndianPincode(pincode?: string | null): boolean {
  return INDIAN_PINCODE_REGEX.test(String(pincode ?? "").trim());
}

/** Returns numeric year, month (1-12), and day (1-31) in Asia/Kolkata calendar. */
export function getIstCalendarParts(
  dateInput?: Date | string | number | null
): { year: number; month: number; day: number } {
  let d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  const [y, m, day] = formatted.split("-").map((n) => parseInt(n, 10));
  return {
    year: y || d.getUTCFullYear(),
    month: m || d.getUTCMonth() + 1,
    day: day || d.getUTCDate(),
  };
}

/**
 * Adds calendar days to a date anchored in IST noon (06:30 UTC = 12:00 IST),
 * preventing midnight timezone boundary shifts across UTC and IST.
 */
export function addIstDays(
  dateInput: Date | string | number | null | undefined,
  days: number
): Date {
  const { year, month, day } = getIstCalendarParts(dateInput);
  return new Date(Date.UTC(year, month - 1, day + days, 6, 30, 0));
}

function getIstDayMonthParts(date: Date): {
  day: string;
  month: string;
  weekday: string;
  monthIndex: string;
  year: string;
} {
  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
  }).format(date);
  const month = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
  }).format(date);
  const weekday = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
  const ymd = getIstCalendarParts(date);
  return {
    day,
    month,
    weekday,
    monthIndex: String(ymd.month),
    year: String(ymd.year),
  };
}

/** Formats an IST delivery window, e.g. "22 – 23 Nov" or "30 Nov – 1 Dec". */
export function formatDeliveryDateRange(fromDate: Date, toDate: Date): string {
  const fromParts = getIstDayMonthParts(fromDate);
  const toParts = getIstDayMonthParts(toDate);

  if (
    fromParts.day === toParts.day &&
    fromParts.monthIndex === toParts.monthIndex &&
    fromParts.year === toParts.year
  ) {
    return `${toParts.day} ${toParts.month}, ${toParts.weekday}`;
  }

  if (fromParts.monthIndex === toParts.monthIndex && fromParts.year === toParts.year) {
    return `${fromParts.day} – ${toParts.day} ${toParts.month}`;
  }

  return `${fromParts.day} ${fromParts.month} – ${toParts.day} ${toParts.month}`;
}

/**
 * Computes the Flipkart/Meesho-style 7-day standard expected delivery window (+7 to +8 days).
 * Example: baseDate 2026-11-15 -> "22 – 23 Nov" and "Delivery by 22 – 23 Nov".
 */
export function computeStandardDeliveryWindow(
  baseDateInput?: Date | string | number | null,
  minDays: number = STANDARD_DELIVERY_MIN_DAYS,
  maxDays: number = STANDARD_DELIVERY_MAX_DAYS
): StandardDeliveryWindow {
  const safeMin = Math.max(1, Math.round(minDays));
  const safeMax = Math.max(safeMin, Math.round(maxDays));

  const fromDate = addIstDays(baseDateInput, safeMin);
  const toDate = addIstDays(baseDateInput, safeMax);

  const fromParts = getIstDayMonthParts(fromDate);
  const toParts = getIstDayMonthParts(toDate);
  const formatted_date = formatDeliveryDateRange(fromDate, toDate);

  return {
    fromDate,
    toDate,
    expected_delivery_from: fromDate.toISOString(),
    expected_delivery_to: toDate.toISOString(),
    expected_delivery_date: toDate.toISOString(),
    formatted_date,
    display_text: `Delivery by ${formatted_date}`,
    from_label: `${fromParts.day} ${fromParts.month}`,
    to_label: `${toParts.day} ${toParts.month}`,
    min_days: safeMin,
    max_days: safeMax,
  };
}

/**
 * Resolves the display label for an existing or newly placed order.
 * Respects manual admin overrides and delivered/cancelled states,
 * while guaranteeing a consistent +7 to +8 day delivery window for all orders.
 */
export function resolveOrderDeliveryDisplay(
  order?: {
    created_at?: string | null;
    delivered_at?: string | null;
    order_status?: string | null;
    estimated_delivery?: string | null;
    expected_delivery_from?: string | null;
    expected_delivery_to?: string | null;
    expected_delivery_date?: string | null;
    edd_source?: string | null;
  } | null
): OrderDeliveryDisplay {
  const status = String(order?.order_status || "").toLowerCase();

  if (status === "cancelled" || status === "canceled") {
    return {
      isDelivered: false,
      isCancelled: true,
      formattedRange: "Cancelled",
      displayText: "Order Cancelled",
    };
  }

  if (status === "delivered" || status === "completed") {
    const delDate = order?.delivered_at ? new Date(order.delivered_at) : null;
    const delLabel =
      delDate && !isNaN(delDate.getTime())
        ? delDate.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
            month: "short",
          })
        : "Delivered";
    return {
      isDelivered: true,
      isCancelled: false,
      formattedRange: delDate && !isNaN(delDate.getTime()) ? `Delivered ${delLabel}` : "Delivered",
      displayText: delDate && !isNaN(delDate.getTime()) ? `Delivered on ${delLabel}` : "Delivered",
    };
  }

  // Respect explicit admin override when stored
  if (order?.edd_source === "MANUAL_ADMIN_OVERRIDE") {
    const overrideRaw = order.expected_delivery_to || order.expected_delivery_date;
    if (overrideRaw) {
      const overrideDate = new Date(overrideRaw);
      if (!isNaN(overrideDate.getTime())) {
        const range = formatDeliveryDateRange(overrideDate, overrideDate);
        return {
          isDelivered: false,
          isCancelled: false,
          formattedRange: range,
          displayText: `Delivery by ${range}`,
        };
      }
    }
  }

  // Use stored window only when it already reflects at least the 7-day standard promise
  if (order?.expected_delivery_from && (order?.expected_delivery_to || order?.expected_delivery_date)) {
    const dFrom = new Date(order.expected_delivery_from);
    const dTo = new Date(order.expected_delivery_to || order.expected_delivery_date!);
    if (!isNaN(dFrom.getTime()) && !isNaN(dTo.getTime()) && dFrom <= dTo) {
      const created = order?.created_at ? new Date(order.created_at) : null;
      const meetsSevenDayStandard =
        !created ||
        isNaN(created.getTime()) ||
        dFrom.getTime() - created.getTime() >= 6 * 24 * 60 * 60 * 1000;

      if (meetsSevenDayStandard) {
        const range = formatDeliveryDateRange(dFrom, dTo);
        return {
          isDelivered: false,
          isCancelled: false,
          formattedRange: range,
          displayText: `Delivery by ${range}`,
        };
      }
    }
  }

  const standardWindow = computeStandardDeliveryWindow(order?.created_at || new Date());
  return {
    isDelivered: false,
    isCancelled: false,
    formattedRange: standardWindow.formatted_date,
    displayText: standardWindow.display_text,
  };
}

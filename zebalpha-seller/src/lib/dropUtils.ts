/**
 * Checks if a product is flagged as a "New Drop" / "Upcoming Drop"
 */
export function isProductNewDrop(product: any): boolean {
  if (!product) return false;
  return (
    product.is_new_drop === true ||
    product.is_new_drop === "true" ||
    product.status === "COMING_SOON" ||
    (product.specifications as any)?.is_new_drop === "true" ||
    (product.specifications as any)?.is_new_drop === true
  );
}

/**
 * Parses various drop date formats:
 * - ISO string: "2026-09-25", "2026-09-25T12:00:00"
 * - DD/MM/YYYY or DD-MM-YYYY: "25/09/2026", "25-09-2026"
 * - MM/DD/YYYY: "09/25/2026"
 * - Strings containing dates: "Releasing 25/09/2026", "Drop on 2026-09-25"
 */
export function parseDropDate(rawDate?: string | null): Date | null {
  if (!rawDate || typeof rawDate !== "string") return null;
  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  // 1. Direct standard Date parsing (e.g., ISO "2026-09-25", "2026-09-25T10:00:00Z")
  const parsedDirect = new Date(trimmed);
  if (!isNaN(parsedDirect.getTime()) && !/^\d{1,2}[\/\-]\d{1,2}/.test(trimmed)) {
    return parsedDirect;
  }

  // 2. Format: DD/MM/YYYY or DD-MM-YYYY (e.g. "25/09/2026" or "25-09-2026")
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Match embedded ISO dates in text (e.g., "Releasing 2026-09-25")
  const embeddedIso = trimmed.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (embeddedIso) {
    const d = new Date(parseInt(embeddedIso[1], 10), parseInt(embeddedIso[2], 10) - 1, parseInt(embeddedIso[3], 10));
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Match embedded DD/MM/YYYY in text (e.g., "Releasing 25/09/2026")
  const embeddedDmy = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (embeddedDmy) {
    const d = new Date(parseInt(embeddedDmy[3], 10), parseInt(embeddedDmy[2], 10) - 1, parseInt(embeddedDmy[1], 10));
    if (!isNaN(d.getTime())) return d;
  }

  // 5. Fallback attempt for natural date strings (e.g. "Sep 25, 2026")
  const naturalParsed = new Date(trimmed);
  if (!isNaN(naturalParsed.getTime())) {
    return naturalParsed;
  }

  return null;
}

/**
 * Checks if a drop is already LIVE (i.e. drop date has arrived or passed).
 */
export function isDropLive(product: any): boolean {
  if (!isProductNewDrop(product)) {
    return true;
  }

  const rawDate = product.target_drop_date || product.drop_date || (product.specifications as any)?.target_drop_date;
  const dropDate = parseDropDate(rawDate);

  if (dropDate) {
    return dropDate.getTime() <= Date.now();
  }

  return false;
}

/**
 * Returns structured drop display information
 */
export function getDropDisplayStatus(product: any): {
  isDrop: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  badgeLabel: string;
  dateText: string;
  dropDate: Date | null;
} {
  const isDrop = isProductNewDrop(product);
  if (!isDrop) {
    return {
      isDrop: false,
      isLive: true,
      isUpcoming: false,
      badgeLabel: "Standard Product",
      dateText: "In Stock",
      dropDate: null,
    };
  }

  const rawDate = product.target_drop_date || product.drop_date || (product.specifications as any)?.target_drop_date;
  const dropDate = parseDropDate(rawDate);
  const isLive = dropDate ? dropDate.getTime() <= Date.now() : false;

  let badgeLabel = isLive ? "🔥 LIVE DROP" : "⚡ UPCOMING DROP";
  let dateText = "Releasing Soon";

  if (dropDate) {
    const formatted = dropDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    dateText = isLive ? `Live since ${formatted}` : `Drops ${formatted}`;
  } else if (rawDate) {
    dateText = rawDate;
  }

  return {
    isDrop,
    isLive,
    isUpcoming: !isLive,
    badgeLabel,
    dateText,
    dropDate,
  };
}

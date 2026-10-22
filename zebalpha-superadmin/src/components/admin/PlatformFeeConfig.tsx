"use client";

import MarketplaceCommissionFeesEngine from "@/components/admin/MarketplaceCommissionFeesEngine";

/**
 * PlatformFeeConfig - Canonical Unified Platform Fees & Standard Commission View
 * All fee configuration is consolidated in MarketplaceCommissionFeesEngine
 * ensuring customer charges, seller commissions, live simulations, and version history
 * live in ONE single page.
 */
export default function PlatformFeeConfig() {
  return <MarketplaceCommissionFeesEngine />;
}

import { ZebQuickAppOnlyGuard } from "@/components/zeb-quick/ZebQuickAppOnlyGuard";
import { ZebQuickEntrySplash } from "@/components/zeb-quick/ZebQuickEntrySplash";
import { ZebQuickFloatingCartPill } from "@/components/zeb-quick/ZebQuickFloatingCartPill";
import { ZebQuickLocationModal } from "@/components/zeb-quick/ZebQuickLocationModal";
import { ZebQuickProductDetailModal } from "@/components/zeb-quick/ZebQuickProductDetailModal";

export default function ZebQuickLayout({ children }: { children: React.ReactNode }) {
  return (
    <ZebQuickAppOnlyGuard>
      <ZebQuickEntrySplash />
      {children}
      <ZebQuickFloatingCartPill />
      <ZebQuickLocationModal />
      <ZebQuickProductDetailModal />
    </ZebQuickAppOnlyGuard>
  );
}

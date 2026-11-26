import { ZebQuickAppOnlyGuard } from "@/components/zeb-quick/ZebQuickAppOnlyGuard";
import { ZebQuickEntrySplash } from "@/components/zeb-quick/ZebQuickEntrySplash";
import { ZebQuickFloatingCartPill } from "@/components/zeb-quick/ZebQuickFloatingCartPill";
import { ZebQuickProductDetailModal } from "@/components/zeb-quick/ZebQuickProductDetailModal";

export default function ZebQuickLayout({ children }: { children: React.ReactNode }) {
  return (
    <ZebQuickAppOnlyGuard>
      <ZebQuickEntrySplash />
      {children}
      <ZebQuickFloatingCartPill />
      <ZebQuickProductDetailModal />
    </ZebQuickAppOnlyGuard>
  );
}

import { ZebQuickAppOnlyGuard } from "@/components/zeb-quick/ZebQuickAppOnlyGuard";
import { ZebQuickEntrySplash } from "@/components/zeb-quick/ZebQuickEntrySplash";

export default function ZebQuickLayout({ children }: { children: React.ReactNode }) {
  return (
    <ZebQuickAppOnlyGuard>
      <ZebQuickEntrySplash />
      {children}
    </ZebQuickAppOnlyGuard>
  );
}

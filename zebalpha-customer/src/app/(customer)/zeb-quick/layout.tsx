import { ZebQuickAppOnlyGuard } from "@/components/zeb-quick/ZebQuickAppOnlyGuard";

export default function ZebQuickLayout({ children }: { children: React.ReactNode }) {
  return <ZebQuickAppOnlyGuard>{children}</ZebQuickAppOnlyGuard>;
}

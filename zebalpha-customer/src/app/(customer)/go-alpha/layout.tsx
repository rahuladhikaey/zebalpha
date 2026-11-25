import { GoAlphaAppOnlyGuard } from "@/components/go-alpha/GoAlphaAppOnlyGuard";

export default function GoAlphaLayout({ children }: { children: React.ReactNode }) {
  return <GoAlphaAppOnlyGuard>{children}</GoAlphaAppOnlyGuard>;
}

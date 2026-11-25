import { GoAlphaHeader } from "@/components/go-alpha/GoAlphaHeader";
import { GoAlphaBottomNav } from "@/components/go-alpha/GoAlphaBottomNav";

export default function GoAlphaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-neutral-900 flex flex-col">
      <GoAlphaHeader />
      <main className="flex-1 pb-24">{children}</main>
      <GoAlphaBottomNav />
    </div>
  );
}

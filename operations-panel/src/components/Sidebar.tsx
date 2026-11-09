"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Truck, 
  Headphones, 
  CheckSquare, 
  Radio, 
  Users, 
  LogOut, 
  ShieldCheck,
  Building2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface SidebarProps {
  userRole?: string | null;
  userEmail?: string | null;
}

export default function Sidebar({ userRole, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isHrOrOwner = userRole === "OWNER" || userRole === "HR Manager";

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Order Fulfillment", href: "/fulfillment", icon: Truck },
    { name: "Support Desk", href: "/support", icon: Headphones },
    { name: "Operations Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Announcements", href: "/announcements", icon: Radio },
  ];

  if (isHrOrOwner) {
    navItems.push({ name: "HR & Invitations", href: "/team", icon: Users });
  }

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-screen fixed left-0 top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-ops-600 to-ops-500 flex items-center justify-center text-white shadow-lg shadow-ops-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white tracking-wide text-sm flex items-center gap-1.5">
              ZEBALPHA <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-ops-500/10 text-ops-500 font-semibold border border-ops-500/20">Ops</span>
            </div>
            <div className="text-[11px] text-zinc-400">ops.zebalpha.shop</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-300">
          Internal Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-ops-600 text-white shadow-md shadow-ops-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-dark-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-dark-800 bg-dark-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="overflow-hidden pr-2">
            <div className="text-xs font-semibold text-white truncate">{userEmail || "Operations Member"}</div>
            <div className="text-[10px] text-ops-500 font-mono tracking-tight font-medium">
              {userRole || "Operations Team"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}


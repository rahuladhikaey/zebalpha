"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Megaphone, 
  Image as ImageIcon, 
  Share2, 
  Bell, 
  CheckSquare, 
  LogOut, 
  ExternalLink,
  Sparkles
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

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone },
    { name: "Creative Assets", href: "/assets", icon: ImageIcon },
    { name: "Social Content", href: "/social", icon: Share2 },
    { name: "Push Campaigns", href: "/notifications", icon: Bell },
    { name: "Media Tasks", href: "/tasks", icon: CheckSquare },
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-screen fixed left-0 top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white tracking-wide text-sm flex items-center gap-1.5">
              ZEBALPHA <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 font-semibold border border-brand-500/20">Media</span>
            </div>
            <div className="text-[11px] text-zinc-400">media.zebalpha.shop</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-300">
          Marketing Operations
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
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-dark-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-300">
          Social Channels
        </div>
        <a
          href="https://www.instagram.com/zebalpha_official?psln=MW5jZHU3YjF0M2x3eg=="
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs text-zinc-400 hover:text-brand-500 hover:bg-dark-800 transition-all border border-dark-800/60"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
            @zebalpha_official
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </a>
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-dark-800 bg-dark-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="overflow-hidden pr-2">
            <div className="text-xs font-semibold text-white truncate">{userEmail || "Marketing Member"}</div>
            <div className="text-[10px] text-brand-500 font-mono tracking-tight font-medium">
              {userRole || "Media Team"}
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


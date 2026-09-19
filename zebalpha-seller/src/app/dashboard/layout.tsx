"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@shared/utils/supabaseClient";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Receipt, 
  Package, 
  Truck,
  IndianRupee,
  BarChart3,
  Bell,
  Settings, 
  HelpCircle,
  LogOut, 
  Menu, 
  X, 
  User,
  Sparkles,
  MapPin,
  ShieldCheck,
  Lock
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sellerName, setSellerName] = useState("Seller");
  const [sellerEmail, setSellerEmail] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);
  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    let channel: any;
    let authListener: any;
    let isMounted = true;

    async function verifyAndLoadSeller() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (userError || !user) {
          console.warn("[Security Guard] Unauthorized access attempt blocked. Redirecting to login.");
          setAuthStatus("unauthorized");
          window.location.href = `/?error=unauthorized&redirect=${encodeURIComponent(pathname)}`;
          return;
        }

        // Fetch seller details from database
        const { data: seller, error: sellerError } = await supabase
          .from("sellers")
          .select("id, full_name, owner_name, email, status, account_status, rejection_reason")
          .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
          .maybeSingle();

        if (!isMounted) return;

        if (seller) {
          const accStatus = (seller.account_status || seller.status || "Active").toLowerCase();

          if (accStatus === "pending") {
            setAuthStatus("unauthorized");
            await supabase.auth.signOut();
            window.location.href = "/?error=pending";
            return;
          }

          if (accStatus === "rejected") {
            setAuthStatus("unauthorized");
            await supabase.auth.signOut();
            window.location.href = `/?error=rejected&reason=${encodeURIComponent(seller.rejection_reason || "Registration rejected")}`;
            return;
          }

          setIsSuspended(accStatus === "suspended");
          setSellerName(seller.full_name || seller.owner_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Seller");
          setSellerEmail(seller.email || user.email || "");
        } else {
          setSellerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Seller");
          setSellerEmail(user.email || "");
        }

        setAuthStatus("authorized");

        // Subscribe to real-time status updates for this seller
        channel = supabase
          .channel(`seller-status-${user.id}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "sellers", filter: `user_id=eq.${user.id}` },
            (payload) => {
              if (payload.new) {
                const accStatus = (payload.new.account_status || payload.new.status || "Active").toLowerCase();
                setIsSuspended(accStatus === "suspended");
                if (accStatus === "rejected" || accStatus === "pending") {
                  window.location.href = "/?error=unauthorized";
                }
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error("[Security Guard Exception]:", err);
        if (isMounted) {
          setAuthStatus("unauthorized");
          window.location.href = "/?error=unauthorized";
        }
      }
    }

    verifyAndLoadSeller();

    // Listen for Auth changes (sign out in another tab, token expiration, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (isMounted) {
          setAuthStatus("unauthorized");
          window.location.href = "/?error=unauthorized";
        }
      }
    });
    authListener = subscription;

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (authListener) authListener.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zebalpha_seller_session");
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const navItems = [
    { name: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard },
    { name: "Products",      href: "/dashboard/products",      icon: ShoppingBag },
    { name: "Collections",   href: "/dashboard/collections",   icon: Sparkles },
    { name: "Inventory",     href: "/dashboard/inventory",     icon: Package },
    { name: "Orders",        href: "/dashboard/orders",        icon: Receipt },
    { name: "Pickup Hubs",   href: "/dashboard/addresses",     icon: MapPin },
    { name: "Settlements",   href: "/dashboard/payments",      icon: IndianRupee, badge: "Soon" },
    { name: "Shipping",      href: "/dashboard/shipping",      icon: Truck },
    { name: "Reports",       href: "/dashboard/reports",       icon: BarChart3 },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { name: "Settings",      href: "/dashboard/settings",      icon: Settings },
    { name: "Support",       href: "/dashboard/support",       icon: HelpCircle },
  ];

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  // FULL-SCREEN SECURITY SHIELD WHILE VERIFYING CREDENTIALS
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
            <img
              src="/official-logo.png"
              alt="ZEBALPHA Logo"
              className="w-10 h-10 rounded-full absolute object-cover border border-zinc-700 shadow-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <Lock size={12} className="text-emerald-400" />
              <span>Merchant Security Shield</span>
            </div>
            <h3 className="text-base font-black tracking-tight text-white">
              Verifying Authorization
            </h3>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
              Validating seller session credentials and encrypting channel access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // IF UNAUTHORIZED, DO NOT RENDER SENSITIVE DASHBOARD CHILDREN
  if (authStatus === "unauthorized") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-16 w-16 rounded-3xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shadow-xl">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-zinc-400">
            A valid, authenticated merchant account is required to view this page. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-foreground/[0.02] border-r border-foreground/[0.06] backdrop-blur-xl transition-all duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-foreground/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <img
              src="/official-logo.png"
              alt="ZEBALPHA Logo"
              className="h-9 w-9 rounded-full object-cover border border-zinc-700 shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white leading-none">ZEB-ALPHA</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck size={10} /> Verified Seller
              </span>
            </div>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-text-muted hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                  isActive 
                    ? "bg-white text-black shadow-lg shadow-white/10" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isActive 
                      ? "bg-black/10 text-black border-black/20" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-white/10 p-4 flex flex-col gap-4 bg-zinc-950/40">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate text-white">{sellerName}</p>
              <p className="text-[10px] font-bold text-zinc-400 truncate">{sellerEmail}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl border border-rose-500/10 px-4 py-3 text-sm font-black text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <LogOut size={18} />
            Logout Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between border-b border-foreground/[0.06] bg-background/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-foreground/[0.08] p-2 text-text-secondary hover:bg-foreground/[0.04] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-black tracking-tight">Seller Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            <DarkModeToggle />
          </div>
        </header>

        {isSuspended && (
          <div className="bg-rose-600 text-white px-6 py-2.5 text-xs font-black flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">🚫</span>
              <span>ACCOUNT SUSPENDED: Your seller account has been suspended by Admin. Adding products, updating catalog, and store publishing are fully disabled.</span>
            </div>
          </div>
        )}

        {/* Page Children */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-foreground/[0.01]">
          {children}
        </main>
      </div>
    </div>
  );
}

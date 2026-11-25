"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@shared/utils/supabaseClient";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { 
  Home,
  LayoutDashboard, 
  ShoppingBag, 
  Award,
  Receipt, 
  Package, 
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
  Lock,
  RotateCcw,
  Megaphone,
  ChevronDown,
  Users,
  Star,
  Zap
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(true);
  const isExpanded = isHovered || isSidebarOpen;

  const [sellerName, setSellerName] = useState("Seller");
  const [sellerEmail, setSellerEmail] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);
  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  // Route-dependent sidebar management
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // One-time seller authentication, profile initialization, and realtime subscription lifecycle
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
          const currentPath = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
          router.replace(`/login?error=unauthorized&redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        // Fetch seller details from database
        let sellerQuery = supabase
          .from("sellers")
          .select("id, full_name, owner_name, email, status, account_status, rejection_reason");

        if (user.email && user.email.trim()) {
          sellerQuery = sellerQuery.or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
        } else {
          sellerQuery = sellerQuery.eq("user_id", user.id);
        }

        const { data: seller, error: sellerError } = await sellerQuery.maybeSingle();

        if (!isMounted) return;

        if (seller) {
          const accStatus = (seller.account_status || seller.status || "Active").toLowerCase();

          if (accStatus === "pending") {
            setAuthStatus("unauthorized");
            await supabase.auth.signOut();
            router.replace("/login?error=pending");
            return;
          }

          if (accStatus === "rejected") {
            setAuthStatus("unauthorized");
            await supabase.auth.signOut();
            router.replace(`/login?error=rejected&reason=${encodeURIComponent(seller.rejection_reason || "Registration rejected")}`);
            return;
          }

          setIsSuspended(accStatus === "suspended");
          setSellerName(seller.full_name || seller.owner_name || user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "Seller"));
          setSellerEmail(seller.email || user.email || "");
        } else {
          setSellerName(user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "Seller"));
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
                  router.replace("/login?error=unauthorized");
                }
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error("[Security Guard Exception]:", err);
        if (isMounted) {
          setAuthStatus("unauthorized");
          router.replace("/login?error=unauthorized");
        }
      }
    }

    verifyAndLoadSeller();

    // Listen for Auth changes (sign out in another tab, token expiration, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (isMounted) {
          setAuthStatus("unauthorized");
          router.replace("/login?error=unauthorized");
        }
      }
    });
    authListener = subscription;

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (authListener) authListener.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zebalpha_seller_session");
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    router.replace("/login?logged_out=1");
  };

  type NavItem = {
    name: string;
    href: string;
    icon: any;
    badge?: string;
    children?: Array<{ name: string; href: string; icon: any; badge?: string }>;
  };

  const navItems: NavItem[] = [
    { name: "Home",          href: "/dashboard/home",          icon: Home },
    { name: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard },
    { name: "Products",      href: "/dashboard/products",      icon: ShoppingBag },
    { name: "GOα Express",   href: "/dashboard/go-alpha",      icon: Zap, badge: "5-6 HR" },
    { name: "Quality",       href: "/dashboard/quality",       icon: Award },
    { name: "Collections",   href: "/dashboard/collections",   icon: Sparkles },
    { name: "Inventory",     href: "/dashboard/inventory",     icon: Package },
    { name: "Orders",        href: "/dashboard/orders",        icon: Receipt },
    { name: "Return/RTO Orders", href: "/dashboard/returns",   icon: RotateCcw },
    { name: "Pickup Hubs",   href: "/dashboard/addresses",     icon: MapPin },
    { name: "Payments & Ledger", href: "/dashboard/payments",  icon: IndianRupee },
    { name: "Reports",       href: "/dashboard/reports",       icon: BarChart3 },
    {
      name: "Marketing",
      href: "/dashboard/marketing/influencer",
      icon: Megaphone,
      badge: "NEW",
      children: [
        { name: "Influencer Marketing", href: "/dashboard/marketing/influencer", icon: Users },
        { name: "App Branding",         href: "/dashboard/marketing/branding",   icon: Star },
      ],
    },
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

  // Keyboard navigation & Esc key listener to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const activeNavItem =
    navItems
      .flatMap((item) => (item.children ? item.children : [item]))
      .find(
        (item) =>
          pathname === item.href ||
          (item.href !== "/dashboard" && item.href !== "/dashboard/home" && pathname.startsWith(item.href))
      ) || navItems[0];

  // FULL-SCREEN SECURITY SHIELD WHILE VERIFYING CREDENTIALS
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8DB] via-[#FFFDF8] to-white flex flex-col items-center justify-center p-6 text-[#14120F] select-none">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm rounded-[2rem] bg-white border border-[#EAD296] p-8 shadow-[0_18px_48px_rgba(166,124,28,0.14)]">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-[3px] border-[#F0E2BE] border-t-[#F03A46] animate-spin" />
            <img
              src="/official-logo.png"
              alt="ZEBALPHA Logo"
              className="w-11 h-11 rounded-full absolute object-cover border-2 border-[#DFBE6F] shadow-md"
            />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
              <Lock size={12} className="text-[#F03A46]" />
              <span>Merchant Security Shield</span>
            </div>
            <h3 className="text-base font-black tracking-tight text-[#14120F]">
              Verifying Authorization
            </h3>
            <p className="text-xs text-[#5C4E35] font-medium leading-relaxed">
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
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8DB] via-[#FFFDF8] to-white flex flex-col items-center justify-center p-6 text-[#14120F]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm rounded-[2rem] bg-white border border-[#EAD296] p-8 shadow-[0_18px_48px_rgba(166,124,28,0.14)]">
          <div className="h-16 w-16 rounded-3xl bg-[#FFF4F2] border border-[#F03A46]/30 flex items-center justify-center text-[#F03A46] shadow-sm">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-black text-[#14120F]">Access Denied</h2>
          <p className="text-xs text-[#5C4E35] leading-relaxed">
            A valid, authenticated merchant account is required to view this page. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard-official flex h-screen bg-[#FFFDF8] text-[#14120F] overflow-hidden font-sans select-none relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Hover-to-Expand Official Ivory & Gold Sidebar */}
      <aside
        role="navigation"
        aria-label="Seller Main Navigation"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#EAD296] transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${isExpanded ? "w-72 shadow-[12px_0_40px_rgba(166,124,28,0.16)]" : "w-20 shadow-[4px_0_20px_rgba(166,124,28,0.06)]"}`}
      >
        {/* Signature ZebAlpha Bright Coral + Champagne Gold Top Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-[#F03A46] via-[#F5B922] to-[#F03A46] shrink-0" />

        {/* Brand Logo Header */}
        <div
          className={`flex h-[74px] items-center border-b border-[#F0E2BE] bg-gradient-to-b from-[#FFFDF8] to-white shrink-0 transition-all duration-300 ${
            isExpanded ? "justify-between px-5" : "justify-center px-0"
          }`}
        >
          <Link href="/dashboard/home" className={`flex items-center min-w-0 ${isExpanded ? "gap-3" : "justify-center"}`}>
            <div className="w-10 h-10 min-w-10 min-h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#DFBE6F] shadow-sm bg-white">
              <img
                src="/official-logo.png"
                alt="ZEBALPHA Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div
              className={`flex flex-col transition-all duration-300 ${
                isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden hidden"
              }`}
            >
              <span className="text-lg font-black tracking-tight text-[#000000] leading-none whitespace-nowrap">
                zebalpha
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#047857] mt-1 flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck size={10} className="text-[#047857]" /> Verified Seller Hub
              </span>
            </div>
          </Link>

          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-[#5C4E35] hover:text-[#F03A46] p-1.5 rounded-xl hover:bg-[#FFF8DB] transition cursor-pointer"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.children && item.children.length > 0) {
              const isGroupActive = item.children.some((c) => pathname.startsWith(c.href));
              return (
                <div key={item.name} className="relative group/item space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isExpanded) {
                        router.push(item.href);
                        setIsSidebarOpen(false);
                      } else {
                        setIsMarketingOpen((prev) => !prev);
                      }
                    }}
                    className={`w-full flex items-center rounded-2xl px-3.5 py-3 text-sm font-extrabold transition-all cursor-pointer ${
                      isExpanded ? "justify-between" : "justify-center"
                    } ${
                      isGroupActive && !isExpanded
                        ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)]"
                        : isGroupActive
                          ? "bg-[#FFF4F2] text-[#F03A46] border border-[#F03A46]/25"
                          : "text-[#5C4E35] hover:bg-[#FFF8DB] hover:text-[#14120F]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Icon
                        size={20}
                        className={`shrink-0 ${
                          isGroupActive && !isExpanded
                            ? "text-white"
                            : isGroupActive
                              ? "text-[#F03A46]"
                              : "text-[#9A6503]"
                        }`}
                      />
                      <span
                        className={`transition-all duration-300 whitespace-nowrap ${
                          isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden hidden lg:inline"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-[#FFF8DB] text-[#9A6503] border-[#DFBE6F]">
                            {item.badge}
                          </span>
                        )}
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${
                            isMarketingOpen ? "rotate-180" : ""
                          } ${isGroupActive ? "text-[#F03A46]" : "text-[#9A6503]"}`}
                        />
                      </div>
                    )}
                  </button>

                  {/* Sub-items (Visible when expanded & toggled open) */}
                  {isExpanded && isMarketingOpen && (
                    <div className="pl-4 space-y-1">
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = pathname === sub.href || pathname.startsWith(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsSidebarOpen(false)}
                            data-photo-overlay={subActive ? "true" : undefined}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${
                              subActive
                                ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-[0_6px_16px_rgba(240,58,70,0.25)]"
                                : "text-[#5C4E35] hover:bg-[#FFF8DB] hover:text-[#14120F]"
                            }`}
                          >
                            <SubIcon
                              size={15}
                              className={`shrink-0 ${subActive ? "text-white" : "text-[#9A6503]"}`}
                            />
                            <span className="truncate">{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed flyout tooltip */}
                  {!isExpanded && (
                    <div
                      data-keep-dark="true"
                      className="fixed left-20 ml-2 hidden lg:group-hover/item:flex items-center gap-2 z-50 bg-[#14120F] border border-[#DFBE6F] text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xl pointer-events-none"
                    >
                      <span>{item.name} (Influencer &amp; Branding)</span>
                    </div>
                  )}
                </div>
              );
            }

            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href !== "/dashboard/home" && pathname.startsWith(item.href));
            return (
              <div key={item.name} className="relative group/item">
                <Link
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  data-photo-overlay={isActive ? "true" : undefined}
                  className={`flex items-center rounded-2xl px-3.5 py-3 text-sm font-extrabold transition-all ${
                    isExpanded ? "justify-between" : "justify-center"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)]"
                      : "text-[#5C4E35] hover:bg-[#FFF8DB] hover:text-[#14120F]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon size={20} className={`shrink-0 ${isActive ? "text-white" : "text-[#9A6503]"}`} />
                    <span
                      className={`transition-all duration-300 whitespace-nowrap ${
                        isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden hidden lg:inline"
                      } ${isActive ? "text-white" : ""}`}
                    >
                      {item.name}
                    </span>
                  </div>

                  {item.badge && isExpanded && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white border-white/30"
                          : "bg-[#FFF8DB] text-[#9A6503] border-[#DFBE6F]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Flyout Label Tooltip on Hover in Slim Collapsed Mode */}
                {!isExpanded && (
                  <div
                    data-keep-dark="true"
                    className="fixed left-20 ml-2 hidden lg:group-hover/item:flex items-center gap-2 z-50 bg-[#14120F] border border-[#DFBE6F] text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xl animate-in fade-in slide-in-from-left-2 pointer-events-none"
                  >
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#F5B922]/25 text-[#FCE89C] border border-[#F5B922]/40">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-[#F0E2BE] p-3 flex flex-col gap-2.5 bg-[#FFF9EB] shrink-0">
          <div className={`flex items-center gap-3 px-2 py-1 ${isExpanded ? "" : "justify-center"}`}>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#FCE89C] to-[#EAB308] flex items-center justify-center text-[#14120F] border border-[#DFBE6F] shadow-sm shrink-0">
              <User size={18} />
            </div>
            <div
              className={`flex-1 min-w-0 transition-all duration-300 ${
                isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              <p className="text-xs font-black truncate text-[#14120F] whitespace-nowrap">{sellerName}</p>
              <p className="text-[10px] font-bold text-[#7A6847] truncate whitespace-nowrap">{sellerEmail}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3.5 rounded-2xl border border-[#F03A46]/30 bg-[#FFF4F2] px-3.5 py-2.5 text-xs font-black text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition-all cursor-pointer group ${
              isExpanded ? "" : "justify-center"
            }`}
            title="Logout Portal"
          >
            <LogOut size={17} className="shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${
                isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden hidden lg:inline"
              }`}
            >
              Logout Portal
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-20 transition-all duration-300">
        {/* Top Accent Strip for Main Pane */}
        <div className="h-1 w-full bg-gradient-to-r from-[#F03A46] via-[#F5B922] to-[#F03A46] shrink-0" />

        {/* Top Header */}
        <header className="flex h-[74px] items-center justify-between border-b border-[#F0E2BE] bg-white/95 px-5 sm:px-6 backdrop-blur-xl shadow-[0_4px_18px_rgba(166,124,28,0.06)] shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-[#EAD296] bg-[#FFFDF8] p-2 text-[#14120F] hover:bg-[#FFF8DB] lg:hidden cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#14120F] truncate">
                {activeNavItem?.name || "Seller Dashboard"}
              </h2>
              <p className="hidden sm:block text-[10.5px] font-bold text-[#7A6847]">
                ZebAlpha Official Seller Hub • 0% Commission
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#9A6503]">
              <ShieldCheck size={12} className="text-[#047857]" />
              0% Commission • 5-Day UPI Payouts
            </span>
            <DarkModeToggle />
          </div>
        </header>

        {isSuspended && (
          <div
            data-photo-overlay="true"
            className="bg-[#F03A46] text-white px-6 py-2.5 text-xs font-black flex items-center justify-between shadow-md shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🚫</span>
              <span>
                ACCOUNT SUSPENDED: Your seller account has been suspended by Admin. Adding products, updating catalog, and store publishing are fully disabled.
              </span>
            </div>
          </div>
        )}

        {/* Page Children */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 bg-gradient-to-b from-[#FFFFFF] via-[#FFFDF8] to-[#FFF9EB] custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

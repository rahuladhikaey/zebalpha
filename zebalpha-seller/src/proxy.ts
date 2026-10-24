import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_A_URL ||
  "").trim();

const supabaseAnonKey =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ||
  "").trim();

// Trusted Origins Whitelist for CORS
const ALLOWED_ORIGINS = [
  "https://zebalpha.shop",
  "https://www.zebalpha.shop",
  "https://seller.zebalpha.shop",
  "https://adm.in.zebalpha.shop",
  "https://admin.zebalpha.shop",
  "https://api.zebalpha.shop",
  "https://zebalpha.com",
  "https://www.zebalpha.com",
  "https://seller.zebalpha.com",
  "https://admin.zebalpha.com",
  "https://api.zebalpha.com",
  "https://zebalpha-zebalpha-customer.vercel.app",
  "https://zebalpha-zebalpha-seller.vercel.app",
  "https://zebalpha-zebalpha-superadmin.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".zebalpha.shop") || origin.endsWith(".zebalpha.com")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") || "";
    const preflightResponse = new NextResponse(null, { status: 200 });
    if (isOriginAllowed(origin)) {
      preflightResponse.headers.set("Access-Control-Allow-Origin", origin);
      preflightResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      preflightResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
      preflightResponse.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return preflightResponse;
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let user = null;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user = authUser;
  } catch (err) {
    console.error("[Seller Proxy Auth Error]:", err);
    user = null;
  }

  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthRoute = pathname === "/" || pathname === "/register" || pathname === "/forgot-password";

  // 1. STRICT ROUTE GUARD: Unauthenticated users CANNOT access /dashboard or any sub-pages
  if (isDashboardRoute && !user) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("error", "unauthorized");
    if (pathname !== "/dashboard") {
      redirectUrl.searchParams.set("redirect", pathname);
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Disable browser caching for unauthenticated access attempts
    redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    redirectResponse.headers.set("Pragma", "no-cache");
    redirectResponse.headers.set("Expires", "0");
    return redirectResponse;
  }

  // 2. Auto-redirect already authenticated sellers from auth pages into dashboard
  if (isAuthRoute && user) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const targetPath = redirectParam && redirectParam.startsWith("/dashboard") ? redirectParam : "/dashboard";
    const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url));
    return redirectResponse;
  }

  // 3. Attach Security Headers
  supabaseResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return supabaseResponse;
}

// Backward compatibility export
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static asset files (svg, png, jpg, jpeg, gif, webp, mp4, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4)$).*)",
  ],
};

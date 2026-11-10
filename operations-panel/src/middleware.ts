import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that bypass server guard
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/unauthorized") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key-for-build";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Verify Supabase Auth session server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify Application Scope in user_app_memberships server-side under RLS
  const { data: memberships, error: membershipError } = await supabase
    .from("user_app_memberships")
    .select("app_name, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Distinguish database communication errors from missing memberships
  if (membershipError) {
    console.error(
      `[OperationsMiddleware] Database query error for membership lookup: code=${membershipError.code || 'UNKNOWN'} msg=${membershipError.message || ''}`
    );
    const errUrl = new URL("/unauthorized", request.url);
    errUrl.searchParams.set("reason", "query_error");
    if (membershipError.code) errUrl.searchParams.set("err_code", membershipError.code);
    return NextResponse.redirect(errUrl);
  }

  const opsMembership = (memberships || []).find(
    (m) => m.app_name === "operations" || (m.app_name === "all" && m.role === "OWNER")
  );

  if (!opsMembership) {
    const unauthUrl = new URL("/unauthorized", request.url);
    unauthUrl.searchParams.set("reason", "no_membership");
    return NextResponse.redirect(unauthUrl);
  }

  // Strict HR-only route protection for /team
  if (pathname.startsWith("/team")) {
    const isHrOrOwner = opsMembership.role === "OWNER" || opsMembership.role === "HR Manager";
    if (!isHrOrOwner) {
      const restrictedUrl = new URL("/unauthorized", request.url);
      restrictedUrl.searchParams.set("reason", "role_restricted");
      return NextResponse.redirect(restrictedUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

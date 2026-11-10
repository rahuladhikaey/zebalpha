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

  if (membershipError) {
    console.error(
      `[MediaMiddleware] Database query error for membership lookup: code=${membershipError.code || 'UNKNOWN'}`
    );
    const errUrl = new URL("/unauthorized", request.url);
    errUrl.searchParams.set("reason", "query_error");
    return NextResponse.redirect(errUrl);
  }

  const hasMediaAccess = (memberships || []).some(
    (m) => m.app_name === "media" || (m.app_name === "all" && m.role === "OWNER")
  );

  if (!hasMediaAccess) {
    const unauthUrl = new URL("/unauthorized", request.url);
    unauthUrl.searchParams.set("reason", "no_membership");
    return NextResponse.redirect(unauthUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

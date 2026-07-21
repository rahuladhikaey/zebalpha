import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Routes that require standard user authentication
const protectedUserRoutes = [
  '/profile',
  '/dashboard',
  '/orders',
  '/wishlist',
  '/settings',
  '/account',
];

// Admin routes that require the admin_session cookie
const protectedAdminRoutes = [
  '/admin',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') || '';
    const preflightResponse = new NextResponse(null, { status: 200 });
    preflightResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
    preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    return preflightResponse;
  }

  // 1. Refresh Supabase session and handle customer auth
  const { response, user } = await updateSession(request);

  // Check if it's a customer protected route
  const isProtectedUserRoute = protectedUserRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedUserRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. Handle Admin Routes Protection
  const isAdminRoute = pathname === '/admin' || (pathname.startsWith('/admin/') && pathname !== '/admin/login');
  
  if (isAdminRoute) {
    const adminSession = request.cookies.get('admin_session');
    if (!adminSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // 3. API Protection
  if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login' && pathname !== '/api/admin/logout') {
    const adminSession = request.cookies.get('admin_session');
    if (!adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
  }

  if (pathname.startsWith('/api/profile/')) {
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
  }

  // Add CORS headers
  const origin = request.headers.get('origin') || '';
  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

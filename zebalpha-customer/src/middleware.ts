import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Routes that require standard user authentication
const protectedUserRoutes = [
  '/profile',
  '/dashboard',
  '/orders',
  '/settings',
  '/account',
];

export async function middleware(request: NextRequest) {
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

  // 1. Redirect or block any /admin path on storefront to main admin domain
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect('https://admin.asaliswad.com', 301);
  }

  // 2. Refresh Supabase session and handle customer auth
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

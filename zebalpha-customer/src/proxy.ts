import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

// Initialize rate limiter if Redis is available (60 requests per minute per IP)
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
    })
  : null;

// Routes that require standard user authentication
const protectedUserRoutes = [
  '/profile',
  '/dashboard',
  '/orders',
  '/settings',
  '/account',
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

  // 1. Redirect or block any /admin path on storefront to main admin domain
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://adm.in.zebalpha.shop';
    return NextResponse.redirect(adminUrl, 301);
  }

  // 2. Resilient Rate limiting check for API endpoints (fail-open if Redis encounters network error)
  if (ratelimit && pathname.startsWith('/api/')) {
    try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      
      // Route-aware rate limit keys
      let rateKey = `ratelimit_gen_${ip}`;
      if (pathname.startsWith('/api/otp')) {
        rateKey = `ratelimit_otp_${ip}`;
      } else if (pathname.startsWith('/api/checkout')) {
        rateKey = `ratelimit_chk_${ip}`;
      }

      const { success, reset } = await ratelimit.limit(rateKey);
      if (!success) {
        const retryAfter = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
        return NextResponse.json(
          { 
            success: false, 
            error: 'RATE_LIMIT_EXCEEDED', 
            message: 'Too many requests. Please slow down.',
            retryAfter
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(retryAfter)
            }
          }
        );
      }
    } catch (rlErr) {
      // Fail-open: Redis/network hiccup must NEVER break storefront APIs
      console.warn('[Customer Proxy Notice]: Rate limiter unreachable, degrading gracefully to fail-open:', (rlErr as any)?.message);
    }
  }

  // 3. Refresh Supabase session and handle customer auth
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

// Backward compatibility export
export const middleware = proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

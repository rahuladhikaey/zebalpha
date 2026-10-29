import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { isSessionRevoked } from '@/lib/sessionRevocation';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout

const ALLOWED_ADMIN_ORIGINS = [
  'https://admin.zebalpha.shop',
  'https://adm.in.zebalpha.shop',
  'https://admin.zebalpha.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isAdminApiRoute = pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login';

  if (isDashboardRoute || isAdminApiRoute) {
    // 1. Strict Origin / Anti-CSRF Check for state-changing API requests
    const method = request.method.toUpperCase();
    if (isAdminApiRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host') || '';

      if (origin) {
        try {
          const originHost = new URL(origin).host;
          const isAllowedOrigin = ALLOWED_ADMIN_ORIGINS.includes(origin) || 
                                  originHost === host ||
                                  origin.endsWith('.zebalpha.shop') || 
                                  origin.endsWith('.zebalpha.com');

          if (!isAllowedOrigin) {
            return NextResponse.json(
              { success: false, message: 'Forbidden: Invalid request origin.' },
              { status: 403 }
            );
          }
        } catch (_) {
          return NextResponse.json(
            { success: false, message: 'Forbidden: Malformed request origin.' },
            { status: 403 }
          );
        }
      }
    }

    const JWT_SECRET = process.env.ADMIN_JWT_SECRET;
    if (!JWT_SECRET) {
      if (isAdminApiRoute) {
        return NextResponse.json({ success: false, message: 'Server authentication configuration missing.' }, { status: 500 });
      }
      return NextResponse.redirect(new URL('/?error=config_error', request.url));
    }

    const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
    const adminCookie = request.cookies.get('admin_session');

    if (!adminCookie || !adminCookie.value) {
      if (isAdminApiRoute) {
        return NextResponse.json({ success: false, message: 'Unauthorized access. Valid admin session required.' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // 2. Check server-side token revocation registry
    try {
      const revoked = await isSessionRevoked(adminCookie.value);
      if (revoked) {
        if (isAdminApiRoute) {
          return NextResponse.json({ success: false, message: 'Session revoked. Please log in again.' }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('error', 'session_revoked');
        const response = NextResponse.redirect(url);
        response.cookies.delete('admin_session');
        return response;
      }
    } catch (_) {}

    try {
      // 3. Cryptographically verify JWT signature and payload
      const { payload } = await jwtVerify(adminCookie.value, SECRET_KEY, {
        algorithms: ['HS256']
      });

      const role = (payload.role as string)?.toUpperCase();
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        if (isAdminApiRoute) {
          return NextResponse.json({ success: false, message: 'Access Denied. Super Admin role required.' }, { status: 403 });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('error', 'access_denied');
        return NextResponse.redirect(url);
      }

      // 4. Check Idle Timeout (30 minutes of inactivity)
      const lastActive = Number(payload.lastActive || 0);
      if (lastActive > 0 && Date.now() - lastActive > IDLE_TIMEOUT_MS) {
        if (isAdminApiRoute) {
          return NextResponse.json({ success: false, message: 'Session expired due to inactivity.' }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('error', 'idle_timeout');
        const response = NextResponse.redirect(url);
        response.cookies.delete('admin_session');
        return response;
      }

      // 5. Refresh activity timestamp on active navigation or API calls (sliding window)
      const response = NextResponse.next();
      if ((isDashboardRoute || isAdminApiRoute) && Date.now() - lastActive > 60 * 1000) { // Throttle cookie update to once per minute
        const updatedToken = await new SignJWT({
          ...payload,
          lastActive: Date.now()
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('2h')
          .sign(SECRET_KEY);

        response.cookies.set('admin_session', updatedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 2 * 60 * 60,
        });
      }

      return response;
    } catch (err) {
      // Invalid signature or expired token
      if (isAdminApiRoute) {
        return NextResponse.json({ success: false, message: 'Session expired or invalid token.' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'session_expired');
      const response = NextResponse.redirect(url);
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

// Next.js Dual Convention Exports (Supports both Next.js 16 proxy and classic middleware)
export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/api/admin/:path*'
  ],
};

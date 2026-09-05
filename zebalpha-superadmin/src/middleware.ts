import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isAdminApiRoute = pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login' && pathname !== '/api/admin/logout';

  if (isDashboardRoute || isAdminApiRoute) {
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

    try {
      // Cryptographically verify JWT signature and payload
      const { payload } = await jwtVerify(adminCookie.value, SECRET_KEY);

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

      // Check Idle Timeout (30 minutes of inactivity)
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

      // Refresh activity timestamp on navigation
      const response = NextResponse.next();
      if (isDashboardRoute && Date.now() - lastActive > 60 * 1000) { // Throttle cookie update to once per minute
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

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/api/admin/:path*'
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "x9#kL2!pQ8$vN5@mZ1*cJ4^yH7&tR0%bW3";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isAdminApiRoute = pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login' && pathname !== '/api/admin/logout';

  if (isDashboardRoute || isAdminApiRoute) {
    const adminCookie = request.cookies.get('admin_session');

    if (!adminCookie || !adminCookie.value) {
      if (isAdminApiRoute) {
        return NextResponse.json({ success: false, message: 'Unauthorized access.' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    try {
      // Cryptographically verify JWT and payload role
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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  if (isDashboardRoute) {
    const adminSession = request.cookies.get('admin_session');
    if (!adminSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Protect admin API routes (except login and logout)
  if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login' && pathname !== '/api/admin/logout') {
    const adminSession = request.cookies.get('admin_session');
    if (!adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getPublicOrigin(request: Request): string {
  // 1. Check reverse proxy headers (Render, Vercel, Cloudflare, Nginx)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    return `${forwardedProto}://${host}`;
  }

  // 2. Check standard Host header
  const host = request.headers.get('host');
  if (host && !host.includes(':10000')) {
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const proto = isLocalhost ? 'http' : (request.headers.get('x-forwarded-proto') || 'https');
    return `${proto}://${host}`;
  }

  // 3. Fallback to configured site URL environment variables if available
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, '');
  }

  // 4. Default inspection of request.url
  const { origin } = new URL(request.url);
  // Render's internal port is 10000. Never redirect a public user's browser to localhost:10000
  if (origin.includes(':10000')) {
    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_SITE_URL || 'https://zebalpha-customer.onrender.com';
    }
    return 'http://localhost:3000';
  }

  return origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;
  const next = searchParams.get('next') ?? '/';
  const origin = getPublicOrigin(request);

  // Check if provider returned an error in the query parameters (e.g. user cancelled or access denied)
  const providerError = searchParams.get('error_description') || searchParams.get('error');
  if (providerError) {
    console.error('[OAuth Callback Provider Error]:', providerError);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  }

  const cookieStore = await cookies();
  const cookiesToSetOnResponse: Array<{ name: string; value: string; options?: any }> = [];

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_A_URL ||
    'https://qjpahzstldiatfbutvfc.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: true,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieOpts = { ...options, path: '/', sameSite: 'lax', secure: true };
          try {
            cookieStore.set(name, value, cookieOpts);
          } catch {
            // Ignore if headers are already committed
          }
          cookiesToSetOnResponse.push({ name, value, options: cookieOpts });
        });
      },
    },
  });

  // 1. Handle OAuth & PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = next.startsWith('/') ? next : `/${next}`;
      const response = NextResponse.redirect(`${origin}${safeNext}`);
      // Explicitly append session auth cookies to redirect response headers
      cookiesToSetOnResponse.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.error('[OAuth Callback Error]:', error.message);
    const errMsg = error.message.toLowerCase().includes('code verifier') || error.message.toLowerCase().includes('pkce')
      ? 'oauth_session_expired'
      : error.message;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errMsg)}`);
  }

  // 2. Handle Supabase Email Confirmation / Magic Link with token_hash & type
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const safeNext = next.startsWith('/') ? next : `/${next}`;
      const response = NextResponse.redirect(`${origin}${safeNext}`);
      cookiesToSetOnResponse.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.error('[Email Link Callback Error]:', error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=verification_callback_failed`);
}

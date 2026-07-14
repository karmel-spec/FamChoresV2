import { NextResponse } from 'next/server';

// Site-wide gate: everything requires the family password except the
// login page itself and Next.js internals/static assets.
// Middleware runs on the Edge runtime (no node:crypto), so the expected
// cookie token is recomputed here with Web Crypto — same SHA-256 input as
// lib/auth.js's expectedSiteToken(), just a different API to reach it.
const PUBLIC_PATHS = ['/site-login'];
const SECRET = process.env.AUTH_SECRET || 'famchores-default-secret-change-me';
// Real value comes from the SITE_PASSWORD env var (set it on Railway) —
// must match lib/auth.js's getSitePassword() fallback exactly.
const SITE_PASSWORD = process.env.SITE_PASSWORD || 'changeme';

async function expectedSiteToken() {
  const bytes = new TextEncoder().encode(`${SECRET}|${SITE_PASSWORD}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get('fc_site');
  const expected = await expectedSiteToken();
  if (!cookie || cookie.value !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = '/site-login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import { getSetting } from './chores';

// Set AUTH_SECRET in your environment (e.g. on Railway) for a stronger session token.
const SECRET = process.env.AUTH_SECRET || 'famchores-default-secret-change-me';
export const PARENT_COOKIE = 'fc_parent';
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export function getParentPasscode() {
  return getSetting('parent_passcode', '1234');
}

// Token is derived from the current passcode, so changing the passcode invalidates
// any existing sessions.
export function expectedToken() {
  return crypto.createHash('sha256').update(`${SECRET}|${getParentPasscode()}`).digest('hex');
}

export function isParentAuthed() {
  const c = cookies().get(PARENT_COOKIE);
  return !!c && c.value === expectedToken();
}

export function requireParent() {
  if (!isParentAuthed()) redirect('/parent-login');
}

// Site-wide gate: protects the whole app (including the kids' names on the
// check-in screen) from being publicly viewable. The real password is set
// via the SITE_PASSWORD environment variable (e.g. on Railway) — never
// hardcoded here. Middleware runs on the Edge runtime and can't reach the
// SQLite settings table, so this can't use the DB-backed pattern the parent
// passcode uses; both this file and middleware.js must read the same env var.
export const SITE_COOKIE = 'fc_site';

export function getSitePassword() {
  return process.env.SITE_PASSWORD || 'changeme';
}

export function expectedSiteToken() {
  return crypto.createHash('sha256').update(`${SECRET}|${getSitePassword()}`).digest('hex');
}

export function isSiteAuthed() {
  const c = cookies().get(SITE_COOKIE);
  return !!c && c.value === expectedSiteToken();
}

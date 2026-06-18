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

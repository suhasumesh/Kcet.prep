import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectDB } from './db';
import { User } from './models/User';

const COOKIE = 'kcet_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set.');
  return s;
}

export function signSession(userId: string) {
  return jwt.sign({ uid: userId }, secret(), { expiresIn: MAX_AGE_SEC });
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function sessionUserId(): string | null {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return (jwt.verify(raw, secret()) as { uid: string }).uid;
  } catch {
    return null;
  }
}

/** The signed-in user, or null. Safe fields only. */
export async function currentUser() {
  const uid = sessionUserId();
  if (!uid) return null;
  await connectDB();
  return User.findById(uid).select('-passwordHash -verifyTokenHash -resetTokenHash').lean();
}

/** For API routes: returns the id or throws a 401-shaped error. */
export async function requireUserId() {
  const uid = sessionUserId();
  if (!uid) {
    const err = new Error('Not signed in') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return uid;
}

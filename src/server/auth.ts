import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { userProfiles, users, userSettings } from '../db/schema.ts';
import { adminAuth, firebaseProjectId } from './firebaseAdmin.ts';

export const SESSION_COOKIE_NAME = 'kasb_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  return crypto
    .createHash('sha256')
    .update(`kasb-tanla-session:${firebaseProjectId}:${process.env.SQL_DB_NAME ?? 'local'}`)
    .digest('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function hashSecretToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

interface SessionPayload {
  sub: number;
  uid: string;
  iat: number;
  exp: number;
}

export function signSessionToken(userId: number, uid: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: SessionPayload = {
    sub: userId,
    uid,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(`${header}.${body}`)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.sub || !parsed.uid || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string | null;
  phone: string | null;
  authProvider: string;
}

export interface AuthRequest extends Request {
  authUser?: AuthenticatedUser;
}

export async function upsertFirebaseUser(params: {
  uid: string;
  email?: string | null;
  name?: string | null;
}) {
  const normalizedEmail = params.email ? params.email.trim().toLowerCase() : null;
  try {
    const existingByUid = await db.query.users.findFirst({
      where: eq(users.uid, params.uid),
    });

    if (existingByUid) {
      if (normalizedEmail && existingByUid.email !== normalizedEmail) {
        const [updated] = await db
          .update(users)
          .set({ email: normalizedEmail, updatedAt: new Date() })
          .where(eq(users.id, existingByUid.id))
          .returning();
        return updated;
      }
      return existingByUid;
    }

    if (normalizedEmail) {
      const existingByEmail = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });
      if (existingByEmail) {
        const [linked] = await db
          .update(users)
          .set({
            uid: params.uid,
            authProvider: 'google',
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id))
          .returning();
        return linked;
      }
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: normalizedEmail,
        authProvider: 'google',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: normalizedEmail, updatedAt: new Date() },
      })
      .returning();

    await db
      .insert(userProfiles)
      .values({
        userId: created.id,
        fullName: params.name?.trim() || normalizedEmail?.split('@')[0] || 'O‘quvchi',
        schoolGrade: 9,
        onboardingCompleted: false,
      })
      .onConflictDoNothing({ target: userProfiles.userId });

    await db
      .insert(userSettings)
      .values({
        userId: created.id,
        language: 'uz',
        theme: 'dark',
      })
      .onConflictDoNothing({ target: userSettings.userId });

    return created;
  } catch (error) {
    console.error('Database error syncing Firebase user:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim();
  const normalizedEmail = clean.includes('@') ? clean.toLowerCase() : null;
  const normalizedPhone = clean.replace(/[\s()-]/g, '');

  try {
    return await db.query.users.findFirst({
      where: normalizedEmail
        ? eq(users.email, normalizedEmail)
        : or(eq(users.phone, normalizedPhone), eq(users.email, clean.toLowerCase())),
    });
  } catch (error) {
    console.error('Database query failed in findUserByIdentifier:', error);
    throw new Error('Database lookup failed.', { cause: error });
  }
}

async function resolveAuthUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookieToken =
    typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string'
      ? (req.cookies[SESSION_COOKIE_NAME] as string)
      : null;

  // 1. Check local signed session JWT (from Bearer or HttpOnly cookie)
  const localCandidate = bearerToken || cookieToken;
  if (localCandidate) {
    const verifiedLocal = verifySessionToken(localCandidate);
    if (verifiedLocal) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, verifiedLocal.sub),
      });
      if (dbUser && dbUser.uid === verifiedLocal.uid) {
        return {
          id: dbUser.id,
          uid: dbUser.uid,
          email: dbUser.email,
          phone: dbUser.phone,
          authProvider: dbUser.authProvider,
        };
      }
    }
  }

  // 2. Check Firebase ID Token in Authorization header
  if (bearerToken) {
    try {
      const decoded = await adminAuth.verifyIdToken(bearerToken);
      const synced = await upsertFirebaseUser({
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: typeof decoded.name === 'string' ? decoded.name : null,
      });
      return {
        id: synced.id,
        uid: synced.uid,
        email: synced.email,
        phone: synced.phone,
        authProvider: synced.authProvider,
      };
    } catch {
      return null;
    }
  }

  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await resolveAuthUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
    }
    req.authUser = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Autentifikatsiya tekshiruvida xatolik.' });
  }
};

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './rbac-filter';

const isProduction = process.env.NODE_ENV === 'production';
const rawSecret = process.env.JWT_SECRET;

// SECURITY FIX: Di environment production, JWT_SECRET WAJIB diset dan minimal 32 karakter (cegah token forgery)
if (isProduction && (!rawSecret || rawSecret.length < 32)) {
  console.error(
    'CRITICAL SECURITY ALERT: JWT_SECRET environment variable is missing or shorter than 32 characters in production!'
  );
  throw new Error('FATAL: JWT_SECRET must be configured with at least 32 characters in production.');
}

const JWT_SECRET = new TextEncoder().encode(
  rawSecret || 'mitracamsa-super-secret-jwt-key-2026-production-ready'
);

export const SESSION_COOKIE_NAME = 'mitraca_session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 hari (dalam detik)

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  isPortalActive?: boolean | null;
  agentId?: string | null;
  agentCode?: string | null;
  agentName?: string | null;
  parentAgentId?: string | null;
  parentAgentCode?: string | null;
}

/**
 * Membuat token JWT terenkripsi untuk sesi pengguna
 */
export async function signSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Memverifikasi dan mendekripsi token JWT
 */
export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserSessionPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Mengambil sesi pengguna saat ini dari cookies (untuk Server Components & Route Handlers)
 */
export async function getServerSession(): Promise<UserSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Mengambil sesi pengguna dari request NextRequest (untuk Middleware)
 */
export async function getRequestSession(req: NextRequest): Promise<UserSessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Menetapkan cookie sesi HTTP-Only pada response
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Menghapus cookie sesi saat logout
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

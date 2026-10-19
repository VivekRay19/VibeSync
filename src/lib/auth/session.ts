import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'vibesync_auth_session';

export interface UserSession {
  userId: string;
  displayName: string;
  createdAt: number;
}

function getSessionSecret(): string {
  return (
    process.env.NEON_SESSION_SECRET ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL ||
    'vibesync_default_secret_key_neon_2026'
  );
}

/**
 * Signs a payload with HMAC-SHA256
 */
function signPayload(payloadString: string): string {
  const secret = getSessionSecret();
  return crypto.createHmac('sha256', secret).update(payloadString).digest('base64url');
}

/**
 * Creates a tamper-proof signed session token
 */
export function createSignedSessionToken(userId: string, displayName: string): string {
  const session: UserSession = {
    userId,
    displayName: displayName.trim(),
    createdAt: Date.now(),
  };

  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

/**
 * Verifies and parses a signed session token. Returns null if invalid or tampered with.
 */
export function verifySessionToken(token?: string | null): UserSession | null {
  if (!token || !token.includes('.')) return null;

  try {
    const [payload, signature] = token.split('.');
    const expectedSignature = signPayload(payload);

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const session = JSON.parse(decoded) as UserSession;

    if (!session.userId || !session.displayName) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Helper to get the current authenticated session from cookies in Next.js Server Components or Route Handlers
 */
export function getAuthenticatedUser(): UserSession | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Sets the signed session cookie in response headers
 */
export function setSessionCookie(userId: string, displayName: string): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
  };
} {
  const token = createSignedSessionToken(userId, displayName);
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  };
}

import { describe, it, expect } from 'vitest';
import {
  createSignedSessionToken,
  verifySessionToken,
  setSessionCookie,
} from '@/lib/auth/session';

describe('HMAC Session Authentication & Security', () => {
  it('creates and verifies a valid signed session token', () => {
    const token = createSignedSessionToken('user_test_123', 'Alice');
    expect(token).toContain('.');

    const session = verifySessionToken(token);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe('user_test_123');
    expect(session?.displayName).toBe('Alice');
    expect(session?.createdAt).toBeGreaterThan(0);
  });

  it('rejects tampered payload', () => {
    const token = createSignedSessionToken('user_test_123', 'Alice');
    const [payload, signature] = token.split('.');

    // Tamper with payload by changing user ID
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: 'attacker_999', displayName: 'Attacker', createdAt: Date.now() })
    ).toString('base64url');

    const tamperedToken = `${tamperedPayload}.${signature}`;
    const session = verifySessionToken(tamperedToken);
    expect(session).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = createSignedSessionToken('user_test_123', 'Alice');
    const [payload] = token.split('.');

    const bogusSignature = 'invalid_signature_string_here_12345';
    const tamperedToken = `${payload}.${bogusSignature}`;

    const session = verifySessionToken(tamperedToken);
    expect(session).toBeNull();
  });

  it('rejects malformed or empty tokens', () => {
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('no-period-token')).toBeNull();
    expect(verifySessionToken('bad.json.data')).toBeNull();
  });

  it('constructs hardened cookie headers', () => {
    const cookie = setSessionCookie('user_abc', 'Bob');
    expect(cookie.name).toBe('vibesync_auth_session');
    expect(cookie.value).toContain('.');
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe('lax');
    expect(cookie.options.maxAge).toBe(2592000); // 30 days
  });
});

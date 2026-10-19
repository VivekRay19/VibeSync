'use client';

// Client-side session and guest identity helpers for VibeSync

const GUEST_STORAGE_KEY = 'vibesync_guest_session_v1';

export interface GuestSession {
  userId: string;
  displayName: string;
  avatarSeed: string;
}

export function getLocalGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveLocalGuestSession(session: GuestSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function generateOrGetGuestSession(displayName?: string): GuestSession {
  const existing = getLocalGuestSession();
  if (existing && (!displayName || existing.displayName === displayName)) {
    return existing;
  }

  const userId =
    existing?.userId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `user_${Math.random().toString(36).substring(2, 11)}`);

  const name =
    displayName?.trim() ||
    existing?.displayName ||
    `Listener_${Math.floor(1000 + Math.random() * 9000)}`;

  const avatarSeed = existing?.avatarSeed || Math.random().toString(36).substring(2, 8);

  const session: GuestSession = {
    userId,
    displayName: name,
    avatarSeed,
  };

  saveLocalGuestSession(session);
  return session;
}

export function clearLocalGuestSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_STORAGE_KEY);
}

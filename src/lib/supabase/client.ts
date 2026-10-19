import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('placeholder') && !key.includes('placeholder'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseClient;
}

// User Guest Identity Session Manager
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

  const userId = existing?.userId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user_${Math.random().toString(36).substring(2, 11)}`);
  const name = displayName?.trim() || existing?.displayName || `Listener_${Math.floor(1000 + Math.random() * 9000)}`;
  const avatarSeed = existing?.avatarSeed || Math.random().toString(36).substring(2, 8);

  const session: GuestSession = {
    userId,
    displayName: name,
    avatarSeed,
  };

  saveLocalGuestSession(session);
  return session;
}

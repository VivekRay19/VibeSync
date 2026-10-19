'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrandLogo } from '../ui/brand-logo';
import { getLocalGuestSession, GuestSession } from '@/lib/supabase/client';
import { User } from 'lucide-react';

interface NavbarProps {
  currentRoomCode?: string;
  currentRoomName?: string;
}

export function Navbar({ currentRoomCode, currentRoomName }: NavbarProps) {
  const [session, setSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    setSession(getLocalGuestSession());
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-surface-950/80 border-b border-surface-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <BrandLogo showTagline={!currentRoomCode} />

        {/* Current Room Pill */}
        {currentRoomCode && (
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-900 border border-purple-500/30 text-xs shadow-glow-purple">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-neutral-200 truncate max-w-[140px]">{currentRoomName || 'Room'}</span>
            <span className="font-mono text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/40">
              {currentRoomCode}
            </span>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-750 text-xs text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                {session.displayName.charAt(0)}
              </div>
              <span className="font-medium max-w-[110px] truncate">{session.displayName}</span>
            </div>
          ) : (
            <Link
              href="/"
              className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Guest
            </Link>
          )}

          <a
            href="https://github.com/VivekRay19/VibeSync"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-surface-850 transition-colors"
            aria-label="GitHub Repository"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}

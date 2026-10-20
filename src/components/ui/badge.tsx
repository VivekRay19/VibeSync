import React from 'react';
import { cn } from '@/lib/utils';
import { MusicProviderId, PlaybackStatus } from '@/lib/types/music';

export function ProviderBadge({ provider }: { provider: MusicProviderId }) {
  if (provider === 'audius') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/40">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        Audius
      </span>
    );
  }

  if (provider === 'verome') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-800/40">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        YouTube Music
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-950/70 text-red-300 border border-red-800/40">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      YouTube
    </span>
  );
}

export function PlaybackStatusBadge({ status }: { status: PlaybackStatus }) {
  const styles = {
    playing: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40',
    paused: 'bg-amber-950/60 text-amber-300 border-amber-800/40',
    ended: 'bg-neutral-900 text-neutral-400 border-surface-700',
    buffering: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40 animate-pulse',
  };

  const dots = {
    playing: 'bg-emerald-400 animate-pulse',
    paused: 'bg-amber-400',
    ended: 'bg-neutral-500',
    buffering: 'bg-cyan-400 animate-spin',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
        styles[status]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dots[status])} />
      {status}
    </span>
  );
}

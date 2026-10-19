'use client';

import React from 'react';
import { QueueItem, NormalizedTrack } from '@/lib/types/music';
import { formatDuration } from '@/lib/utils';
import { Button } from '../ui/button';
import { ListMusic, Play, Trash2, Search, User, Music } from 'lucide-react';

interface SharedQueueProps {
  queue: QueueItem[];
  currentTrackId?: string;
  currentUserId: string;
  isRoomOwner: boolean;
  onPlayNow: (track: NormalizedTrack, queueItemId: string) => void;
  onRemoveItem: (queueItemId: string) => void;
  onOpenSearch: () => void;
}

export function SharedQueue({
  queue,
  currentTrackId,
  currentUserId,
  isRoomOwner,
  onPlayNow,
  onRemoveItem,
  onOpenSearch,
}: SharedQueueProps) {
  return (
    <div className="flex flex-col h-full rounded-2xl bg-surface-900 border border-surface-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-semibold text-white">Shared Queue</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-800 text-neutral-300">
            {queue.length}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenSearch} className="text-xs">
          <Search className="w-3.5 h-3.5 mr-1" />
          Add Track
        </Button>
      </div>

      {queue.length === 0 ? (
        <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center p-6 text-center rounded-xl bg-surface-950/40 border border-surface-800/80 space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-850 flex items-center justify-center text-neutral-500">
            <Music className="w-6 h-6 text-purple-400/60" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-200">The queue is empty</p>
            <p className="text-xs text-neutral-400 max-w-xs">
              Anyone in this room can search and add tracks to keep the vibes flowing together.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={onOpenSearch}>
            Search & Queue Music
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
          {queue.map((item, idx) => {
            const canRemove = isRoomOwner || item.addedByUserId === currentUserId;
            const isPlaying = currentTrackId === item.track.id || currentTrackId === item.track.providerTrackId;

            return (
              <div
                key={item.id}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isPlaying
                    ? 'bg-purple-950/30 border-purple-500/40'
                    : 'bg-surface-850 hover:bg-surface-800 border-surface-750/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  <span className="text-xs font-bold text-neutral-400 w-5 text-center shrink-0">
                    {idx + 1}
                  </span>

                  {/* Artwork */}
                  <div className="w-10 h-10 rounded-lg bg-surface-900 overflow-hidden shrink-0 flex items-center justify-center border border-surface-700/60">
                    {item.track.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.track.artworkUrl}
                        alt={item.track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Music className="w-4 h-4 text-neutral-600" />
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">{item.track.title}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span className="truncate">{item.track.artistName}</span>
                      <span>&bull;</span>
                      <span className="shrink-0">{formatDuration(item.track.durationSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                      <User className="w-3 h-3 text-purple-400/80" />
                      <span>Added by {item.addedByName}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPlayNow(item.track, item.id)}
                    title="Play track now for everyone"
                    className="h-8 px-2 text-xs text-purple-300 hover:text-white"
                  >
                    <Play className="w-3.5 h-3.5 mr-1 fill-purple-400" />
                    Play
                  </Button>
                  {canRemove && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Remove from queue"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

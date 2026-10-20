'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { NormalizedTrack } from '@/lib/types/music';
import { Mic2, Loader2, AlertCircle } from 'lucide-react';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: NormalizedTrack | null;
  currentSeconds?: number;
}

interface SyncedLine {
  seconds: number;
  text: string;
}

function parseSyncedLyrics(synced: string): SyncedLine[] {
  const lines = synced.split('\n');
  const result: SyncedLine[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      result.push({ seconds: minutes * 60 + seconds, text });
    }
  }

  return result;
}

export function LyricsModal({ isOpen, onClose, track, currentSeconds = 0 }: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !track) {
      setLyrics(null);
      setSyncedLines([]);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchLyrics() {
      try {
        const url = `/api/music/lyrics?title=${encodeURIComponent(track!.title)}&artist=${encodeURIComponent(track!.artistName)}&duration=${track!.durationSeconds || ''}`;
        const res = await fetch(url);
        const data = await res.json();

        if (isCancelled) return;

        if (res.ok && data.success) {
          if (data.syncedLyrics) {
            setSyncedLines(parseSyncedLyrics(data.syncedLyrics));
          }
          setLyrics(data.plainLyrics || data.syncedLyrics || 'No lyrics text available.');
        } else {
          setError(data.error || 'Lyrics not available for this song.');
        }
      } catch {
        if (!isCancelled) {
          setError('Could not fetch lyrics at this time.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchLyrics();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, track]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <Mic2 className="w-5 h-5 text-purple-400" />
          <div className="truncate">
            <span className="font-semibold text-white">Lyrics</span>
            {track && (
              <span className="text-xs text-neutral-400 font-normal ml-2 truncate">
                — {track.title}
              </span>
            )}
          </div>
        </div>
      }
    >
      <div className="min-h-[260px] max-h-[460px] overflow-y-auto space-y-4 pr-1 text-center font-sans">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-xs text-neutral-400">Fetching lyrics from LRCLib & Verome...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="py-14 space-y-3">
            <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto" />
            <p className="text-sm text-neutral-300">{error}</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Instrumental songs, live unreleased versions, or tracks without synced lyrics in LRCLib will not display text.
            </p>
          </div>
        )}

        {!isLoading && !error && syncedLines.length > 0 && (
          <div className="space-y-3 py-4">
            {syncedLines.map((line, idx) => {
              const isCurrent =
                currentSeconds >= line.seconds &&
                (idx === syncedLines.length - 1 || currentSeconds < syncedLines[idx + 1].seconds);

              return (
                <p
                  key={idx}
                  className={`text-sm sm:text-base transition-all duration-300 font-medium ${
                    isCurrent
                      ? 'text-purple-300 scale-105 font-bold drop-shadow'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {line.text || '♪'}
                </p>
              );
            })}
          </div>
        )}

        {!isLoading && !error && syncedLines.length === 0 && lyrics && (
          <div className="py-4 whitespace-pre-line text-sm sm:text-base text-neutral-300 leading-relaxed">
            {lyrics}
          </div>
        )}
      </div>
    </Modal>
  );
}

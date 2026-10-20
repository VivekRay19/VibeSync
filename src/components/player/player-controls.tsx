'use client';

import React, { useState, useEffect } from 'react';
import { PlaybackState } from '@/lib/types/music';
import { formatDuration } from '@/lib/utils';
import { Button } from '../ui/button';
import { ProviderBadge, PlaybackStatusBadge } from '../ui/badge';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  Music,
  User,
  Mic2,
} from 'lucide-react';
import { LyricsModal } from './lyrics-modal';

interface PlayerControlsProps {
  playbackState: PlaybackState;
  currentSeconds: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  onSkipNext: () => void;
  onOpenSearch: () => void;
  localVolume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isBuffering?: boolean;
  driftStatus?: string | null;
}

export function PlayerControls({
  playbackState,
  currentSeconds,
  totalDuration,
  onPlay,
  onPause,
  onSeek,
  onSkipNext,
  onOpenSearch,
  localVolume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isBuffering = false,
  driftStatus,
}: PlayerControlsProps) {
  const [isSeekingLocally, setIsSeekingLocally] = useState(false);
  const [localSeekValue, setLocalSeekValue] = useState(currentSeconds);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);

  useEffect(() => {
    if (!isSeekingLocally) {
      setLocalSeekValue(currentSeconds);
    }
  }, [currentSeconds, isSeekingLocally]);

  const track = playbackState.track;
  const isPlaying = playbackState.playbackStatus === 'playing';
  const isVideoEmbed =
    track?.playbackType === 'video_embed' || track?.provider === 'youtube' || track?.provider === 'verome';
  const duration = totalDuration > 0 ? totalDuration : track?.durationSeconds || 1;
  const progressPercent = Math.min(100, Math.max(0, (localSeekValue / duration) * 100));

  const handleSeekCommit = () => {
    setIsSeekingLocally(false);
    onSeek(localSeekValue);
  };

  return (
    <div className="flex flex-col rounded-3xl bg-surface-900 border border-surface-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
      {/* Background glow behind artwork */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top Header / Track Metadata */}
      <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 z-10">
        {/* Large Artwork (for Audius / default empty) */}
        {!isVideoEmbed ? (
          <div className="relative group shrink-0">
            <div
              className={`w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-surface-950 border border-surface-700/80 shadow-2xl flex items-center justify-center transition-all duration-500 ${
                isPlaying ? 'ring-2 ring-purple-500/50 shadow-glow-purple' : ''
              }`}
            >
              {track?.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.artworkUrl}
                  alt={track.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-600 gap-2">
                  <Music className="w-12 h-12 text-purple-400/70" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    VibeSync
                  </span>
                </div>
              )}
            </div>

            {isPlaying && (
              <span className="absolute -bottom-2 -right-2 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 border-2 border-surface-900" />
              </span>
            )}
          </div>
        ) : null}

        {/* Track Title, Artist, Attribution */}
        <div
          className={`flex-1 space-y-2.5 min-w-0 ${
            isVideoEmbed ? 'text-left' : 'text-center md:text-left'
          }`}
        >
          <div
            className={`flex flex-wrap items-center gap-2 ${
              isVideoEmbed ? 'justify-start' : 'justify-center md:justify-start'
            }`}
          >
            <PlaybackStatusBadge status={isBuffering ? 'buffering' : playbackState.playbackStatus} />
            {track && <ProviderBadge provider={track.provider} />}
            {driftStatus && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-800/40">
                {driftStatus}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate max-w-lg">
              {track ? track.title : 'No Track Selected'}
            </h2>
            <p className="text-sm sm:text-base font-medium text-neutral-400 truncate mt-0.5">
              {track ? track.artistName : 'Search for a track to begin listening'}
            </p>
          </div>

          {/* User selection attribution */}
          {playbackState.updatedByName && (
            <div
              className={`flex items-center gap-1.5 text-xs text-neutral-400 ${
                isVideoEmbed ? 'justify-start' : 'justify-center md:justify-start'
              }`}
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Selected by <strong className="text-neutral-200">{playbackState.updatedByName}</strong>
              </span>
            </div>
          )}

          {/* Provider canonical link */}
          {track && (
            <div className="pt-1">
              <a
                href={track.providerPageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-neutral-400 hover:text-purple-400 inline-flex items-center gap-1 transition-colors"
              >
                View on{' '}
                {track.provider === 'audius'
                  ? 'Audius.co'
                  : track.provider === 'verome'
                    ? 'YouTube Music'
                    : 'YouTube.com'}{' '}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & Timestamps */}
      <div className="space-y-1.5 z-10">
        <div className="relative group flex items-center">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.5}
            value={localSeekValue}
            onChange={(e) => {
              setIsSeekingLocally(true);
              setLocalSeekValue(parseFloat(e.target.value));
            }}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            aria-label="Seek track position"
            className="w-full h-2 rounded-lg bg-surface-800 appearance-none cursor-pointer accent-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={{
              background: `linear-gradient(to right, #9333EA ${progressPercent}%, #282D40 ${progressPercent}%)`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-neutral-400">
          <span>{formatDuration(localSeekValue)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Collaborative Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 z-10 border-t border-surface-800/80">
        {/* Search CTA & Lyrics Action */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenSearch}
            className="flex-1 sm:flex-initial text-xs"
          >
            <Search className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
            Search Catalog
          </Button>

          {track && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLyricsOpen(true)}
              className="text-xs text-neutral-300 hover:text-purple-300 hover:bg-surface-800 border-surface-700/80"
              title="View lyrics for this song"
            >
              <Mic2 className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              Lyrics
            </Button>
          )}
        </div>

        {/* Center Playback Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="primary"
            onClick={isPlaying ? onPause : onPlay}
            className="w-13 h-13 rounded-2xl shadow-glow-purple"
            aria-label={isPlaying ? 'Pause for all members' : 'Play for all members'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="secondary"
            onClick={onSkipNext}
            title="Skip to next queued song"
            aria-label="Skip to next track"
            className="w-10 h-10 rounded-xl"
          >
            <SkipForward className="w-4 h-4 text-neutral-200" />
          </Button>
        </div>

        {/* Local Volume Controls (device specific) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-800 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title="Local sound volume (affects only your speakers)"
          >
            {isMuted || localVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={isMuted ? 0 : localVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Local volume"
            className="w-20 sm:w-24 h-1.5 rounded-lg bg-surface-800 appearance-none cursor-pointer accent-purple-400"
          />
          <span className="text-[11px] font-mono text-neutral-400 w-8 text-right">
            {isMuted ? '0%' : `${Math.round(localVolume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Synced Lyrics Modal */}
      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        track={track || null}
        currentSeconds={localSeekValue}
      />
    </div>
  );
}

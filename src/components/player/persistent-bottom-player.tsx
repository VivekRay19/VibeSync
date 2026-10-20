'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Airplay,
  Music2,
  Mic2,
} from 'lucide-react';
import { PlaybackState } from '@/lib/types/music';
import { formatDuration } from '@/lib/utils';
import { LyricsModal } from './lyrics-modal';

interface PersistentBottomPlayerProps {
  playbackState: PlaybackState | null;
  currentSeconds: number;
  totalDuration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onSkipNext: () => void;
  onSkipPrev?: () => void;
  localVolume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isBuffering?: boolean;
}

export function PersistentBottomPlayer({
  playbackState,
  currentSeconds,
  totalDuration,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSkipNext,
  onSkipPrev,
  localVolume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isBuffering = false,
}: PersistentBottomPlayerProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isSeekingLocally, setIsSeekingLocally] = useState(false);
  const [localSeekSeconds, setLocalSeekSeconds] = useState(currentSeconds);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isSeekingLocally) {
      setLocalSeekSeconds(currentSeconds);
    }
  }, [currentSeconds, isSeekingLocally]);

  const track = playbackState?.track;
  const duration = totalDuration > 0 ? totalDuration : track?.durationSeconds || 1;
  const progressPercent = Math.min(100, Math.max(0, (localSeekSeconds / duration) * 100));

  const handleSeekCommit = () => {
    setIsSeekingLocally(false);
    onSeek(localSeekSeconds);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-40 select-none">
        <div className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl glass-dock border border-white/[0.1] px-4 py-2.5 sm:px-6 sm:py-3 shadow-liquid-dock flex items-center justify-between gap-4">
          {/* Left: Track Artwork & Info */}
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 w-1/4 sm:w-1/3">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden bg-surface-950 border border-white/[0.08] shrink-0 shadow-md">
              {track?.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.artworkUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-950/40">
                  <Music2 className="w-5 h-5 text-purple-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {track ? track.title : 'Die For You'}
              </h4>
              <p className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5">
                {track ? track.artistName : 'The Weeknd'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLiked((prev) => !prev)}
              className="hidden sm:flex p-1.5 text-neutral-400 hover:text-white transition-colors"
              title="Save to Liked Songs"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isLiked ? 'fill-purple-500 text-purple-500' : ''
                }`}
              />
            </button>
          </div>

          {/* Center: Controls & Scrubber Progress Bar */}
          <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
            {/* Control Buttons */}
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={() => setIsShuffle((prev) => !prev)}
                className={`hidden sm:flex p-1 rounded-lg transition-colors ${
                  isShuffle ? 'text-purple-400' : 'text-neutral-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onSkipPrev}
                className="p-1 text-neutral-300 hover:text-white transition-colors"
                title="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Prominent White Circular Play/Pause Button */}
              <button
                type="button"
                onClick={isPlaying ? onPause : onPlay}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-surface-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 ${
                  isBuffering ? 'animate-pulse opacity-80' : ''
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-surface-950" />
                ) : (
                  <Play className="w-4 h-4 fill-surface-950 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onSkipNext}
                className="p-1 text-neutral-300 hover:text-white transition-colors"
                title="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsRepeat((prev) => !prev)}
                className={`hidden sm:flex p-1 rounded-lg transition-colors ${
                  isRepeat ? 'text-purple-400' : 'text-neutral-400 hover:text-white'
                }`}
                title="Repeat"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrubber Range & Timestamps */}
            <div className="w-full flex items-center gap-2.5">
              <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                {formatDuration(localSeekSeconds)}
              </span>

              <div className="relative group flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.5}
                  value={localSeekSeconds}
                  onChange={(e) => {
                    setIsSeekingLocally(true);
                    setLocalSeekSeconds(parseFloat(e.target.value));
                  }}
                  onMouseUp={handleSeekCommit}
                  onTouchEnd={handleSeekCommit}
                  aria-label="Seek track position"
                  className="w-full h-1 sm:h-1.5 rounded-lg bg-white/[0.12] appearance-none cursor-pointer accent-white focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #FFFFFF ${progressPercent}%, rgba(255, 255, 255, 0.14) ${progressPercent}%)`,
                  }}
                />
              </div>

              <span className="text-[10px] font-mono text-neutral-400 w-8">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume, Lyrics, Cast/PIP, Fullscreen */}
          <div className="flex items-center justify-end gap-2.5 w-1/4 sm:w-1/3">
            {track && (
              <button
                type="button"
                onClick={() => setIsLyricsOpen(true)}
                className="hidden md:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="View Lyrics"
              >
                <Mic2 className="w-4 h-4" />
              </button>
            )}

            {/* Volume Control Slider */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
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
                aria-label="Volume slider"
                className="w-16 md:w-20 h-1 rounded-lg bg-white/[0.14] appearance-none cursor-pointer accent-white"
              />
            </div>

            <button
              type="button"
              className="hidden md:flex p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
              title="Mini player / Cast"
            >
              <Airplay className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Synced Lyrics Modal */}
      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        track={track || null}
        currentSeconds={localSeekSeconds}
      />
    </>
  );
}

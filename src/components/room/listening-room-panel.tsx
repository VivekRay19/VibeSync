'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  MoreHorizontal,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Music2,
  Trash2,
  QrCode,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { PlaybackState, QueueItem, NormalizedTrack, Room } from '@/lib/types/music';
import { PresenceState } from '@/lib/types/realtime';
import { formatDuration } from '@/lib/utils';
import {
  isTrackLiked,
  toggleLikeTrack,
  subscribeLikedTracks,
} from '@/lib/storage/favorites';

interface ListeningRoomPanelProps {
  room: Room | null;
  playbackState: PlaybackState | null;
  queue: QueueItem[];
  presenceMembers: PresenceState[];
  currentSeconds: number;
  totalDuration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onSkipNext: () => void;
  onSkipPrev?: () => void;
  onSelectTrack: (track: NormalizedTrack) => void;
  onRemoveQueueItem?: (queueItemId: string) => void;
  onMoveQueueItem?: (queueItemId: string, direction: 'UP' | 'DOWN') => void;
  onShuffleQueue?: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  isRepeat?: boolean;
  onToggleRepeat?: () => void;
  onLeaveRoom: () => void;
  isBuffering?: boolean;
  onOpenInvite?: () => void;
}

export function ListeningRoomPanel({
  room,
  playbackState,
  queue,
  presenceMembers,
  currentSeconds,
  totalDuration,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSkipNext,
  onSkipPrev,
  onSelectTrack,
  onRemoveQueueItem,
  onMoveQueueItem,
  onShuffleQueue,
  isShuffle = false,
  onToggleShuffle,
  isRepeat = false,
  onToggleRepeat,
  onLeaveRoom,
  isBuffering = false,
  onOpenInvite,
}: ListeningRoomPanelProps) {
  const track = playbackState?.track;
  const [isLiked, setIsLiked] = useState(() => isTrackLiked(track?.id));
  const [localShuffle, setLocalShuffle] = useState(isShuffle);
  const [localRepeat, setLocalRepeat] = useState(isRepeat);
  const [isSeekingLocally, setIsSeekingLocally] = useState(false);
  const [localSeekSeconds, setLocalSeekSeconds] = useState(currentSeconds);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const roomMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync favorites state
  useEffect(() => {
    setIsLiked(isTrackLiked(track?.id));
    const unsubscribe = subscribeLikedTracks(() => {
      setIsLiked(isTrackLiked(track?.id));
    });
    return unsubscribe;
  }, [track?.id]);

  useEffect(() => {
    setLocalShuffle(isShuffle);
  }, [isShuffle]);

  useEffect(() => {
    setLocalRepeat(isRepeat);
  }, [isRepeat]);

  // Close room menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (roomMenuRef.current && !roomMenuRef.current.contains(e.target as Node)) {
        setIsRoomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleLike = () => {
    if (track) {
      const nowLiked = toggleLikeTrack(track);
      setIsLiked(nowLiked);
    }
  };

  const handleShuffleClick = () => {
    setLocalShuffle((prev) => !prev);
    if (onShuffleQueue) {
      onShuffleQueue();
    } else {
      onToggleShuffle?.();
    }
  };

  const handleRepeatClick = () => {
    setLocalRepeat((prev) => !prev);
    onToggleRepeat?.();
  };

  const copyRoomCode = () => {
    if (room?.roomCode && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(room.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyRoomLink = () => {
    if (typeof window !== 'undefined' && room?.roomCode) {
      const url = `${window.location.origin}/room/${room.roomCode}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Sync seek seconds when not dragging
  React.useEffect(() => {
    if (!isSeekingLocally) {
      setLocalSeekSeconds(currentSeconds);
    }
  }, [currentSeconds, isSeekingLocally]);

  const duration = totalDuration > 0 ? totalDuration : track?.durationSeconds || 1;
  const progressPercent = Math.min(100, Math.max(0, (localSeekSeconds / duration) * 100));

  const handleSeekRelease = () => {
    setIsSeekingLocally(false);
    onSeek(localSeekSeconds);
  };

  const memberCount = Math.max(1, presenceMembers.length || 1);
  const roomTitle = room?.name || 'Vibe Room';

  return (
    <aside className="w-80 shrink-0 flex flex-col h-full glass-panel rounded-3xl p-4 select-none overflow-hidden space-y-4">
      {/* 1. Header: Listening Together + Invite (QR) + Leave button */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-sm font-bold text-white tracking-tight">
          Listening Together
        </h2>
        <div className="flex items-center gap-1.5">
          {onOpenInvite && (
            <button
              type="button"
              onClick={onOpenInvite}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all active:scale-95 flex items-center gap-1"
              title="Invite friends with QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* 2. Room Identity & Member Card */}
      <div className="p-3.5 rounded-2xl glass-card border border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600/40 to-indigo-600/30 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300 shadow-sm">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">{roomTitle}</h3>
            <p className="text-[10px] text-neutral-400">
              {memberCount} {memberCount === 1 ? 'person' : 'people'} listening
            </p>
          </div>
        </div>

        {/* Member Avatars Stack */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex -space-x-2 overflow-hidden">
            {presenceMembers.slice(0, 3).map((m, idx) => (
              <div
                key={m.userId || idx}
                title={m.displayName}
                className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 ring-2 ring-surface-950 flex items-center justify-center text-[9px] font-bold text-white uppercase"
              >
                {m.displayName.charAt(0)}
              </div>
            ))}
            {memberCount > 3 && (
              <div className="w-6 h-6 rounded-full bg-surface-800 ring-2 ring-surface-950 flex items-center justify-center text-[9px] font-bold text-neutral-300">
                +{memberCount - 3}
              </div>
            )}
          </div>

          {/* More Options Popover */}
          <div ref={roomMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsRoomMenuOpen((prev) => !prev)}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
              title="Room options and info"
              aria-label="Room options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isRoomMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl glass-panel p-1.5 shadow-liquid-panel z-50 animate-in fade-in zoom-in-95 border border-white/[0.12] space-y-1">
                <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Room Details
                  </p>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">{roomTitle}</p>
                </div>

                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>Copy Code: {room?.roomCode}</span>
                  </span>
                  {copiedCode && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={copyRoomLink}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Copy Room Link</span>
                  </span>
                  {copiedLink && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <div className="px-3 py-1.5 text-[10px] text-neutral-400 flex items-center gap-1.5 border-t border-white/[0.06] mt-1">
                  <Info className="w-3 h-3 text-neutral-500" />
                  <span>{memberCount} active in session</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Now Playing Section */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">
          Now Playing
        </span>

        <div className="p-3.5 rounded-2xl glass-card border border-white/[0.08] space-y-3">
          {/* Track Artwork + Title/Artist + Like Heart */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-950 border border-white/[0.08] shrink-0">
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

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">
                {track ? track.title : 'No track selected'}
              </h4>
              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                {track ? track.artistName : 'Explore or search music'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleLike}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors shrink-0"
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              aria-label="Save to Liked Songs"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isLiked ? 'fill-purple-500 text-purple-500' : ''
                }`}
              />
            </button>
          </div>

          {/* Scrubber Progress Bar & Timestamps */}
          <div className="space-y-1">
            <div className="relative group flex items-center">
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
                onMouseUp={handleSeekRelease}
                onTouchEnd={handleSeekRelease}
                aria-label="Seek track"
                className="w-full h-1.5 rounded-lg bg-white/[0.1] appearance-none cursor-pointer accent-white focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #FFFFFF ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>{formatDuration(localSeekSeconds)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Playback Controls (Shuffle, Prev, Play/Pause large white button, Next, Repeat) */}
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              type="button"
              onClick={handleShuffleClick}
              className={`p-1.5 rounded-lg transition-colors ${
                localShuffle ? 'text-purple-400' : 'text-neutral-400 hover:text-white'
              }`}
              title={localShuffle ? 'Shuffle active' : 'Shuffle queue'}
              aria-label="Toggle Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onSkipPrev}
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Prominent White Circular Play/Pause Button */}
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className={`w-10 h-10 rounded-full bg-white text-surface-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md ${
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
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRepeatClick}
              className={`p-1.5 rounded-lg transition-colors ${
                localRepeat ? 'text-purple-400' : 'text-neutral-400 hover:text-white'
              }`}
              title={localRepeat ? 'Repeat active' : 'Repeat track'}
              aria-label="Toggle Repeat"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Up Next Queue Section */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Up Next
            </span>
            <span className="text-[10px] text-neutral-500">
              {queue.length} {queue.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
          {queue.length > 1 && (
            <button
              type="button"
              onClick={handleShuffleClick}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-neutral-400 hover:text-purple-300 hover:bg-white/[0.04] transition-all flex items-center gap-1"
              title="Shuffle queue order"
            >
              <Shuffle className="w-3 h-3" />
              <span>Shuffle</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1">
          {queue.length === 0 ? (
            <div className="p-4 rounded-xl glass-card text-center space-y-1">
              <p className="text-xs text-neutral-400">Queue is empty</p>
              <p className="text-[10px] text-neutral-500">Search songs to add to the queue</p>
            </div>
          ) : (
            queue.map((item, idx) => (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-2.5 p-2 rounded-xl glass-card hover:bg-white/[0.08] transition-all"
              >
                <div
                  onClick={() => onSelectTrack(item.track)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-950 shrink-0 border border-white/[0.06]">
                    {item.track.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.track.artworkUrl}
                        alt={item.track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-950/40">
                        <Music2 className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                      {item.track.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {item.track.artistName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Up / Down reorder buttons */}
                  {onMoveQueueItem && idx > 0 && (
                    <button
                      type="button"
                      onClick={() => onMoveQueueItem(item.id, 'UP')}
                      className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                      title="Move track up"
                      aria-label="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onMoveQueueItem && idx < queue.length - 1 && (
                    <button
                      type="button"
                      onClick={() => onMoveQueueItem(item.id, 'DOWN')}
                      className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                      title="Move track down"
                      aria-label="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onRemoveQueueItem && (
                    <button
                      type="button"
                      onClick={() => onRemoveQueueItem(item.id)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

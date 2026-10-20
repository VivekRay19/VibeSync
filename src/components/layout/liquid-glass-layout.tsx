'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { TopSearchBar } from '@/components/navigation/top-search-bar';
import { ListeningRoomPanel } from '@/components/room/listening-room-panel';
import { PersistentBottomPlayer } from '@/components/player/persistent-bottom-player';
import { AudioPlayer } from '@/components/player/audio-player';
import { YouTubePlayer } from '@/components/player/youtube-player';
import { Room, PlaybackState, QueueItem, NormalizedTrack } from '@/lib/types/music';
import { PresenceState } from '@/lib/types/realtime';
import { GuestSession } from '@/lib/auth/client';
import { Users, X } from 'lucide-react';

interface LiquidGlassLayoutProps {
  children: React.ReactNode;
  session: GuestSession | null;
  room: Room | null;
  playbackState: PlaybackState | null;
  queue: QueueItem[];
  presenceMembers: PresenceState[];
  currentSeconds: number;
  totalDuration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  localVolume: number;
  isMuted: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onSkipNext: () => void;
  onSkipPrev?: () => void;
  onSelectTrack: (track: NormalizedTrack) => void;
  onRemoveQueueItem?: (queueItemId: string) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onOpenSearch?: () => void;
  onLeaveRoom: () => void;
  onLogout?: () => void;
  onTrackEnded: () => void;
  onDriftCorrected?: (driftSeconds: number) => void;
  onBufferingChange?: (isBuffering: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  activePlaylist?: string | null;
  onSelectPlaylist?: (playlistName: string) => void;
  onAddToQueue?: (track: NormalizedTrack) => void;
  onOpenInvite?: () => void;
}

export function LiquidGlassLayout({
  children,
  session,
  room,
  playbackState,
  queue,
  presenceMembers,
  currentSeconds,
  totalDuration,
  isPlaying,
  isBuffering,
  localVolume,
  isMuted,
  onPlay,
  onPause,
  onSeek,
  onSkipNext,
  onSkipPrev,
  onSelectTrack,
  onRemoveQueueItem,
  onVolumeChange,
  onToggleMute,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onOpenSearch,
  onLeaveRoom,
  onLogout,
  onTrackEnded,
  onDriftCorrected,
  onBufferingChange,
  onTimeUpdate,
  activePlaylist,
  onSelectPlaylist,
  onAddToQueue,
  onOpenInvite,
}: LiquidGlassLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileRoomPanelOpen, setMobileRoomPanelOpen] = useState(false);

  const activeTrack = playbackState?.track;
  const isVideoEmbed =
    activeTrack?.playbackType === 'video_embed' ||
    activeTrack?.provider === 'youtube' ||
    activeTrack?.provider === 'verome';

  return (
    <div className="relative min-h-screen w-full bg-[#07080E] text-white flex flex-col overflow-hidden font-sans">
      {/* Background Ambient Cosmic Mesh and Aurora Ribbons */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-right purple glow */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-purple-700/15 blur-[140px]" />
        {/* Center cyan glow */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
        {/* Bottom-left electric blue glow */}
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[150px]" />
      </div>

      {/* Main 3-Column Desktop Interface */}
      <div className="relative z-10 flex-1 flex h-screen p-2 sm:p-3.5 gap-2 sm:gap-3.5 overflow-hidden">
        {/* LEFT COLUMN: Sidebar (Desktop) */}
        <div className="hidden lg:flex h-full">
          <Sidebar
            onOpenCreateRoom={onOpenCreateRoom}
            onOpenJoinRoom={onOpenJoinRoom}
            onOpenSearch={onOpenSearch}
            activePlaylist={activePlaylist}
            onSelectPlaylist={onSelectPlaylist}
          />
        </div>

        {/* CENTER COLUMN: Main Content Stream */}
        <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Top Search & Account Bar */}
          <div className="flex items-center gap-2 mb-2 w-full">
            <div className="flex-1 min-w-0">
              <TopSearchBar
                session={session}
                onSelectTrack={onSelectTrack}
                onAddToQueue={onAddToQueue}
                onOpenCreateRoom={onOpenCreateRoom}
                onOpenJoinRoom={onOpenJoinRoom}
                onOpenMobileNav={() => setMobileDrawerOpen(true)}
                onLogout={onLogout}
                isInRoom={!!room}
                onOpenInvite={onOpenInvite}
              />
            </div>

            {/* Tablet/Medium Screen Room Panel Toggle (hidden on mobile and desktop) */}
            <button
              type="button"
              onClick={() => setMobileRoomPanelOpen((prev) => !prev)}
              className="hidden md:flex xl:hidden p-2 rounded-xl glass-pill text-neutral-300 hover:text-white items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Open Room Panel"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>Room</span>
            </button>
          </div>

          {/* Scrollable Main Area (Banner, Cards, Discovery) */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-32 pr-1">
            {children}
          </div>
        </main>

        {/* RIGHT COLUMN: Listening Room & Queue Panel (Desktop) */}
        <div className="hidden xl:flex h-full">
          <ListeningRoomPanel
            room={room}
            playbackState={playbackState}
            queue={queue}
            presenceMembers={presenceMembers}
            currentSeconds={currentSeconds}
            totalDuration={totalDuration}
            isPlaying={isPlaying}
            onPlay={onPlay}
            onPause={onPause}
            onSeek={onSeek}
            onSkipNext={onSkipNext}
            onSkipPrev={onSkipPrev}
            onSelectTrack={onSelectTrack}
            onRemoveQueueItem={onRemoveQueueItem}
            onLeaveRoom={onLeaveRoom}
            isBuffering={isBuffering}
          />
        </div>
      </div>

      {/* MOBILE DRAWER: Sidebar (Mobile / Tablet) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full p-3 bg-surface-950/95 border-r border-white/[0.1] shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="self-end p-2 text-neutral-400 hover:text-white mb-2"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              onOpenCreateRoom={() => {
                setMobileDrawerOpen(false);
                onOpenCreateRoom();
              }}
              onOpenJoinRoom={() => {
                setMobileDrawerOpen(false);
                onOpenJoinRoom();
              }}
              onOpenSearch={() => {
                setMobileDrawerOpen(false);
                onOpenSearch?.();
              }}
              activePlaylist={activePlaylist}
              onSelectPlaylist={(name) => {
                setMobileDrawerOpen(false);
                onSelectPlaylist?.(name);
              }}
            />
          </div>
        </div>
      )}

      {/* MOBILE DRAWER: Listening Room Panel (Mobile / Tablet) */}
      {mobileRoomPanelOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileRoomPanelOpen(false)}
          />
          <div className="relative z-10 w-84 max-w-[90vw] h-full p-3 bg-surface-950/95 border-l border-white/[0.1] shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setMobileRoomPanelOpen(false)}
              className="self-end p-2 text-neutral-400 hover:text-white mb-1"
            >
              <X className="w-5 h-5" />
            </button>
            <ListeningRoomPanel
              room={room}
              playbackState={playbackState}
              queue={queue}
              presenceMembers={presenceMembers}
              currentSeconds={currentSeconds}
              totalDuration={totalDuration}
              isPlaying={isPlaying}
              onPlay={onPlay}
              onPause={onPause}
              onSeek={onSeek}
              onSkipNext={onSkipNext}
              onSkipPrev={onSkipPrev}
              onSelectTrack={onSelectTrack}
              onRemoveQueueItem={onRemoveQueueItem}
              onLeaveRoom={() => {
                setMobileRoomPanelOpen(false);
                onLeaveRoom();
              }}
              isBuffering={isBuffering}
            />
          </div>
        </div>
      )}

      {/* Fixed Bottom Liquid Glass Player Dock */}
      <PersistentBottomPlayer
        playbackState={playbackState}
        currentSeconds={currentSeconds}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSkipNext={onSkipNext}
        onSkipPrev={onSkipPrev}
        localVolume={localVolume}
        onVolumeChange={onVolumeChange}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        isBuffering={isBuffering}
      />

      {/* Real Audio / Video Media Player Engines (Seamless background execution) */}
      {playbackState && playbackState.track && (
        <div className="fixed -bottom-96 -right-96 opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
          {isVideoEmbed ? (
            <YouTubePlayer
              playbackState={playbackState}
              onTrackEnded={onTrackEnded}
              onDriftCorrected={onDriftCorrected}
              onBufferingChange={onBufferingChange}
              onTimeUpdate={onTimeUpdate}
              localVolume={localVolume}
              isMuted={isMuted}
            />
          ) : (
            <AudioPlayer
              playbackState={playbackState}
              onTrackEnded={onTrackEnded}
              onDriftCorrected={onDriftCorrected}
              onBufferingChange={onBufferingChange}
              onTimeUpdate={onTimeUpdate}
              localVolume={localVolume}
              isMuted={isMuted}
            />
          )}
        </div>
      )}
    </div>
  );
}

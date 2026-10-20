'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiquidGlassLayout } from '@/components/layout/liquid-glass-layout';
import { HeroBanner } from '@/components/discovery/hero-banner';
import { DiscoverySections } from '@/components/discovery/discovery-sections';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MusicSearchModal } from '@/components/search/music-search-modal';
import {
  generateOrGetGuestSession,
  getLocalGuestSession,
  GuestSession,
} from '@/lib/auth/client';
import {
  Room,
  PlaybackState,
  QueueItem,
  NormalizedTrack,
} from '@/lib/types/music';
import { PresenceState } from '@/lib/types/realtime';
import { Radio, Users } from 'lucide-react';

// Default initial track matching the reference UI screenshot: Die For You by The Weeknd
const DEFAULT_DIE_FOR_YOU_TRACK: NormalizedTrack = {
  id: 'verome:u9n7Cw-4_PE',
  provider: 'verome',
  providerTrackId: 'u9n7Cw-4_PE',
  title: 'Die For You',
  artistName: 'The Weeknd',
  artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&q=80',
  durationSeconds: 260,
  providerPageUrl: 'https://music.youtube.com/watch?v=u9n7Cw-4_PE',
  playbackType: 'video_embed',
  isPlayable: true,
  attributionText: 'Die For You by The Weeknd via YouTube Music (Verome)',
};

// Initial Up Next Queue matching the reference UI screenshot
const INITIAL_QUEUE_TRACKS: QueueItem[] = [
  {
    id: 'q-1',
    roomId: 'home-preview',
    track: {
      id: 'verome:LDY_XReBw9A',
      provider: 'verome',
      providerTrackId: 'LDY_XReBw9A',
      title: 'Snooze',
      artistName: 'SZA',
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop&q=80',
      durationSeconds: 201,
      providerPageUrl: 'https://music.youtube.com/watch?v=LDY_XReBw9A',
      playbackType: 'video_embed',
      isPlayable: true,
    },
    addedByUserId: 'user-system',
    addedByName: 'VibeSync',
    queuePosition: 1,
    createdAt: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: 'q-2',
    roomId: 'home-preview',
    track: {
      id: 'verome:H5v3kku4y6Q',
      provider: 'verome',
      providerTrackId: 'H5v3kku4y6Q',
      title: 'As It Was',
      artistName: 'Harry Styles',
      artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop&q=80',
      durationSeconds: 167,
      providerPageUrl: 'https://music.youtube.com/watch?v=H5v3kku4y6Q',
      playbackType: 'video_embed',
      isPlayable: true,
    },
    addedByUserId: 'user-system',
    addedByName: 'VibeSync',
    queuePosition: 2,
    createdAt: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: 'q-3',
    roomId: 'home-preview',
    track: {
      id: 'verome:G7KNmW9a75Y',
      provider: 'verome',
      providerTrackId: 'G7KNmW9a75Y',
      title: 'Flowers',
      artistName: 'Miley Cyrus',
      artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=200&h=200&fit=crop&q=80',
      durationSeconds: 200,
      providerPageUrl: 'https://music.youtube.com/watch?v=G7KNmW9a75Y',
      playbackType: 'video_embed',
      isPlayable: true,
    },
    addedByUserId: 'user-system',
    addedByName: 'VibeSync',
    queuePosition: 3,
    createdAt: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: 'q-4',
    roomId: 'home-preview',
    track: {
      id: 'verome:ic8j13-tORs',
      provider: 'verome',
      providerTrackId: 'ic8j13-tORs',
      title: 'Cruel Summer',
      artistName: 'Taylor Swift',
      artworkUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop&q=80',
      durationSeconds: 178,
      providerPageUrl: 'https://music.youtube.com/watch?v=ic8j13-tORs',
      playbackType: 'video_embed',
      isPlayable: true,
    },
    addedByUserId: 'user-system',
    addedByName: 'VibeSync',
    queuePosition: 4,
    createdAt: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: 'q-5',
    roomId: 'home-preview',
    track: {
      id: 'verome:WcIcVapfqXw',
      provider: 'verome',
      providerTrackId: 'WcIcVapfqXw',
      title: 'Calm Down',
      artistName: 'Rema',
      artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop&q=80',
      durationSeconds: 219,
      providerPageUrl: 'https://music.youtube.com/watch?v=WcIcVapfqXw',
      playbackType: 'video_embed',
      isPlayable: true,
    },
    addedByUserId: 'user-system',
    addedByName: 'VibeSync',
    queuePosition: 5,
    createdAt: new Date().toISOString(),
    status: 'pending',
  },
];

export default function HomePage() {
  const router = useRouter();

  // User session
  const [session, setSession] = useState<GuestSession | null>(null);

  // Home preview room state
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    roomId: 'home-preview',
    provider: 'verome',
    providerTrackId: DEFAULT_DIE_FOR_YOU_TRACK.providerTrackId,
    track: DEFAULT_DIE_FOR_YOU_TRACK,
    playbackStatus: 'paused',
    basePositionSeconds: 84, // 1:24 as in screenshot!
    updatedAtServer: new Date().toISOString(),
    revision: 1,
    updatedBy: 'system',
    updatedByName: 'The Weeknd',
  });

  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE_TRACKS);
  const [currentSeconds, setCurrentSeconds] = useState(84); // 1:24
  const [totalDuration, setTotalDuration] = useState(260); // 4:20
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [localVolume, setLocalVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('Chill Vibes & Beats');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);

  // Mock presence listeners for the visual preview room
  const presenceMembers: PresenceState[] = [
    { userId: 'u-1', displayName: 'Maya', isOwner: true, onlineAt: new Date().toISOString() },
    { userId: 'u-2', displayName: 'Alex', isOwner: false, onlineAt: new Date().toISOString() },
    { userId: 'u-3', displayName: 'Jordan', isOwner: false, onlineAt: new Date().toISOString() },
    { userId: 'u-4', displayName: 'Sam', isOwner: false, onlineAt: new Date().toISOString() },
    { userId: 'u-5', displayName: 'Robin', isOwner: false, onlineAt: new Date().toISOString() },
  ];

  const previewRoom: Room = {
    id: 'home-preview',
    roomCode: 'VIBE01',
    name: 'Vibe Room',
    ownerId: 'u-1',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  useEffect(() => {
    const s = getLocalGuestSession();
    if (s) {
      setSession(s);
      setCreateDisplayName(s.displayName);
      setJoinDisplayName(s.displayName);
    }
  }, []);

  // Playback Control Handlers
  const handlePlay = () => {
    setIsPlaying(true);
    setPlaybackState((prev) => ({
      ...prev,
      playbackStatus: 'playing',
      basePositionSeconds: currentSeconds,
      updatedAtServer: new Date().toISOString(),
      revision: prev.revision + 1,
    }));
  };

  const handlePause = () => {
    setIsPlaying(false);
    setPlaybackState((prev) => ({
      ...prev,
      playbackStatus: 'paused',
      basePositionSeconds: currentSeconds,
      updatedAtServer: new Date().toISOString(),
      revision: prev.revision + 1,
    }));
  };

  const handleSeek = (pos: number) => {
    setCurrentSeconds(pos);
    setPlaybackState((prev) => ({
      ...prev,
      basePositionSeconds: pos,
      updatedAtServer: new Date().toISOString(),
      revision: prev.revision + 1,
    }));
  };

  const handleSelectTrack = (track: NormalizedTrack) => {
    setPlaybackState({
      roomId: 'home-preview',
      provider: track.provider,
      providerTrackId: track.providerTrackId,
      track,
      playbackStatus: 'playing',
      basePositionSeconds: 0,
      updatedAtServer: new Date().toISOString(),
      revision: playbackState.revision + 1,
      updatedBy: session?.userId || 'guest',
      updatedByName: session?.displayName || 'Listener',
    });
    setCurrentSeconds(0);
    setTotalDuration(track.durationSeconds || 240);
    setIsPlaying(true);
  };

  const handleSkipNext = () => {
    if (queue.length > 0) {
      const nextItem = queue[0];
      const remaining = queue.slice(1);
      setQueue(remaining);
      handleSelectTrack(nextItem.track);
    }
  };

  const handleSkipPrev = () => {
    handleSeek(0);
  };

  const handleTrackEnded = () => {
    handleSkipNext();
  };

  // Create Room Action
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomName.trim() || !createDisplayName.trim()) {
      setCreateError('Please enter a room name and your display name');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const guestSession = generateOrGetGuestSession(createDisplayName.trim());
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createRoomName.trim(),
          displayName: guestSession.displayName,
          userId: guestSession.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create room');
      }

      router.push(`/room/${data.room.roomCode}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating room');
      setCreateLoading(false);
    }
  };

  // Join Room Action
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinDisplayName.trim()) {
      setJoinError('Please provide both room code and your display name');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const guestSession = generateOrGetGuestSession(joinDisplayName.trim());
      const cleanCode = joinCode.trim().toUpperCase();

      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: cleanCode,
          displayName: guestSession.displayName,
          userId: guestSession.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Could not find or join room');
      }

      router.push(`/room/${cleanCode}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Invalid room code');
      setJoinLoading(false);
    }
  };

  return (
    <LiquidGlassLayout
      session={session}
      room={previewRoom}
      playbackState={playbackState}
      queue={queue}
      presenceMembers={presenceMembers}
      currentSeconds={currentSeconds}
      totalDuration={totalDuration}
      isPlaying={isPlaying}
      isBuffering={isBuffering}
      localVolume={localVolume}
      isMuted={isMuted}
      onPlay={handlePlay}
      onPause={handlePause}
      onSeek={handleSeek}
      onSkipNext={handleSkipNext}
      onSkipPrev={handleSkipPrev}
      onSelectTrack={handleSelectTrack}
      onAddToQueue={(track) => {
        const newItem: QueueItem = {
          id: `q-${Date.now()}`,
          roomId: 'home-preview',
          track,
          addedByUserId: session?.userId || 'guest',
          addedByName: session?.displayName || 'You',
          queuePosition: queue.length + 1,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        setQueue((prev) => [...prev, newItem]);
      }}
      onRemoveQueueItem={(itemId) =>
        setQueue((prev) => prev.filter((item) => item.id !== itemId))
      }
      onVolumeChange={(vol) => {
        setLocalVolume(vol);
        if (isMuted && vol > 0) setIsMuted(false);
      }}
      onToggleMute={() => setIsMuted((prev) => !prev)}
      onOpenCreateRoom={() => setIsCreateOpen(true)}
      onOpenJoinRoom={() => setIsJoinOpen(true)}
      onOpenSearch={() => setIsSearchModalOpen(true)}
      onLeaveRoom={() => setIsCreateOpen(true)}
      onTrackEnded={handleTrackEnded}
      onTimeUpdate={(curr, dur) => {
        setCurrentSeconds(curr);
        if (dur > 0) setTotalDuration(dur);
      }}
      onBufferingChange={(buff) => setIsBuffering(buff)}
      activePlaylist={activePlaylist}
      onSelectPlaylist={(pl) => {
        setActivePlaylist(pl);
        setIsSearchModalOpen(true);
      }}
    >
      {/* 1. Hero Banner */}
      <HeroBanner
        onCreateRoom={() => setIsCreateOpen(true)}
        onJoinRoom={() => setIsJoinOpen(true)}
      />

      {/* 2. Made for You and Recently Played Music Discovery Cards */}
      <DiscoverySections
        onPlayTrack={handleSelectTrack}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        activeTrackId={playbackState.track?.id}
      />

      {/* Create Room Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <span>Create a Listening Room</span>
          </div>
        }
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <Input
            label="Room Name"
            value={createRoomName}
            onChange={(e) => setCreateRoomName(e.target.value)}
            placeholder="e.g. Midnight Beats, Study Session"
            required
            autoFocus
          />

          <Input
            label="Your Display Name"
            value={createDisplayName}
            onChange={(e) => setCreateDisplayName(e.target.value)}
            placeholder="e.g. Alex, Maya"
            helperText="Visible to everyone who joins your room."
            required
          />

          {createError && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createLoading}>
              Launch Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Join a Listening Room</span>
          </div>
        }
      >
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <Input
            label="Room Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. K9T2A8"
            maxLength={8}
            className="font-mono uppercase tracking-widest text-center text-lg"
            required
            autoFocus
          />

          <Input
            label="Your Display Name"
            value={joinDisplayName}
            onChange={(e) => setJoinDisplayName(e.target.value)}
            placeholder="e.g. Jordan, Sam"
            required
          />

          {joinError && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
              {joinError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={joinLoading}>
              Join Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Music Search Modal */}
      <MusicSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectTrack={handleSelectTrack}
        onAddToQueue={(track) => {
          const newItem: QueueItem = {
            id: `q-${Date.now()}`,
            roomId: 'home-preview',
            track,
            addedByUserId: session?.userId || 'guest',
            addedByName: session?.displayName || 'Listener',
            queuePosition: queue.length + 1,
            createdAt: new Date().toISOString(),
            status: 'pending',
          };
          setQueue((prev) => [...prev, newItem]);
        }}
        currentTrackId={playbackState.track?.id}
      />
    </LiquidGlassLayout>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { Footer } from '@/components/navigation/footer';
import { RoomHeader } from '@/components/room/room-header';
import { AudioPlayer } from '@/components/player/audio-player';
import { YouTubePlayer } from '@/components/player/youtube-player';
import { PlayerControls } from '@/components/player/player-controls';
import { SharedQueue } from '@/components/queue/shared-queue';
import { ParticipantList } from '@/components/room/participant-list';
import { MusicSearchModal } from '@/components/search/music-search-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Room,
  RoomMember,
  PlaybackState,
  QueueItem,
  NormalizedTrack,
} from '@/lib/types/music';
import { PresenceState } from '@/lib/types/realtime';
import {
  generateOrGetGuestSession,
  getLocalGuestSession,
  GuestSession,
} from '@/lib/auth/client';
import { Loader2, AlertCircle, Headphones } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params?.code as string) || '';
  const roomCode = rawCode.toUpperCase();

  // Session state
  const [session, setSession] = useState<GuestSession | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [needsNamePrompt, setNeedsNamePrompt] = useState(false);

  // Room core data
  const [room, setRoom] = useState<Room | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [presenceMembers, setPresenceMembers] = useState<PresenceState[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // Local audio state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [driftStatus, setDriftStatus] = useState<string | null>(null);

  // UI state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cross-tab broadcast channel for local multi-user testing
  const tabBroadcastRef = useRef<BroadcastChannel | null>(null);

  // Initialize guest session and volume
  useEffect(() => {
    const savedVol = localStorage.getItem('vibesync_local_volume');
    if (savedVol) {
      setLocalVolume(parseFloat(savedVol));
    }

    const currentSession = getLocalGuestSession();
    if (currentSession) {
      setSession(currentSession);
    } else {
      setNeedsNamePrompt(true);
    }
  }, []);

  // Save volume changes locally
  const handleVolumeChange = (vol: number) => {
    setLocalVolume(vol);
    if (isMuted && vol > 0) setIsMuted(false);
    localStorage.setItem('vibesync_local_volume', String(vol));
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Join Room API action
  const loadRoom = useCallback(async (currentSession: GuestSession) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          displayName: currentSession.displayName,
          userId: currentSession.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to join listening room');
      }

      setRoom(data.room);
      setPlaybackState(data.playbackState);
      setMembers(data.members || []);
      setQueue(data.queue || []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error joining room');
    } finally {
      setIsLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    if (session && !needsNamePrompt) {
      loadRoom(session);
    }
  }, [session, needsNamePrompt, loadRoom]);

  // Set up Server-Sent Events (SSE) stream & Browser BroadcastChannel
  useEffect(() => {
    if (!room || !session) return;

    const channelName = `vibesync_room_${room.id}`;

    // 1. Browser BroadcastChannel for instant local multi-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const tabChannel = new BroadcastChannel(channelName);
      tabBroadcastRef.current = tabChannel;

      tabChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'STATE_UPDATE' && payload) {
          setPlaybackState((prev) => {
            if (!prev || (payload.revision || 0) >= (prev.revision || 0)) {
              return payload;
            }
            return prev;
          });
        } else if (type === 'QUEUE_UPDATE' && payload) {
          setQueue(payload);
        } else if (type === 'ROOM_CLOSED') {
          router.push('/?closed=true');
        }
      };
    }

    // 2. Server-Sent Events (SSE) stream for cross-device real-time sync
    const eventUrl = `/api/rooms/events?roomId=${encodeURIComponent(room.id)}&userId=${encodeURIComponent(session.userId)}&displayName=${encodeURIComponent(session.displayName)}`;
    const eventSource = new EventSource(eventUrl);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, payload } = parsed;

        if (type === 'PLAYBACK_STATE' && payload?.state) {
          const incoming = payload.state as PlaybackState;
          setPlaybackState((prev) => {
            if (!prev || incoming.revision >= prev.revision) {
              return incoming;
            }
            return prev;
          });
        } else if (type === 'QUEUE_UPDATE' && payload?.queue) {
          setQueue(payload.queue);
        } else if (type === 'PRESENCE_SYNC' && payload?.members) {
          const activePresences: PresenceState[] = (payload.members as Array<{ userId: string; displayName: string; joinedAt?: string }>).map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            isOwner: room.ownerId === m.userId,
            onlineAt: m.joinedAt || new Date().toISOString(),
          }));
          setPresenceMembers(activePresences);
        } else if (type === 'USER_JOINED' && payload) {
          setMembers((prev) => {
            if (prev.some((m) => m.userId === payload.userId)) return prev;
            return [
              ...prev,
              {
                id: payload.userId,
                roomId: room.id,
                userId: payload.userId,
                displayName: payload.displayName,
                role: 'member',
                joinedAt: payload.joinedAt || new Date().toISOString(),
              },
            ];
          });
        } else if (type === 'MEMBER_KICKED') {
          if (payload.targetUserId === session.userId) {
            alert('You have been removed from the listening room by the owner.');
            router.push('/');
          } else if (payload.members) {
            setMembers(payload.members);
          }
        } else if (type === 'ROOM_CLOSED') {
          router.push('/?closed=true');
        }
      } catch (err) {
        console.error('Error handling SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection interrupted, browser will auto-reconnect:', err);
    };

    return () => {
      if (tabBroadcastRef.current) {
        tabBroadcastRef.current.close();
      }
      eventSource.close();
    };
  }, [room, session, router]);

  // Execute playback command via API and broadcast
  const sendPlaybackCommand = async (
    command: 'PLAY' | 'PAUSE' | 'RESUME' | 'SEEK' | 'SELECT_TRACK' | 'SKIP_NEXT',
    positionSeconds = 0,
    track?: NormalizedTrack,
    queueItemId?: string | null
  ) => {
    if (!room || !playbackState || !session) return;

    try {
      const res = await fetch('/api/rooms/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          command,
          positionSeconds,
          revision: playbackState.revision,
          track,
          queueItemId,
          userId: session.userId,
          displayName: session.displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Command failed');
      }

      if (data.state) {
        setPlaybackState(data.state);

        // Broadcast to local tabs
        if (tabBroadcastRef.current) {
          tabBroadcastRef.current.postMessage({
            type: 'STATE_UPDATE',
            payload: data.state,
          });
        }
      }
    } catch (err) {
      console.error('Playback command error:', err);
    }
  };

  // Playback Control Handlers
  const handlePlay = () => sendPlaybackCommand('PLAY', currentTime);
  const handlePause = () => sendPlaybackCommand('PAUSE', currentTime);
  const handleSeek = (pos: number) => sendPlaybackCommand('SEEK', pos);
  const handleSelectTrack = (track: NormalizedTrack) =>
    sendPlaybackCommand('SELECT_TRACK', 0, track);

  const handleSkipNext = () => sendPlaybackCommand('SKIP_NEXT', 0);

  // Track ended handler (advance queue once)
  const handleTrackEnded = () => {
    sendPlaybackCommand('SKIP_NEXT', 0);
  };

  // Queue actions
  const handleAddToQueue = async (track: NormalizedTrack) => {
    if (!room || !session) return;

    try {
      const res = await fetch('/api/rooms/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'ADD',
          track,
          userId: session.userId,
          displayName: session.displayName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.item) {
        setQueue((prev) => {
          const updated = [...prev, data.item];
          if (tabBroadcastRef.current) {
            tabBroadcastRef.current.postMessage({ type: 'QUEUE_UPDATE', payload: updated });
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Add to queue error:', err);
    }
  };

  const handleRemoveQueueItem = async (queueItemId: string) => {
    if (!room || !session) return;

    try {
      const res = await fetch('/api/rooms/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'REMOVE',
          queueItemId,
          userId: session.userId,
          displayName: session.displayName,
        }),
      });

      if (res.ok) {
        setQueue((prev) => {
          const updated = prev.filter((i) => i.id !== queueItemId);
          if (tabBroadcastRef.current) {
            tabBroadcastRef.current.postMessage({ type: 'QUEUE_UPDATE', payload: updated });
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Remove queue item error:', err);
    }
  };

  const handlePlayQueuedTrack = (track: NormalizedTrack, queueItemId: string) => {
    sendPlaybackCommand('SELECT_TRACK', 0, track, queueItemId);
  };

  // Moderation actions
  const handleKickMember = async (targetUserId: string) => {
    if (!room || !session) return;
    try {
      await fetch('/api/rooms/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'KICK_MEMBER',
          targetUserId,
          callerId: session.userId,
        }),
      });
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    } catch (err) {
      console.error('Kick member error:', err);
    }
  };

  const handleCloseRoom = async () => {
    if (!room || !session) return;
    try {
      await fetch('/api/rooms/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'CLOSE_ROOM',
          callerId: session.userId,
        }),
      });
      if (tabBroadcastRef.current) {
        tabBroadcastRef.current.postMessage({ type: 'ROOM_CLOSED' });
      }
      router.push('/');
    } catch (err) {
      console.error('Close room error:', err);
    }
  };

  const handleLeaveRoom = () => {
    router.push('/');
  };

  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;
    const newSession = generateOrGetGuestSession(displayNameInput.trim());
    setSession(newSession);
    setNeedsNamePrompt(false);
  };

  // Drift notification feedback
  const handleDriftCorrected = (driftSeconds: number) => {
    setDriftStatus(`Synced (-${driftSeconds.toFixed(1)}s)`);
    setTimeout(() => setDriftStatus(null), 3000);
  };

  // Name prompt modal for first-time direct invite link visitors
  if (needsNamePrompt) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-neutral-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-2xl bg-surface-900 border border-surface-800 shadow-2xl space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Join Listening Session</h2>
              <p className="text-xs text-neutral-400">
                You were invited to room <strong className="text-purple-300 font-mono">{roomCode}</strong>.
                Choose a display name so others can see you in the room.
              </p>
            </div>
            <form onSubmit={handleSaveDisplayName} className="space-y-4">
              <Input
                label="Your Display Name"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="e.g. Robin, Taylor"
                required
                autoFocus
              />
              <Button type="submit" variant="primary" className="w-full">
                Enter Listening Room
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-neutral-100">
        <Navbar currentRoomCode={roomCode} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm font-medium text-neutral-300">Synchronizing room state...</p>
        </main>
      </div>
    );
  }

  // Error state (invalid code, closed room, network failure)
  if (errorMessage || !room || !playbackState) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-950 text-neutral-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md p-8 rounded-2xl bg-surface-900 border border-surface-800 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Unable to Enter Room</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {errorMessage || 'This room code is invalid, or the host has closed the room.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => router.push('/')}>
                Back to Home
              </Button>
              <Button variant="primary" onClick={() => session && loadRoom(session)}>
                Retry
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isRoomOwner = Boolean(session && room.ownerId === session.userId);

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 text-neutral-100">
      <Navbar currentRoomCode={room.roomCode} currentRoomName={room.name} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ROOM HEADER */}
        <RoomHeader
          roomName={room.name}
          roomCode={room.roomCode}
          isRoomOwner={isRoomOwner}
          onLeaveRoom={handleLeaveRoom}
          onCloseRoom={handleCloseRoom}
        />

        {/* MAIN MULTI-COLUMN LISTENING ROOM LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center Column: Player Controls & Visualizer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Provider-aware Synchronization Engine & Media Player */}
            {playbackState.track &&
            (playbackState.provider === 'youtube' || playbackState.track.provider === 'youtube') ? (
              <YouTubePlayer
                playbackState={playbackState}
                onTrackEnded={handleTrackEnded}
                onDriftCorrected={handleDriftCorrected}
                onBufferingChange={setIsBuffering}
                onTimeUpdate={(curr, dur) => {
                  setCurrentTime(curr);
                  setDuration(dur);
                }}
                localVolume={localVolume}
                isMuted={isMuted}
              />
            ) : (
              <AudioPlayer
                playbackState={playbackState}
                onTrackEnded={handleTrackEnded}
                onDriftCorrected={handleDriftCorrected}
                onBufferingChange={setIsBuffering}
                onTimeUpdate={(curr, dur) => {
                  setCurrentTime(curr);
                  setDuration(dur);
                }}
                localVolume={localVolume}
                isMuted={isMuted}
              />
            )}
            <PlayerControls
              playbackState={playbackState}
              currentSeconds={currentTime}
              totalDuration={duration}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onSkipNext={handleSkipNext}
              onOpenSearch={() => setIsSearchOpen(true)}
              localVolume={localVolume}
              onVolumeChange={handleVolumeChange}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              isBuffering={isBuffering}
              driftStatus={driftStatus}
            />

            {/* Mobile / Tablet Quick Participants view */}
            <div className="block lg:hidden">
              <ParticipantList
                presenceMembers={presenceMembers}
                fallbackMembers={members}
                currentUserId={session?.userId || ''}
                isRoomOwner={isRoomOwner}
                onKickMember={handleKickMember}
              />
            </div>
          </div>

          {/* Right Column: Shared Queue & Connected Listeners (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <SharedQueue
              queue={queue}
              currentTrackId={playbackState.track?.id}
              currentUserId={session?.userId || ''}
              isRoomOwner={isRoomOwner}
              onPlayNow={handlePlayQueuedTrack}
              onRemoveItem={handleRemoveQueueItem}
              onOpenSearch={() => setIsSearchOpen(true)}
            />

            <div className="hidden lg:block">
              <ParticipantList
                presenceMembers={presenceMembers}
                fallbackMembers={members}
                currentUserId={session?.userId || ''}
                isRoomOwner={isRoomOwner}
                onKickMember={handleKickMember}
              />
            </div>
          </div>
        </div>
      </main>

      {/* SEARCH CATALOG MODAL */}
      <MusicSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTrack={handleSelectTrack}
        onAddToQueue={handleAddToQueue}
        currentTrackId={playbackState.track?.id}
      />

      <Footer />
    </div>
  );
}

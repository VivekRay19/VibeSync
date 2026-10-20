'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiquidGlassLayout } from '@/components/layout/liquid-glass-layout';
import { RoomHeader } from '@/components/room/room-header';
import { ParticipantList } from '@/components/room/participant-list';
import { SharedQueue } from '@/components/queue/shared-queue';
import { MusicSearchModal } from '@/components/search/music-search-modal';
import { Modal } from '@/components/ui/modal';
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
import { syncEngine } from '@/lib/sync/engine';
import { RoomInviteModal } from '@/components/room/room-invite-modal';
import { Loader2, AlertCircle, Headphones, Radio, Users } from 'lucide-react';

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

  // Local audio/video state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [driftStatus, setDriftStatus] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // UI state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestRevisionRef = useRef(1);

  // Modals for Create and Join from sidebar/topbar
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

  // Cross-tab broadcast channel
  const tabBroadcastRef = useRef<BroadcastChannel | null>(null);
  const lastProcessedCommandIdRef = useRef<string | null>(null);
  const isSseConnectedRef = useRef(false);

  // Initialize session and volume
  useEffect(() => {
    const savedVol = localStorage.getItem('vibesync_local_volume');
    if (savedVol) {
      setLocalVolume(parseFloat(savedVol));
    }

    const currentSession = getLocalGuestSession();
    if (currentSession) {
      setSession(currentSession);
      setCreateDisplayName(currentSession.displayName);
      setJoinDisplayName(currentSession.displayName);
    } else {
      setNeedsNamePrompt(true);
    }

    // Active NTP clock calibration
    syncEngine.syncServerClock();
  }, []);

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

      if (data.playbackState) {
        latestRevisionRef.current = data.playbackState.revision;
        const expected = syncEngine.calculateExpectedPosition(data.playbackState);
        setCurrentTime(expected);
        setDuration(data.playbackState.track?.durationSeconds || 240);
      }
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

  // Set up Server-Sent Events (SSE) stream & BroadcastChannel
  useEffect(() => {
    if (!room || !session) return;

    const channelName = `vibesync_room_${room.id}`;

    // 1. Browser BroadcastChannel for instant local multi-tab zero-latency sync
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

    eventSource.onopen = () => {
      isSseConnectedRef.current = true;
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, payload } = parsed;

        if (type === 'PLAYBACK_STATE' && payload?.state) {
          const incoming = payload.state as PlaybackState;
          const cmdId = payload.commandId;

          // Deduplicate our own command if already processed locally
          if (cmdId && cmdId === lastProcessedCommandIdRef.current) {
            return;
          }

          if (incoming.revision >= latestRevisionRef.current) {
            latestRevisionRef.current = incoming.revision;
            setPlaybackState(incoming);
          }
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
      isSseConnectedRef.current = false;
      console.warn('SSE connection interrupted, will auto-reconnect:', err);
    };

    // 3. Fast state synchronization poll (every 1200ms) to guarantee cross-instance propagation on Vercel
    const syncWithServer = async () => {
      if (!room) return;
      try {
        const res = await fetch(
          `/api/rooms/sync?roomId=${encodeURIComponent(room.id)}&sinceRevision=${latestRevisionRef.current}`
        );
        if (res.ok) {
          const syncData = await res.json();
          if (syncData.modified && syncData.playbackState) {
            const incoming = syncData.playbackState as PlaybackState;
            if (incoming.revision > latestRevisionRef.current) {
              latestRevisionRef.current = incoming.revision;
              setPlaybackState(incoming);
              if (syncData.queue) {
                setQueue(syncData.queue);
              }
            }
          }
        }
      } catch {
        // Keep trying silently
      }
    };

    const syncInterval = setInterval(syncWithServer, 1200);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (tabBroadcastRef.current) {
        tabBroadcastRef.current.close();
      }
      eventSource.close();
    };
  }, [room, session, roomCode, router]);

  // Execute playback command via API and broadcast
  const sendPlaybackCommand = async (
    command: 'PLAY' | 'PAUSE' | 'RESUME' | 'SEEK' | 'SELECT_TRACK' | 'SKIP_NEXT',
    positionSeconds = 0,
    track?: NormalizedTrack,
    queueItemId?: string | null
  ) => {
    if (!room || !playbackState || !session) return;

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    lastProcessedCommandIdRef.current = commandId;

    // Optimistic UI update
    if (command === 'PAUSE') {
      setPlaybackState((prev) => {
        if (!prev) return null;
        latestRevisionRef.current = prev.revision + 1;
        return {
          ...prev,
          playbackStatus: 'paused',
          basePositionSeconds: positionSeconds,
          revision: prev.revision + 1,
        };
      });
    } else if (command === 'PLAY' || command === 'RESUME') {
      setPlaybackState((prev) => {
        if (!prev) return null;
        latestRevisionRef.current = prev.revision + 1;
        return {
          ...prev,
          playbackStatus: 'playing',
          basePositionSeconds: positionSeconds,
          scheduledAt: Date.now() + 1000,
          updatedAtServer: new Date().toISOString(),
          revision: prev.revision + 1,
        };
      });
    } else if (command === 'SEEK') {
      setPlaybackState((prev) => {
        if (!prev) return null;
        latestRevisionRef.current = prev.revision + 1;
        return {
          ...prev,
          basePositionSeconds: positionSeconds,
          updatedAtServer: new Date().toISOString(),
          revision: prev.revision + 1,
        };
      });
    }

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
          commandId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Command failed');
      }

      if (data.state) {
        latestRevisionRef.current = data.state.revision;
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
  const handleTrackEnded = () => {
    if (isRepeat) {
      sendPlaybackCommand('SEEK', 0);
      sendPlaybackCommand('PLAY', 0);
    } else {
      sendPlaybackCommand('SKIP_NEXT', 0);
    }
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

  const handleMoveQueueItem = async (queueItemId: string, direction: 'UP' | 'DOWN') => {
    if (!room || !session) return;

    // Optimistic local update
    setQueue((prev) => {
      const idx = prev.findIndex((i) => i.id === queueItemId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const clone = [...prev];
      const temp = clone[idx];
      clone[idx] = clone[targetIdx];
      clone[targetIdx] = temp;
      return clone;
    });

    try {
      const res = await fetch('/api/rooms/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'MOVE',
          queueItemId,
          direction,
          userId: session.userId,
          displayName: session.displayName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.queue) {
        setQueue(data.queue);
        if (tabBroadcastRef.current) {
          tabBroadcastRef.current.postMessage({ type: 'QUEUE_UPDATE', payload: data.queue });
        }
      }
    } catch (err) {
      console.error('Move queue item error:', err);
    }
  };

  const handleShuffleQueue = async () => {
    if (!room || !session) return;
    setIsShuffle((p) => !p);

    // Optimistic local shuffle
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      const clone = [...prev];
      for (let i = clone.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = clone[i];
        clone[i] = clone[j];
        clone[j] = temp;
      }
      return clone;
    });

    try {
      const res = await fetch('/api/rooms/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'SHUFFLE',
          userId: session.userId,
          displayName: session.displayName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.queue) {
        setQueue(data.queue);
        if (tabBroadcastRef.current) {
          tabBroadcastRef.current.postMessage({ type: 'QUEUE_UPDATE', payload: data.queue });
        }
      }
    } catch (err) {
      console.error('Shuffle queue error:', err);
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

  // Create room form submission from modal
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
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

      setIsCreateOpen(false);
      router.push(`/room/${data.room.roomCode}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating room');
      setCreateLoading(false);
    }
  };

  // Join room form submission from modal
  const handleJoinRoomSubmit = async (e: React.FormEvent) => {
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

      setIsJoinOpen(false);
      router.push(`/room/${cleanCode}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Invalid room code');
      setJoinLoading(false);
    }
  };

  // 1. Name prompt modal for first-time direct invite link visitors
  if (needsNamePrompt) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07080E] text-white items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl glass-panel shadow-liquid-panel space-y-6 text-center border border-white/[0.1]">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300 shadow-glow-purple">
            <Headphones className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Join Listening Session</h2>
            <p className="text-xs text-neutral-400">
              You were invited to room <strong className="text-purple-300 font-mono">{roomCode}</strong>.
              Choose a display name so friends can see you.
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
      </div>
    );
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07080E] text-white items-center justify-center p-6 space-y-4 text-center">
        <Loader2 className="w-9 h-9 text-purple-400 animate-spin" />
        <p className="text-sm font-semibold text-neutral-300 tracking-wide">
          Synchronizing with Room {roomCode}...
        </p>
      </div>
    );
  }

  // 3. Error state
  if (errorMessage || !room || !playbackState) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07080E] text-white items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-3xl glass-panel text-center space-y-5 border border-white/[0.1]">
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
      </div>
    );
  }

  const isRoomOwner = Boolean(session && room.ownerId === session.userId);
  const isPlaying = playbackState.playbackStatus === 'playing';

  return (
    <LiquidGlassLayout
      session={session}
      room={room}
      playbackState={playbackState}
      queue={queue}
      presenceMembers={presenceMembers}
      currentSeconds={currentTime}
      totalDuration={duration}
      isPlaying={isPlaying}
      isBuffering={isBuffering}
      localVolume={localVolume}
      isMuted={isMuted}
      onPlay={handlePlay}
      onPause={handlePause}
      onSeek={handleSeek}
      onSkipNext={handleSkipNext}
      onSkipPrev={() => handleSeek(0)}
      onSelectTrack={handleSelectTrack}
      onAddToQueue={handleAddToQueue}
      onRemoveQueueItem={handleRemoveQueueItem}
      onMoveQueueItem={handleMoveQueueItem}
      onShuffleQueue={handleShuffleQueue}
      isShuffle={isShuffle}
      onToggleShuffle={handleShuffleQueue}
      isRepeat={isRepeat}
      onToggleRepeat={() => setIsRepeat((p) => !p)}
      onVolumeChange={handleVolumeChange}
      onToggleMute={handleToggleMute}
      onOpenCreateRoom={() => setIsCreateOpen(true)}
      onOpenJoinRoom={() => setIsJoinOpen(true)}
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenInvite={() => setIsInviteOpen(true)}
      onLeaveRoom={handleLeaveRoom}
      onTrackEnded={handleTrackEnded}
      onDriftCorrected={handleDriftCorrected}
      onBufferingChange={setIsBuffering}
      onTimeUpdate={(curr, dur) => {
        setCurrentTime(curr);
        if (dur > 0) setDuration(dur);
      }}
    >
      <div className="space-y-6">
        {/* ROOM HEADER */}
        <RoomHeader
          roomName={room.name}
          roomCode={room.roomCode}
          isRoomOwner={isRoomOwner}
          onLeaveRoom={handleLeaveRoom}
          onCloseRoom={handleCloseRoom}
          onOpenInvite={() => setIsInviteOpen(true)}
        />

        {/* MAIN ROOM INTERACTIVE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visualizer / Shared Player Focus (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Embedded Player Visual Frame */}
            <div className="p-6 rounded-3xl glass-panel border border-white/[0.08] shadow-liquid-panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Synchronized Player
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {playbackState.track ? playbackState.track.title : 'No Track Selected'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {playbackState.track ? playbackState.track.artistName : 'Search catalog to play'}
                  </p>
                </div>

                {driftStatus && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                    {driftStatus}
                  </span>
                )}
              </div>

              {/* Cover Artwork / Visualizer Hero */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-surface-950 border border-white/[0.08] flex items-center justify-center shadow-inner">
                {playbackState.track?.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={playbackState.track.artworkUrl}
                    alt={playbackState.track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-600 gap-2">
                    <Radio className="w-12 h-12 text-purple-400/60" />
                    <span className="text-xs text-neutral-500 font-mono">VibeSync Room</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 text-xs text-neutral-300 font-medium">
                  Catalog: <span className="text-purple-300 font-bold uppercase">{playbackState.provider}</span>
                </div>
              </div>
            </div>

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
              onMoveItem={handleMoveQueueItem}
              onShuffleQueue={handleShuffleQueue}
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
      </div>

      {/* SEARCH CATALOG MODAL */}
      <MusicSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTrack={handleSelectTrack}
        onAddToQueue={handleAddToQueue}
        currentTrackId={playbackState.track?.id}
      />

      {/* CREATE ROOM MODAL */}
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
        <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
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

      {/* JOIN ROOM MODAL */}
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
        <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
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

      {/* ROOM INVITATION QR MODAL */}
      <RoomInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomName={room.name}
        roomCode={room.roomCode}
      />
    </LiquidGlassLayout>
  );
}

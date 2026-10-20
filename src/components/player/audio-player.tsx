'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlaybackState } from '@/lib/types/music';
import { syncEngine } from '@/lib/sync/engine';
import { Button } from '../ui/button';
import { Play, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  playbackState: PlaybackState;
  onTrackEnded: () => void;
  onDriftCorrected?: (driftSeconds: number) => void;
  onBufferingChange?: (isBuffering: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  localVolume: number;
  isMuted: boolean;
}

export function AudioPlayer({
  playbackState,
  onTrackEnded,
  onDriftCorrected,
  onBufferingChange,
  onTimeUpdate,
  localVolume,
  isMuted,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string | null>(
    playbackState.track?.streamUrl || null
  );

  const prevTrackIdRef = useRef<string | null>(null);
  const isAdvancingRef = useRef(false);

  // Calibrate server clock offset whenever playbackState timestamp updates
  useEffect(() => {
    if (playbackState.updatedAtServer) {
      syncEngine.calibrateClock(playbackState.updatedAtServer);
    }
  }, [playbackState.updatedAtServer]);

  // Resolve stream source if missing or on track change
  useEffect(() => {
    const track = playbackState.track;
    if (!track || track.playbackType === 'video_embed' || track.provider === 'youtube' || track.provider === 'verome') return;

    const trackKey = `${track.provider}:${track.providerTrackId}`;
    if (prevTrackIdRef.current !== trackKey) {
      prevTrackIdRef.current = trackKey;
      isAdvancingRef.current = false;
      setStreamError(null);

      // If streamUrl is already provided, use it
      if (track.streamUrl) {
        setResolvedStreamUrl(track.streamUrl);
      } else {
        // Fetch stream url from server route
        fetch(`/api/music/stream?provider=${track.provider}&trackId=${track.providerTrackId}`)
          .then((res) => {
            if (!res.ok) throw new Error('Stream URL unavailable');
            return res.json();
          })
          .then((data) => {
            if (data.streamUrl) setResolvedStreamUrl(data.streamUrl);
          })
          .catch(() => {
            setStreamError('Could not load audio stream from music catalog');
          });
      }
    }
  }, [playbackState.track]);

  // Calibrate server clock offset from server time endpoint and state updates
  useEffect(() => {
    syncEngine.syncServerClock();
  }, []);

  useEffect(() => {
    if (playbackState.updatedAtServer) {
      syncEngine.calibrateClock(playbackState.updatedAtServer);
    }
  }, [playbackState.updatedAtServer]);

  // Handle local volume & mute changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, localVolume));
    audio.muted = isMuted;
  }, [localVolume, isMuted]);

  // Main playback synchronization logic
  const syncPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedStreamUrl) return;

    if (playbackState.playbackStatus === 'playing') {
      // Evaluate drift with sub-500ms threshold and micro-drift adjustment
      const { needsSeek, targetPosition, driftSeconds, suggestedRate } = syncEngine.shouldCorrectDrift(
        audio.currentTime,
        playbackState,
        isBuffering,
        'audius'
      );

      if (needsSeek && !audio.seeking) {
        syncEngine.recordSeek();
        audio.currentTime = targetPosition;
        onDriftCorrected?.(driftSeconds);
      } else if (suggestedRate !== 1.0 && Math.abs(audio.playbackRate - suggestedRate) > 0.01) {
        audio.playbackRate = suggestedRate;
      } else if (audio.playbackRate !== 1.0 && driftSeconds <= 0.15) {
        audio.playbackRate = 1.0;
      }

      if (audio.paused && !autoplayBlocked) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
            }
          });
        }
      }
    } else if (playbackState.playbackStatus === 'paused') {
      if (!audio.paused) {
        audio.pause();
      }
      if (audio.playbackRate !== 1.0) {
        audio.playbackRate = 1.0;
      }
      // Ensure paused position precisely matches authoritative position
      if (Math.abs(audio.currentTime - playbackState.basePositionSeconds) > 0.3) {
        audio.currentTime = playbackState.basePositionSeconds;
      }
    }
  }, [playbackState, resolvedStreamUrl, isBuffering, autoplayBlocked, onDriftCorrected]);

  // IMMEDIATE execution on authoritative room state update (zero delay on play/pause)
  useEffect(() => {
    syncPlayback();
  }, [playbackState.playbackStatus, playbackState.revision, playbackState.basePositionSeconds, syncPlayback]);

  // Periodic drift check interval (every 600ms)
  useEffect(() => {
    const interval = setInterval(() => {
      syncPlayback();
    }, 600);
    return () => clearInterval(interval);
  }, [syncPlayback]);

  // Re-synchronize when browser tab regains focus or visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncEngine.syncServerClock().then(() => syncPlayback());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncPlayback]);

  // Audio event listeners
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      onTimeUpdate?.(audio.currentTime, audio.duration || playbackState.track?.durationSeconds || 0);
    }
  };

  const handleWaiting = () => {
    setIsBuffering(true);
    onBufferingChange?.(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    onBufferingChange?.(false);
    setAutoplayBlocked(false);
  };

  const handleEnded = () => {
    if (!isAdvancingRef.current) {
      isAdvancingRef.current = true;
      onTrackEnded();
    }
  };

  const handleUserGesturePlay = () => {
    const audio = audioRef.current;
    if (audio) {
      const targetPos = syncEngine.calculateExpectedPosition(playbackState);
      audio.currentTime = targetPos;
      audio
        .play()
        .then(() => {
          setAutoplayBlocked(false);
        })
        .catch(() => {});
    }
  };

  return (
    <div className="w-full">
      {/* Hidden native HTML5 Audio element */}
      <audio
        ref={audioRef}
        src={resolvedStreamUrl || undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={() => setIsBuffering(false)}
        onEnded={handleEnded}
        onError={() => {
          if (resolvedStreamUrl) {
            setStreamError('Audio stream connection interrupted or unavailable');
          }
        }}
      />

      {/* Autoplay blocked banner */}
      {autoplayBlocked && (
        <div className="mb-4 p-4 rounded-xl bg-purple-950/80 border border-purple-500/60 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-purple animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Audio Autoplay Paused</p>
              <p className="text-xs text-purple-200">
                Browsers require a touch or click to start sound. Tap to listen and synchronize with your room.
              </p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={handleUserGesturePlay} className="shrink-0">
            Tap to Listen
          </Button>
        </div>
      )}

      {/* Stream loading error notice */}
      {streamError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{streamError}</span>
          </div>
          <button
            onClick={() => {
              setStreamError(null);
              if (playbackState.track) {
                setResolvedStreamUrl(playbackState.track.streamUrl || null);
              }
            }}
            className="hover:underline text-[11px] font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlaybackState } from '@/lib/types/music';
import { syncEngine } from '@/lib/sync/engine';
import { Button } from '../ui/button';
import { Play, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface YTPlayerInstance {
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  playbackState: PlaybackState;
  onTrackEnded: () => void;
  onDriftCorrected?: (driftSeconds: number) => void;
  onBufferingChange?: (isBuffering: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  localVolume: number;
  isMuted: boolean;
}

export function YouTubePlayer({
  playbackState,
  onTrackEnded,
  onDriftCorrected,
  onBufferingChange,
  onTimeUpdate,
  localVolume,
  isMuted,
}: YouTubePlayerProps) {
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const prevVideoIdRef = useRef<string | null>(null);
  const isAdvancingRef = useRef(false);

  const propsRef = useRef({
    playbackState,
    onTrackEnded,
    onBufferingChange,
    localVolume,
    isMuted,
  });
  propsRef.current = {
    playbackState,
    onTrackEnded,
    onBufferingChange,
    localVolume,
    isMuted,
  };

  const videoId = playbackState.providerTrackId;

  // 1. Dynamically load the YouTube IFrame Player API script if not loaded
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT || !window.YT.Player) {
      const existingScript = document.getElementById('youtube-iframe-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, []);

  // 2. Initialize or update YouTube Player instance
  useEffect(() => {
    if (!videoId) return;

    let isSubscribed = true;

    const initPlayer = () => {
      if (!isSubscribed) return;
      if (!window.YT || !window.YT.Player) {
        // Wait for API ready event
        window.onYouTubeIframeAPIReady = () => {
          if (isSubscribed) initPlayer();
        };
        return;
      }

      // If player already initialized, load the new video
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        if (prevVideoIdRef.current !== videoId) {
          prevVideoIdRef.current = videoId;
          isAdvancingRef.current = false;
          setPlayerError(null);

          const currentState = propsRef.current.playbackState;
          const expectedStart = syncEngine.calculateExpectedPosition(currentState);
          playerRef.current.loadVideoById({
            videoId,
            startSeconds: expectedStart > 0 ? expectedStart : 0,
          });

          if (currentState.playbackStatus === 'paused') {
            playerRef.current.pauseVideo();
          }
        }
        return;
      }

      // First-time player creation
      try {
        const container = document.getElementById(containerId.current);
        if (!container) return;

        const currentState = propsRef.current.playbackState;
        playerRef.current = new window.YT.Player(containerId.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: currentState.playbackStatus === 'playing' ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event: { target: YTPlayerInstance }) => {
              if (!isSubscribed) return;
              setIsPlayerReady(true);
              prevVideoIdRef.current = videoId;

              const { localVolume: vol, isMuted: muted, playbackState: state } = propsRef.current;
              // Apply initial volume and mute
              event.target.setVolume(Math.round(vol * 100));
              if (muted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }

              // Initial position seek & playback state
              const target = syncEngine.calculateExpectedPosition(state);
              if (target > 0) {
                event.target.seekTo(target, true);
              }

              if (state.playbackStatus === 'playing') {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            },
            onStateChange: (event: { data: number }) => {
              if (!isSubscribed) return;

              // YT.PlayerState: PLAYING=1, PAUSED=2, BUFFERING=3, ENDED=0
              if (event.data === 1) {
                setIsBuffering(false);
                propsRef.current.onBufferingChange?.(false);
                setAutoplayBlocked(false);
              } else if (event.data === 2) {
                setIsBuffering(false);
                propsRef.current.onBufferingChange?.(false);
              } else if (event.data === 3) {
                setIsBuffering(true);
                propsRef.current.onBufferingChange?.(true);
              } else if (event.data === 0) {
                if (!isAdvancingRef.current) {
                  isAdvancingRef.current = true;
                  propsRef.current.onTrackEnded();
                }
              }
            },
            onError: (event: { data: number }) => {
              if (!isSubscribed) return;
              // Error codes: 101, 150 = cannot be embedded; 100 = deleted/private; 2 = invalid param
              if (event.data === 101 || event.data === 150) {
                setPlayerError('The video owner has restricted this track from being played in embedded players.');
              } else if (event.data === 100) {
                setPlayerError('This video is private or has been removed from YouTube.');
              } else {
                setPlayerError('YouTube playback encountered an error. Please try another track.');
              }
            },
          },
        });
      } catch (err) {
        console.error('Failed to initialize YouTube IFrame Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 150);
      return () => {
        clearInterval(checkInterval);
        isSubscribed = false;
      };
    }

    return () => {
      isSubscribed = false;
    };
  }, [videoId]); // Re-runs when videoId changes

  // 3. Handle local volume and mute changes
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isPlayerReady || typeof player.setVolume !== 'function') return;

    player.setVolume(Math.round(localVolume * 100));
    if (isMuted) {
      player.mute();
    } else {
      player.unMute();
    }
  }, [localVolume, isMuted, isPlayerReady]);

  // 4. Synchronize commands from room authoritative state
  const syncPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isPlayerReady || typeof player.getPlayerState !== 'function') return;

    try {
      const currentState = player.getPlayerState();
      const currentPos = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
      const duration = typeof player.getDuration === 'function' ? player.getDuration() : 0;

      onTimeUpdate?.(currentPos, duration);

      if (playbackState.playbackStatus === 'playing') {
        // Calculate drift against authoritative room state
        const { needsSeek, targetPosition, driftSeconds } = syncEngine.shouldCorrectDrift(
          currentPos,
          playbackState,
          isBuffering
        );

        // Tolerant threshold for YouTube video buffering (2.5s)
        if (needsSeek && Math.abs(driftSeconds) > 2.5) {
          syncEngine.recordSeek();
          player.seekTo(targetPosition, true);
          onDriftCorrected?.(driftSeconds);
        }

        // If player is paused or unstarted but room says playing, trigger playVideo()
        if (currentState === 2 || currentState === -1 || currentState === 5) {
          if (!autoplayBlocked) {
            player.playVideo();
          }
        }
      } else if (playbackState.playbackStatus === 'paused') {
        if (currentState === 1) {
          player.pauseVideo();
        }
        if (Math.abs(currentPos - playbackState.basePositionSeconds) > 1.5) {
          player.seekTo(playbackState.basePositionSeconds, true);
        }
      }
    } catch {
      // In case player is transitioning
    }
  }, [playbackState, isPlayerReady, isBuffering, autoplayBlocked, onDriftCorrected, onTimeUpdate]);

  // Periodic drift synchronization loop (every 1000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      syncPlayback();
    }, 1000);
    return () => clearInterval(interval);
  }, [syncPlayback]);

  // Handle user gesture play for autoplay recovery
  const handleUserGesturePlay = () => {
    const player = playerRef.current;
    if (player && typeof player.playVideo === 'function') {
      const targetPos = syncEngine.calculateExpectedPosition(playbackState);
      if (targetPos > 0) {
        player.seekTo(targetPos, true);
      }
      player.playVideo();
      setAutoplayBlocked(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Autoplay blocked banner */}
      {autoplayBlocked && (
        <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-500/60 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-purple animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Video Autoplay Paused</p>
              <p className="text-xs text-purple-200">
                Browsers require a touch or click to start video playback. Tap to synchronize with your room.
              </p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={handleUserGesturePlay} className="shrink-0">
            Tap to Watch & Listen
          </Button>
        </div>
      )}

      {/* Embedded YouTube Video Player Container */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-surface-800/90 shadow-2xl bg-black">
        <div id={containerId.current} className="w-full h-full" />

        {/* Video Loading Overlay if buffering */}
        {isBuffering && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-surface-950/80 border border-surface-700/60 text-[11px] text-cyan-300 flex items-center gap-1.5 backdrop-blur-md">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Buffering video...</span>
          </div>
        )}
      </div>

      {/* Playback restriction error alert */}
      {playerError && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{playerError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {playbackState.track?.providerPageUrl && (
              <a
                href={playbackState.track.providerPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-purple-300 hover:underline text-[11px] font-medium"
              >
                Watch on YouTube <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={onTrackEnded}
              className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-white text-[11px] font-medium"
            >
              Skip to Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

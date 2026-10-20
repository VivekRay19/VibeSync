'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { NormalizedTrack, MusicProviderId } from '@/lib/types/music';
import { formatDuration } from '@/lib/utils';
import { Search, Play, ExternalLink, AlertCircle, Music, Loader2, RefreshCw, ListPlus, Check } from 'lucide-react';

interface MusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: NormalizedTrack) => void;
  onAddToQueue: (track: NormalizedTrack) => void;
  currentTrackId?: string;
}

export function MusicSearchModal({
  isOpen,
  onClose,
  onSelectTrack,
  onAddToQueue,
  currentTrackId,
}: MusicSearchModalProps) {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<MusicProviderId | 'all'>('verome');
  const [results, setResults] = useState<NormalizedTrack[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize provider preference from localStorage or default to 'verome'
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vibesync_search_provider') as MusicProviderId | 'all';
      if (saved && ['verome', 'youtube', 'audius', 'all'].includes(saved)) {
        setProvider(saved);
      } else {
        setProvider('verome');
      }
    }
  }, [isOpen]);

  // Autocomplete suggestions
  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    suggestionTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/suggestions?query=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions.slice(0, 5));
          }
        }
      } catch {
        // Silently skip suggestions failure
      }
    }, 250);

    return () => {
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    };
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setResults([]);
      setWarnings([]);
      setHasSearched(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      executeSearch(query, provider);
    }, 380);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, provider, isOpen]);

  const executeSearch = async (searchTerm: string, targetProvider: string) => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/music/search?query=${encodeURIComponent(searchTerm.trim())}&provider=${targetProvider}&limit=20`
      );

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const data = await res.json();
      setResults(data.tracks || []);
      setWarnings(data.warnings || []);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTrack = (track: NormalizedTrack) => {
    onSelectTrack(track);
    onClose();
  };

  const handleQueueClick = (track: NormalizedTrack) => {
    if (addedTrackIds.has(track.id)) return;
    setAddedTrackIds((prev) => new Set(prev).add(track.id));
    onAddToQueue(track);

    setTimeout(() => {
      setAddedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-400" />
          <span>Find Music for Room</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by song title, artist, genre (e.g. Synthwave, electronic)..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-950 border border-surface-700/80 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500 transition-all"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 text-purple-400 animate-spin" />
          )}
        </div>

        {/* Suggestion Chips */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-neutral-500 mr-1">Suggestions:</span>
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sug);
                  executeSearch(sug, provider);
                }}
                className="px-2.5 py-0.5 rounded-full text-[11px] bg-surface-900 hover:bg-purple-950/60 text-neutral-300 hover:text-purple-300 border border-surface-700/70 hover:border-purple-800/50 transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Provider tabs */}
        <div className="flex items-center gap-2 pb-1 border-b border-surface-800 text-xs overflow-x-auto">
          <span className="text-neutral-400 mr-1 shrink-0">Catalog:</span>
          {([
            { id: 'verome', label: 'YouTube Music · Verome' },
            { id: 'youtube', label: 'YouTube · Verome' },
            { id: 'audius', label: 'Audius' },
            { id: 'all', label: 'All Sources' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setProvider(opt.id);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('vibesync_search_provider', opt.id);
                }
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                provider === opt.id
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Catalog notices or provider warnings */}
        {warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-surface-950/70 border border-amber-900/40 text-amber-300/90 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {warnings.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeSearch(query, provider)}
              className="text-xs shrink-0"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Results list */}
        <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
          {results.map((track) => {
            const isCurrent = currentTrackId === track.id || currentTrackId === track.providerTrackId;
            const isAdded = addedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all gap-2.5 sm:gap-3.5 ${
                  isCurrent
                    ? 'bg-purple-950/30 border-purple-500/50 shadow-glow-purple'
                    : 'bg-surface-850 hover:bg-surface-800/90 border-surface-750/70 hover:border-surface-650'
                }`}
              >
                {/* 1. Track Artwork with Hover Play Trigger */}
                <div
                  onClick={() => handleSelectTrack(track)}
                  className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-surface-900 border border-surface-750 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform"
                  title="Click to play now"
                >
                  {track.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Music className="w-5 h-5 text-neutral-600" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 fill-white text-white" />
                  </div>
                </div>

                {/* 2. Track Title, Artist & Unobtrusive Compact Metadata */}
                <div className="min-w-0 flex-1 text-left">
                  <h4
                    onClick={() => handleSelectTrack(track)}
                    className="text-xs sm:text-sm font-semibold text-white hover:text-purple-300 transition-colors line-clamp-2 leading-snug cursor-pointer break-words"
                    title={track.title}
                  >
                    {track.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5 font-medium">
                    {track.artistName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-neutral-400 mt-1">
                    {track.durationSeconds > 0 && (
                      <span>{formatDuration(track.durationSeconds)}</span>
                    )}
                    {track.durationSeconds > 0 && <span>•</span>}
                    <a
                      href={track.providerPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-purple-300 inline-flex items-center gap-0.5 text-neutral-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>
                        {track.provider === 'verome'
                          ? 'YouTube Music'
                          : track.provider === 'youtube'
                          ? 'YouTube'
                          : 'Audius'}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                    {!track.isPlayable && (
                      <span className="text-rose-400 font-semibold ml-1">• Unavailable</span>
                    )}
                  </div>
                </div>

                {/* 3. Explicit "Add to Queue" and "Play Now" Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQueueClick(track)}
                    disabled={!track.isPlayable || isAdded}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 hover:text-white border border-purple-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                    title={isAdded ? 'Added to queue' : 'Add to shared room queue'}
                    aria-label="Add to Queue"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-3.5 h-3.5 text-purple-300" />
                        <span className="hidden xs:inline sm:inline">Add to Queue</span>
                        <span className="xs:hidden sm:hidden">Queue</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTrack(track)}
                    disabled={!track.isPlayable}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-xs border border-white/[0.08] transition-all flex items-center gap-1 shrink-0"
                    title="Play now for everyone"
                    aria-label="Play track immediately"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden md:inline">Play</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty search result notice with provider fallback */}
          {hasSearched && results.length === 0 && !isLoading && !error && (
            <div className="p-8 text-center space-y-3 bg-surface-950/40 rounded-2xl border border-surface-800">
              <Music className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-medium text-neutral-300">
                No playable tracks found for &ldquo;{query}&rdquo;
              </p>
              <div className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed space-y-2">
                {provider === 'verome' ? (
                  <p>
                    YouTube Music (Verome) returned no tracks or the service is offline. Try switching to the{' '}
                    <button
                      type="button"
                      onClick={() => setProvider('youtube')}
                      className="text-purple-400 underline font-semibold hover:text-purple-300"
                    >
                      YouTube
                    </button>{' '}
                    or{' '}
                    <button
                      type="button"
                      onClick={() => setProvider('audius')}
                      className="text-purple-400 underline font-semibold hover:text-purple-300"
                    >
                      Audius
                    </button>{' '}
                    catalogs.
                  </p>
                ) : provider === 'audius' ? (
                  <p>
                    Audius did not return tracks for this search. Try switching to{' '}
                    <button
                      type="button"
                      onClick={() => setProvider('verome')}
                      className="text-cyan-400 underline font-semibold hover:text-cyan-300"
                    >
                      YouTube Music
                    </button>{' '}
                    or{' '}
                    <button
                      type="button"
                      onClick={() => setProvider('youtube')}
                      className="text-purple-400 underline font-semibold hover:text-purple-300"
                    >
                      YouTube
                    </button>{' '}
                    to find official releases and music videos.
                  </p>
                ) : provider === 'youtube' ? (
                  <p>
                    YouTube did not return embeddable videos for this search. Try searching for another track or explore songs on{' '}
                    <button
                      type="button"
                      onClick={() => setProvider('verome')}
                      className="text-cyan-400 underline font-semibold hover:text-cyan-300"
                    >
                      YouTube Music
                    </button>{' '}
                    or{' '}
                    <button
                      type="button"
                      onClick={() => setProvider('audius')}
                      className="text-purple-400 underline font-semibold hover:text-purple-300"
                    >
                      Audius
                    </button>.
                  </p>
                ) : (
                  <p>
                    Try searching by full song title and artist (e.g. &ldquo;Ghost Justin Bieber&rdquo;), or explore indie and electronic genres.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Initial prompt */}
          {!hasSearched && !isLoading && (
            <div className="p-8 text-center text-neutral-400 text-xs space-y-1">
              <p>Type a song title, artist, or genre to explore songs available in free catalogs.</p>
              <p className="text-neutral-400">Popular queries: &ldquo;lo-fi&rdquo;, &ldquo;synthwave&rdquo;, &ldquo;chillstep&rdquo;, &ldquo;electronic&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

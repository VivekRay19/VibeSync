'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { ProviderBadge } from '../ui/badge';
import { NormalizedTrack, MusicProviderId } from '@/lib/types/music';
import { formatDuration } from '@/lib/utils';
import { Search, Play, Plus, ExternalLink, AlertCircle, Music, Loader2, RefreshCw } from 'lucide-react';

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
  const [provider, setProvider] = useState<MusicProviderId | 'all'>('all');
  const [results, setResults] = useState<NormalizedTrack[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

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

  const handleAddToQueue = (track: NormalizedTrack) => {
    onAddToQueue(track);
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
          {(['all', 'verome', 'audius', 'youtube'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                provider === p
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-800'
              }`}
            >
              {p === 'all'
                ? 'All Providers'
                : p === 'verome'
                  ? 'YouTube Music'
                  : p === 'audius'
                    ? 'Audius'
                    : 'YouTube'}
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
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {results.map((track) => {
            const isCurrent = currentTrackId === track.id || currentTrackId === track.providerTrackId;
            return (
              <div
                key={track.id}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-purple-950/30 border-purple-500/50'
                    : 'bg-surface-850 hover:bg-surface-800/90 border-surface-750/70 hover:border-surface-650'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                  {/* Artwork */}
                  <div className="relative w-12 h-12 rounded-lg bg-surface-900 border border-surface-750 overflow-hidden shrink-0 flex items-center justify-center">
                    {track.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback on broken image link
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Music className="w-5 h-5 text-neutral-600" />
                    )}
                  </div>

                  {/* Track Details */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                      <ProviderBadge provider={track.provider} />
                      {!track.isPlayable && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/40">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artistName}</p>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                      <span>
                        {track.durationSeconds > 0
                          ? formatDuration(track.durationSeconds)
                          : track.playbackType === 'video_embed' ||
                            track.provider === 'youtube' ||
                            track.provider === 'verome'
                          ? 'Official Video'
                          : 'Audio Stream'}
                      </span>
                      <a
                        href={track.providerPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-neutral-300 inline-flex items-center gap-0.5 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddToQueue(track)}
                    disabled={!track.isPlayable}
                    title={track.isPlayable ? 'Add to shared room queue' : 'Track is unavailable for playback'}
                    className="text-neutral-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-1 text-purple-400" />
                    <span className="hidden sm:inline text-xs">Queue</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleSelectTrack(track)}
                    disabled={!track.isPlayable}
                    title={track.isPlayable ? 'Play track immediately for all members' : 'Track is unavailable for playback'}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                    <span className="text-xs">Play Now</span>
                  </Button>
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

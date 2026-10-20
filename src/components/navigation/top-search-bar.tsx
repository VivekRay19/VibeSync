'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  Bell,
  User,
  Check,
  Loader2,
  X,
  Radio,
  LogOut,
} from 'lucide-react';
import { NormalizedTrack } from '@/lib/types/music';
import { GuestSession } from '@/lib/auth/client';

export type SearchProviderOption = 'verome' | 'youtube' | 'audius' | 'all';

interface TopSearchBarProps {
  session: GuestSession | null;
  onSearchChange?: (query: string, provider: SearchProviderOption) => void;
  onSelectTrack?: (track: NormalizedTrack) => void;
  onOpenCreateRoom?: () => void;
  onOpenJoinRoom?: () => void;
  onLogout?: () => void;
}

const PROVIDER_OPTIONS: { id: SearchProviderOption; label: string; badge: string }[] = [
  { id: 'verome', label: 'YouTube Music · Verome', badge: 'Default' },
  { id: 'youtube', label: 'YouTube · Verome', badge: 'Video' },
  { id: 'audius', label: 'Audius', badge: 'Audio' },
  { id: 'all', label: 'All Sources', badge: 'Combined' },
];

export function TopSearchBar({
  session,
  onSearchChange,
  onSelectTrack,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onLogout,
}: TopSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<SearchProviderOption>('verome');
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<NormalizedTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdownResults, setShowDropdownResults] = useState(false);

  const providerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize provider preference from localStorage (defaults to 'verome')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('vibesync_search_provider') as SearchProviderOption;
      if (savedProvider && ['verome', 'youtube', 'audius', 'all'].includes(savedProvider)) {
        setProvider(savedProvider);
      } else {
        setProvider('verome');
        localStorage.setItem('vibesync_search_provider', 'verome');
      }
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setIsProviderOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdownResults(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleProviderSelect = (selected: SearchProviderOption) => {
    setProvider(selected);
    setIsProviderOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibesync_search_provider', selected);
    }
    if (query.trim()) {
      executeSearch(query.trim(), selected);
    }
  };

  const executeSearch = async (searchTerm: string, activeProvider: SearchProviderOption) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowDropdownResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/music/search?query=${encodeURIComponent(searchTerm)}&provider=${activeProvider}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.tracks || []);
        setShowDropdownResults(true);
      }
    } catch {
      // Gracefully handle network issues
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    onSearchChange?.(val, provider);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdownResults(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      executeSearch(val.trim(), provider);
    }, 350);
  };

  const selectedProviderMeta =
    PROVIDER_OPTIONS.find((p) => p.id === provider) || PROVIDER_OPTIONS[0];

  return (
    <header className="w-full flex items-center justify-between gap-4 py-2 px-1 select-none z-30 relative">
      {/* Back and Forward navigation buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full glass-pill flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          title="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => router.forward()}
          className="w-9 h-9 rounded-full glass-pill flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          title="Go forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Search Input & Provider Selector */}
      <div ref={searchContainerRef} className="flex-1 max-w-2xl relative">
        <div className="relative flex items-center w-full rounded-full glass-card border border-white/[0.08] px-4 py-2 text-sm focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
          <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdownResults(true);
            }}
            placeholder="Search for songs, artists, albums or playlists..."
            className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />

          {isSearching && (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin mr-2 shrink-0" />
          )}

          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSearchResults([]);
                setShowDropdownResults(false);
              }}
              className="text-neutral-400 hover:text-white p-1 mr-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Provider Selector Dropdown Trigger */}
          <div ref={providerRef} className="relative shrink-0 border-l border-white/[0.08] pl-3 ml-1">
            <button
              type="button"
              onClick={() => setIsProviderOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-neutral-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] transition-all"
            >
              <span className="truncate max-w-[150px]">{selectedProviderMeta.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Provider Options Menu */}
            {isProviderOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl glass-panel p-1.5 shadow-liquid-panel z-50 animate-in fade-in zoom-in-95 border border-white/[0.12]">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-white/[0.06] mb-1">
                  Music Search Provider
                </div>
                {PROVIDER_OPTIONS.map((opt) => {
                  const isSelected = provider === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleProviderSelect(opt.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-purple-600/25 text-purple-200 font-semibold border border-purple-500/30'
                          : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Search Results Floating Dropdown */}
        {showDropdownResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl glass-panel p-2 shadow-liquid-panel z-50 max-h-96 overflow-y-auto space-y-1 border border-white/[0.12] animate-in fade-in">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Results via {selectedProviderMeta.label}</span>
              <span className="text-[10px] text-neutral-500">{searchResults.length} tracks</span>
            </div>
            {searchResults.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  onSelectTrack?.(track);
                  setShowDropdownResults(false);
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.08] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-950 shrink-0 border border-white/[0.08]">
                  {track.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-950/60">
                      <Radio className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {track.artistName}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.04]">
                  {track.provider === 'verome'
                    ? 'YT Music'
                    : track.provider === 'youtube'
                      ? 'YouTube'
                      : 'Audius'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Notification Bell and User Profile Avatar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-neutral-400 hover:text-white transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-purple-500 ring-2 ring-surface-950" />
        </button>

        {/* User profile avatar dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full glass-pill hover:bg-white/[0.1] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm uppercase">
              {session?.displayName ? session.displayName.charAt(0) : 'U'}
            </div>
            <span className="text-xs font-medium text-neutral-200 max-w-[90px] truncate">
              {session?.displayName || 'Guest'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl glass-panel p-1.5 shadow-liquid-panel z-50 animate-in fade-in zoom-in-95 border border-white/[0.12]">
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-xs font-bold text-white truncate">
                  {session?.displayName || 'Guest User'}
                </p>
                <p className="text-[10px] text-neutral-400">Collaborative Listener</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onOpenCreateRoom?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                <span>Create a Room</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onOpenJoinRoom?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Join a Room</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 transition-colors text-left border-t border-white/[0.06] mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch Identity</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

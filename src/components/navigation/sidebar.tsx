'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Users,
  Plus,
  Heart,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onOpenSearch?: () => void;
  onSelectPlaylist?: (playlistName: string) => void;
  activePlaylist?: string | null;
}

const PLAYLISTS = [
  {
    id: 'liked-songs',
    name: 'Liked Songs',
    count: '214 songs',
    isLiked: true,
  },
  {
    id: 'chill-vibes',
    name: 'Chill Vibes',
    count: '52 songs',
    artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=120&h=120&fit=crop&crop=faces&q=80',
  },
  {
    id: 'workout',
    name: 'Workout',
    count: '41 songs',
    artworkUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=120&h=120&fit=crop&crop=faces&q=80',
  },
  {
    id: 'late-night',
    name: 'Late Night',
    count: '69 songs',
    artworkUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=120&h=120&fit=crop&crop=faces&q=80',
  },
  {
    id: 'road-trip',
    name: 'Road Trip',
    count: '37 songs',
    artworkUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=120&h=120&fit=crop&crop=faces&q=80',
  },
  {
    id: 'focus',
    name: 'Focus',
    count: '28 songs',
    artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120&h=120&fit=crop&crop=faces&q=80',
  },
];

export function Sidebar({
  onOpenCreateRoom,
  onOpenJoinRoom,
  onOpenSearch,
  onSelectPlaylist,
  activePlaylist,
}: SidebarProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full glass-panel rounded-3xl p-4 select-none overflow-hidden">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-3 mb-4">
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-purple flex items-center justify-center">
          <div className="w-full h-full rounded-xl bg-surface-950 flex items-center justify-center">
            <Radio className="w-4 h-4 text-purple-300 animate-pulse" />
          </div>
        </div>
        <span className="text-lg font-extrabold tracking-tight text-white flex items-center">
          Vibe<span className="text-gradient-purple">Sync</span>
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-6">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
            isHome
              ? 'bg-white/[0.08] text-white shadow-liquid-glass border border-white/[0.08]'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Home className={`w-4 h-4 ${isHome ? 'text-purple-400' : ''}`} />
          <span>Home</span>
        </Link>

        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all text-left"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectPlaylist?.('Your Library')}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all text-left"
        >
          <Library className="w-4 h-4" />
          <span>Your Library</span>
        </button>
      </nav>

      {/* Collaborate Section */}
      <div className="mb-6 space-y-1">
        <p className="px-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Collaborate
        </p>

        <button
          type="button"
          onClick={onOpenCreateRoom}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors text-left"
        >
          <PlusSquare className="w-4 h-4 text-purple-400" />
          <span>Create Room</span>
        </button>

        <button
          type="button"
          onClick={onOpenJoinRoom}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors text-left"
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Join Room</span>
        </button>
      </div>

      {/* Playlists Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3.5 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Playlists
          </span>
          <button
            type="button"
            onClick={onOpenCreateRoom}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Create Playlist or Room"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Playlist Items */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
          {PLAYLISTS.map((pl) => {
            const isSelected = activePlaylist === pl.name;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => onSelectPlaylist?.(pl.name)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
                }`}
              >
                {pl.isLiked ? (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Heart className="w-4 h-4 fill-white text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-900 border border-white/[0.08] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pl.artworkUrl}
                      alt={pl.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-white">{pl.name}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{pl.count}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

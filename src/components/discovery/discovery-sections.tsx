'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { NormalizedTrack } from '@/lib/types/music';

interface DiscoverySectionsProps {
  onPlayTrack: (track: NormalizedTrack) => void;
  onOpenSearch?: () => void;
  activeTrackId?: string;
}

export const MADE_FOR_YOU_CARDS: {
  id: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  track: NormalizedTrack;
}[] = [
  {
    id: 'chill-mix',
    title: 'Chill Mix',
    subtitle: 'Relax and unwind',
    artworkUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=500&fit=crop&q=80',
    track: {
      id: 'verome:jfKfPfyJRdk',
      provider: 'verome',
      providerTrackId: 'jfKfPfyJRdk',
      title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
      artistName: 'Lofi Girl',
      artworkUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=500&fit=crop&q=80',
      durationSeconds: 240,
      providerPageUrl: 'https://music.youtube.com/watch?v=jfKfPfyJRdk',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Chill Mix via YouTube Music (Verome)',
    },
  },
  {
    id: 'focus-beats',
    title: 'Focus',
    subtitle: 'Stay productive',
    artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&h=500&fit=crop&q=80',
    track: {
      id: 'verome:5qap5aO4i9A',
      provider: 'verome',
      providerTrackId: '5qap5aO4i9A',
      title: 'Deep Focus Ambient Study Music',
      artistName: 'ChilledCow / Lofi',
      artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&h=500&fit=crop&q=80',
      durationSeconds: 210,
      providerPageUrl: 'https://music.youtube.com/watch?v=5qap5aO4i9A',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Focus Music via YouTube Music (Verome)',
    },
  },
  {
    id: 'discover-weekly',
    title: 'Discover Weekly',
    subtitle: 'New music for you',
    artworkUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&h=500&fit=crop&q=80',
    track: {
      id: 'verome:4NRXx6U8ABQ',
      provider: 'verome',
      providerTrackId: '4NRXx6U8ABQ',
      title: 'Blinding Lights',
      artistName: 'The Weeknd',
      artworkUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&h=500&fit=crop&q=80',
      durationSeconds: 200,
      providerPageUrl: 'https://music.youtube.com/watch?v=4NRXx6U8ABQ',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Blinding Lights via YouTube Music (Verome)',
    },
  },
  {
    id: 'evening-vibes',
    title: 'Evening Vibes',
    subtitle: 'Soft beats, big feelings',
    artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=500&fit=crop&q=80',
    track: {
      id: 'verome:m7Bc3JBkWP4',
      provider: 'verome',
      providerTrackId: 'm7Bc3JBkWP4',
      title: 'Stay',
      artistName: 'The Kid LAROI, Justin Bieber',
      artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=500&fit=crop&q=80',
      durationSeconds: 141,
      providerPageUrl: 'https://music.youtube.com/watch?v=m7Bc3JBkWP4',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Evening Vibes via YouTube Music (Verome)',
    },
  },
  {
    id: 'top-trending',
    title: 'Top Trending',
    subtitle: "What's hot right now",
    artworkUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=500&fit=crop&q=80',
    track: {
      id: 'verome:fJ9rUzIMcZQ',
      provider: 'verome',
      providerTrackId: 'fJ9rUzIMcZQ',
      title: 'Bohemian Rhapsody',
      artistName: 'Queen',
      artworkUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=500&fit=crop&q=80',
      durationSeconds: 359,
      providerPageUrl: 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Top Trending via YouTube Music (Verome)',
    },
  },
  {
    id: 'party-anthems',
    title: 'Party Anthems',
    subtitle: 'Turn it up',
    artworkUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=500&fit=crop&q=80',
    track: {
      id: 'verome:kJQP7kiw5Fk',
      provider: 'verome',
      providerTrackId: 'kJQP7kiw5Fk',
      title: 'Despacito',
      artistName: 'Luis Fonsi ft. Daddy Yankee',
      artworkUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=500&fit=crop&q=80',
      durationSeconds: 282,
      providerPageUrl: 'https://music.youtube.com/watch?v=kJQP7kiw5Fk',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Party Anthems via YouTube Music (Verome)',
    },
  },
];

export const RECENTLY_PLAYED_CARDS: {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  track: NormalizedTrack;
}[] = [
  {
    id: 'die-for-you',
    title: 'Die For You',
    artist: 'The Weeknd',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80',
    track: {
      id: 'verome:u9n7Cw-4_PE',
      provider: 'verome',
      providerTrackId: 'u9n7Cw-4_PE',
      title: 'Die For You',
      artistName: 'The Weeknd',
      artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop&q=80',
      durationSeconds: 260,
      providerPageUrl: 'https://music.youtube.com/watch?v=u9n7Cw-4_PE',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Die For You by The Weeknd via YouTube Music (Verome)',
    },
  },
  {
    id: 'as-it-was',
    title: 'As It Was',
    artist: 'Harry Styles',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop&q=80',
    track: {
      id: 'verome:H5v3kku4y6Q',
      provider: 'verome',
      providerTrackId: 'H5v3kku4y6Q',
      title: 'As It Was',
      artistName: 'Harry Styles',
      artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop&q=80',
      durationSeconds: 167,
      providerPageUrl: 'https://music.youtube.com/watch?v=H5v3kku4y6Q',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'As It Was by Harry Styles via YouTube Music (Verome)',
    },
  },
  {
    id: 'snooze',
    title: 'Snooze',
    artist: 'SZA',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop&q=80',
    track: {
      id: 'verome:LDY_XReBw9A',
      provider: 'verome',
      providerTrackId: 'LDY_XReBw9A',
      title: 'Snooze',
      artistName: 'SZA',
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop&q=80',
      durationSeconds: 201,
      providerPageUrl: 'https://music.youtube.com/watch?v=LDY_XReBw9A',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Snooze by SZA via YouTube Music (Verome)',
    },
  },
  {
    id: 'someone-like-you',
    title: 'Someone Like You',
    artist: 'Adele',
    artworkUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&h=300&fit=crop&q=80',
    track: {
      id: 'verome:hLQl3WQQoQ0',
      provider: 'verome',
      providerTrackId: 'hLQl3WQQoQ0',
      title: 'Someone Like You',
      artistName: 'Adele',
      artworkUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&h=300&fit=crop&q=80',
      durationSeconds: 285,
      providerPageUrl: 'https://music.youtube.com/watch?v=hLQl3WQQoQ0',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Someone Like You by Adele via YouTube Music (Verome)',
    },
  },
  {
    id: 'after-hours',
    title: 'After Hours',
    artist: 'The Weeknd',
    artworkUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&h=300&fit=crop&q=80',
    track: {
      id: 'verome:ygTZZpVkm3o',
      provider: 'verome',
      providerTrackId: 'ygTZZpVkm3o',
      title: 'After Hours',
      artistName: 'The Weeknd',
      artworkUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&h=300&fit=crop&q=80',
      durationSeconds: 361,
      providerPageUrl: 'https://music.youtube.com/watch?v=ygTZZpVkm3o',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'After Hours by The Weeknd via YouTube Music (Verome)',
    },
  },
  {
    id: 'flowers',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=300&h=300&fit=crop&q=80',
    track: {
      id: 'verome:G7KNmW9a75Y',
      provider: 'verome',
      providerTrackId: 'G7KNmW9a75Y',
      title: 'Flowers',
      artistName: 'Miley Cyrus',
      artworkUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=300&h=300&fit=crop&q=80',
      durationSeconds: 200,
      providerPageUrl: 'https://music.youtube.com/watch?v=G7KNmW9a75Y',
      playbackType: 'video_embed',
      isPlayable: true,
      attributionText: 'Flowers by Miley Cyrus via YouTube Music (Verome)',
    },
  },
];

export function DiscoverySections({
  onPlayTrack,
  onOpenSearch,
  activeTrackId,
}: DiscoverySectionsProps) {
  const madeForYouRef = useRef<HTMLDivElement>(null);

  const scrollMadeForYou = (direction: 'left' | 'right') => {
    if (madeForYouRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      madeForYouRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-7 my-4 select-none">
      {/* 1. Made for You Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Made for You
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollMadeForYou('left')}
              className="w-7 h-7 rounded-full glass-pill flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollMadeForYou('right')}
              className="w-7 h-7 rounded-full glass-pill flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal scroll container with 6 vertical cards */}
        <div
          ref={madeForYouRef}
          className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar pb-1"
        >
          {MADE_FOR_YOU_CARDS.map((card) => {
            const isPlaying = activeTrackId === card.track.id;
            return (
              <div
                key={card.id}
                onClick={() => onPlayTrack(card.track)}
                className={`group relative w-36 sm:w-40 shrink-0 h-48 sm:h-52 rounded-2xl overflow-hidden glass-card cursor-pointer border transition-all flex flex-col justify-end p-3 ${
                  isPlaying
                    ? 'border-purple-500/60 ring-2 ring-purple-500/40 shadow-glow-purple'
                    : 'border-white/[0.08] hover:border-purple-500/40'
                }`}
              >
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${card.artworkUrl}')` }}
                />

                {/* Dark Gradient scrim for legible text */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090A12]/95 via-[#090A12]/50 to-transparent" />

                {/* Center Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-10 h-10 rounded-full bg-white/90 text-surface-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-surface-950 ml-0.5" />
                  </div>
                </div>

                {/* Text Metadata */}
                <div className="relative z-10 space-y-0.5">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Recently Played Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Recently Played
          </h2>
          <button
            type="button"
            onClick={onOpenSearch}
            className="text-xs font-semibold text-neutral-400 hover:text-purple-300 transition-colors"
          >
            See all
          </button>
        </div>

        {/* 6 Grid/Row Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
          {RECENTLY_PLAYED_CARDS.map((card) => {
            const isPlaying = activeTrackId === card.track.id;
            return (
              <div
                key={card.id}
                onClick={() => onPlayTrack(card.track)}
                className={`group p-2.5 rounded-2xl glass-card cursor-pointer border transition-all flex flex-col space-y-2.5 ${
                  isPlaying
                    ? 'border-purple-500/60 ring-2 ring-purple-500/40 shadow-glow-purple'
                    : 'border-white/[0.06] hover:border-purple-500/40'
                }`}
              >
                {/* Square Album Art */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface-950 border border-white/[0.08]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.artworkUrl}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Play Button overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-white text-surface-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-surface-950 ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Track Details */}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                    {card.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {card.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

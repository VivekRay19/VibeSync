'use client';

import React from 'react';
import { Users, ChevronRight, Sparkles, Radio } from 'lucide-react';

interface HeroBannerProps {
  onCreateRoom: () => void;
  onJoinRoom?: () => void;
}

export function HeroBanner({ onCreateRoom, onJoinRoom }: HeroBannerProps) {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-liquid-panel border border-white/[0.08] select-none min-h-[260px] sm:min-h-[290px] flex items-center p-6 sm:p-10 my-2">
      {/* Cinematic Landscape Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80')`,
        }}
      />

      {/* Atmospheric Liquid Overlay and Ribbon Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07080F]/95 via-[#0A0D1C]/80 to-[#121630]/65" />
      <div className="absolute -right-20 -bottom-20 w-[480px] h-[480px] bg-gradient-to-tr from-purple-600/30 via-indigo-500/25 to-cyan-400/20 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[360px] h-[360px] bg-gradient-to-br from-pink-500/20 via-purple-600/15 to-transparent blur-[80px] rounded-full pointer-events-none" />

      {/* Abstract Glowing Light Ribbon Curved Graphic */}
      <svg
        className="absolute right-0 top-0 h-full w-2/3 pointer-events-none opacity-40 mix-blend-screen"
        viewBox="0 0 600 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 280C250 240 320 80 550 50C620 40 680 70 700 120"
          stroke="url(#ribbon-grad-1)"
          strokeWidth="38"
          strokeLinecap="round"
          filter="blur(16px)"
        />
        <path
          d="M180 310C300 260 380 100 580 40"
          stroke="url(#ribbon-grad-2)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="ribbon-grad-1" x1="100" y1="280" x2="650" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333EA" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="ribbon-grad-2" x1="180" y1="310" x2="580" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C084FC" />
            <stop offset="0.5" stopColor="#818CF8" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Content Overlay */}
      <div className="relative z-10 max-w-xl space-y-3.5">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          VibeSync
        </span>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          Music brings <br />
          people <span className="text-gradient-purple">closer.</span>
        </h1>

        <p className="text-xs sm:text-sm text-neutral-300/90 leading-relaxed max-w-md">
          Create a room, explore music together and make every moment sound better.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateRoom}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-bold shadow-glow-purple transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Radio className="w-4 h-4 text-purple-200" />
            <span>Create a Room</span>
            <ChevronRight className="w-4 h-4 text-purple-200 ml-0.5" />
          </button>

          {onJoinRoom && (
            <button
              type="button"
              onClick={onJoinRoom}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass-pill text-neutral-200 hover:text-white text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02]"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Join with Code</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

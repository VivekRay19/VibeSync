import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function BrandLogo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center gap-2.5 focus:outline-none', className)}>
      {/* Dynamic Soundwave Icon */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-glow-purple">
        <div className="w-full h-full bg-surface-950 rounded-[10px] flex items-center justify-center gap-0.5 px-1.5">
          <span className="w-1 h-3.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full group-hover:h-5 transition-all duration-300" />
          <span className="w-1 h-5 bg-gradient-to-t from-indigo-400 to-cyan-400 rounded-full group-hover:h-3.5 transition-all duration-300" />
          <span className="w-1 h-2 bg-gradient-to-t from-cyan-400 to-teal-300 rounded-full group-hover:h-4 transition-all duration-300" />
          <span className="w-1 h-4 bg-gradient-to-t from-teal-300 to-purple-400 rounded-full group-hover:h-2 transition-all duration-300" />
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-white flex items-center">
          Vibe<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400">Sync</span>
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium text-neutral-400 -mt-1 tracking-wider uppercase">
            Shared Listening Room
          </span>
        )}
      </div>
    </Link>
  );
}

import React from 'react';
import { BrandLogo } from '../ui/brand-logo';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-surface-800/80 bg-surface-950/90 text-neutral-400 text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <BrandLogo />
            <p className="text-neutral-400 text-xs max-w-md">
              Real-time synchronized listening room platform. Listen to eligible music with friends across the globe with zero paid subscription requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
            <a
              href="https://docs.audius.co"
              target="_blank"
              rel="noreferrer"
              className="hover:text-purple-400 transition-colors inline-flex items-center gap-1"
            >
              Audius API <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://developer.jamendo.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-400 transition-colors inline-flex items-center gap-1"
            >
              Jamendo API <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
            >
              Supabase Realtime <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-900/60 border border-surface-800 text-neutral-400 text-[11px] leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Catalog Availability & Fair Streaming Notice
          </div>
          <p>
            VibeSync searches and streams music strictly through authorized music catalog APIs (Audius and Jamendo). Search results reflect songs available within connected developer catalogs. The platform coordinates playback metadata and control commands; audio is streamed directly to each listener&apos;s browser from authorized servers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-900 text-neutral-400 text-[11px]">
          <p>&copy; {new Date().getFullYear()} VibeSync. Crafted with precision for shared music listening.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/VivekRay19/VibeSync"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-300 transition-colors"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

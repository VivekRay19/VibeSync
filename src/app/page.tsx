'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { Footer } from '@/components/navigation/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { generateOrGetGuestSession, getLocalGuestSession } from '@/lib/auth/client';
import {
  Radio,
  Users,
  Sparkles,
  ArrowRight,
  Sliders,
  ShieldCheck,
  Disc3,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  // Create Room modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('Chill Vibes & Beats');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Room modal state
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const session = getLocalGuestSession();
    if (session) {
      setCreateDisplayName(session.displayName);
      setJoinDisplayName(session.displayName);
    }
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomName.trim() || !createDisplayName.trim()) {
      setCreateError('Please enter a room name and your display name');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const session = generateOrGetGuestSession(createDisplayName.trim());
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createRoomName.trim(),
          displayName: session.displayName,
          userId: session.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create room');
      }

      router.push(`/room/${data.room.roomCode}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating room');
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinDisplayName.trim()) {
      setJoinError('Please provide both room code and your display name');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const session = generateOrGetGuestSession(joinDisplayName.trim());
      const cleanCode = joinCode.trim().toUpperCase();

      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: cleanCode,
          displayName: session.displayName,
          userId: session.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Could not find or join room');
      }

      router.push(`/room/${cleanCode}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Invalid room code');
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 text-neutral-100 selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-28 px-4 sm:px-6 overflow-hidden">
          {/* Ambient Lighting Gradients */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-purple-700/25 via-indigo-600/20 to-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
            {/* Pill Announcement */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-900 border border-purple-500/30 text-xs font-semibold text-purple-300 shadow-glow-purple">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Real-time collaborative listening with zero subscriptions</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Listen together with friends in <br />
              <span className="text-gradient">perfect harmony</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
              Create a listening room in seconds. Anyone can search for songs, queue tracks, pause, and seek. Stream legally and synchronously from open catalogs worldwide.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto text-base"
              >
                <Radio className="w-5 h-5 mr-2" />
                Create a Room
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={() => setIsJoinOpen(true)}
                className="w-full sm:w-auto text-base"
              >
                <Users className="w-5 h-5 mr-2 text-indigo-400" />
                Join with Room Code
              </Button>
            </div>

            {/* Quick Demo Card Preview */}
            <div className="pt-12 max-w-3xl mx-auto">
              <div className="p-6 rounded-2xl bg-surface-900/90 border border-surface-800 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-left">
                  <div className="relative w-16 h-16 rounded-xl bg-purple-950 border border-purple-500/30 overflow-hidden flex items-center justify-center shrink-0">
                    <Disc3 className="w-8 h-8 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                      Now Synchronizing
                    </span>
                    <h3 className="text-base font-bold text-white">Picnic Electronic Music</h3>
                    <p className="text-xs text-neutral-400">Guido Santiago &bull; Audius Catalog</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold ring-2 ring-surface-900">
                      A
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold ring-2 ring-surface-900">
                      V
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold ring-2 ring-surface-900">
                      S
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Synchronized
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE HIGHLIGHTS */}
        <section className="py-20 px-4 sm:px-6 border-t border-surface-800/80 bg-surface-950/60">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Engineered for collaborative listening
              </h2>
              <p className="text-sm text-neutral-400 max-w-xl mx-auto">
                Not just another playlist sharing app. VibeSync coordinates playback events and position across independent devices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-2xl bg-surface-900/80 border border-surface-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/40 flex items-center justify-center text-purple-400">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Drift-Corrected Playback</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Best-effort audio synchronization calculates server elapsed time, corrects network drift smoothly, and gets new listeners on the exact same second.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl bg-surface-900/80 border border-surface-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-blue-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Democratic Controls</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Every participant can pause, seek, and add songs to the shared queue by default. Everyone contributes to the session vibes.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl bg-surface-900/80 border border-surface-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Open Music Catalogs</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Integrated with authorized Audius and YouTube catalogs. Free for every participant without paywalls or mandatory paid subscriptions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CREATE ROOM MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <span>Create a Listening Room</span>
          </div>
        }
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <Input
            label="Room Name"
            value={createRoomName}
            onChange={(e) => setCreateRoomName(e.target.value)}
            placeholder="e.g. Midnight Beats, Study Session"
            required
            autoFocus
          />

          <Input
            label="Your Display Name"
            value={createDisplayName}
            onChange={(e) => setCreateDisplayName(e.target.value)}
            placeholder="e.g. Alex, Maya"
            helperText="Visible to everyone who joins your room."
            required
          />

          {createError && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createLoading}>
              Launch Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* JOIN ROOM MODAL */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Join a Listening Room</span>
          </div>
        }
      >
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <Input
            label="Room Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. K9T2A8"
            maxLength={8}
            className="font-mono uppercase tracking-widest text-center text-lg"
            required
            autoFocus
          />

          <Input
            label="Your Display Name"
            value={joinDisplayName}
            onChange={(e) => setJoinDisplayName(e.target.value)}
            placeholder="e.g. Jordan, Sam"
            required
          />

          {joinError && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
              {joinError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={joinLoading}>
              Join Room
            </Button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}

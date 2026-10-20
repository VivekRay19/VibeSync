'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Check, LogOut, ShieldAlert, QrCode } from 'lucide-react';

interface RoomHeaderProps {
  roomName: string;
  roomCode: string;
  isRoomOwner: boolean;
  onLeaveRoom: () => void;
  onCloseRoom?: () => void;
  onOpenInvite?: () => void;
}

export function RoomHeader({
  roomName,
  roomCode,
  isRoomOwner,
  onLeaveRoom,
  onCloseRoom,
  onOpenInvite,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleInviteClick = () => {
    if (onOpenInvite) {
      onOpenInvite();
      return;
    }

    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/room/${roomCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{roomName}</h1>
          <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-800/50 px-2.5 py-1 rounded-lg">
            {roomCode}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          Collaborative playback active &bull; Anyone can pause, seek, queue, or switch tracks
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleInviteClick}
          className="flex-1 sm:flex-initial text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span className="text-emerald-300 font-medium">Link Copied!</span>
            </>
          ) : (
            <>
              <QrCode className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
              <span>Invite Friends (QR)</span>
            </>
          )}
        </Button>

        {isRoomOwner && onCloseRoom && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCloseConfirm(true)}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
            End Session
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onLeaveRoom}
          className="text-xs text-neutral-400 hover:text-white"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Leave
        </Button>
      </div>

      {/* Close Room Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-surface-900 border border-surface-700 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Close Listening Room?</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to close &ldquo;{roomName}&rdquo;? All participants will be disconnected and playback will end.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowCloseConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onCloseRoom?.();
                }}
              >
                Yes, Close Room
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { QrCode, Copy, Check, Share2, Smartphone, Loader2 } from 'lucide-react';

interface RoomInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  roomCode: string;
}

export function RoomInviteModal({
  isOpen,
  onClose,
  roomName,
  roomCode,
}: RoomInviteModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Compute canonical absolute invitation URL
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://vibe-sync-hazel.vercel.app';
  const cleanCode = roomCode.trim().toUpperCase();
  const inviteUrl = `${origin}/room/${cleanCode}`;

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Generate QR code when modal opens or code changes
  useEffect(() => {
    if (!isOpen || !cleanCode) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(inviteUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#080A11',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, cleanCode, inviteUrl]);

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(cleanCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (hasNativeShare) {
      try {
        await navigator.share({
          title: `Join "${roomName}" on VibeSync`,
          text: `Join our collaborative listening room "${roomName}" on VibeSync!`,
          url: inviteUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error)?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-purple-400" />
          <span>Invite Friends to Room</span>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center space-y-4 py-1">
        {/* Room Headline & Code */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {roomName || 'Vibe Listening Room'}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-neutral-400">Room Code:</span>
            <span className="font-mono text-sm font-bold text-purple-300 bg-purple-950/70 border border-purple-800/50 px-2.5 py-0.5 rounded-lg tracking-widest">
              {cleanCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-neutral-400 hover:text-white p-1 text-xs transition-colors"
              title="Copy room code"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* QR Code Container (High-contrast card for smartphone camera scanning) */}
        <div className="relative p-4 rounded-3xl bg-white shadow-2xl border-4 border-white/[0.2] flex items-center justify-center min-w-[240px] min-h-[240px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-neutral-800">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              <span className="text-xs font-semibold">Generating QR Code...</span>
            </div>
          ) : qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR Code invitation for room ${cleanCode}`}
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
            />
          ) : (
            <div className="text-xs text-neutral-500">Failed to render QR Code</div>
          )}
        </div>

        {/* Scan instruction pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-neutral-300 text-xs">
          <Smartphone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>Scan with your phone camera to join instantly</span>
        </div>

        {/* Invitation Link Input Box */}
        <div className="w-full flex items-center gap-2 p-1.5 pl-3 rounded-2xl glass-card border border-white/[0.08]">
          <span className="text-xs font-mono text-neutral-400 truncate flex-1 text-left select-all">
            {inviteUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-white transition-all flex items-center gap-1.5 shrink-0"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            size="md"
            variant="primary"
            onClick={handleNativeShare}
            className="flex-1 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
          >
            {shareSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Invitation Shared!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>{hasNativeShare ? 'Share Invitation' : 'Copy Invitation Link'}</span>
              </>
            )}
          </Button>

          <Button
            size="md"
            variant="ghost"
            onClick={onClose}
            className="text-xs sm:text-sm text-neutral-400 hover:text-white"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

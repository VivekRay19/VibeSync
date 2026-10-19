'use client';

import React from 'react';
import { PresenceState } from '@/lib/types/realtime';
import { RoomMember } from '@/lib/types/music';
import { Crown, Users, UserX } from 'lucide-react';

interface ParticipantListProps {
  presenceMembers: PresenceState[];
  fallbackMembers: RoomMember[];
  currentUserId: string;
  isRoomOwner: boolean;
  onKickMember?: (userId: string) => void;
}

export function ParticipantList({
  presenceMembers,
  fallbackMembers,
  currentUserId,
  isRoomOwner,
  onKickMember,
}: ParticipantListProps) {
  // Use live presence if available, otherwise fallback to database members
  const displayList =
    presenceMembers.length > 0
      ? presenceMembers.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          isOwner: p.isOwner,
          isOnline: true,
        }))
      : fallbackMembers.map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          isOwner: m.role === 'owner',
          isOnline: true,
        }));

  return (
    <div className="flex flex-col rounded-2xl bg-surface-900 border border-surface-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Listeners in Room</h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-800 text-neutral-300">
          {displayList.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {displayList.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <div
              key={member.userId}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                isSelf
                  ? 'bg-purple-950/20 border-purple-800/30'
                  : 'bg-surface-850 border-surface-750/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                    {member.displayName.charAt(0)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-900" />
                </div>

                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {member.displayName}
                    </p>
                    {isSelf && (
                      <span className="text-[10px] text-purple-300 bg-purple-900/50 px-1.5 py-0.2 rounded font-medium">
                        You
                      </span>
                    )}
                  </div>
                  {member.isOwner && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                      <Crown className="w-2.5 h-2.5" /> Room Host
                    </span>
                  )}
                </div>
              </div>

              {/* Host moderation action */}
              {isRoomOwner && !isSelf && onKickMember && (
                <button
                  onClick={() => onKickMember(member.userId)}
                  title="Remove listener from room"
                  className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  aria-label="Remove listener"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

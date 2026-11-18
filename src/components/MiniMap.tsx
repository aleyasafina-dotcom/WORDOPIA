import React from 'react';
import { MISSIONS_CATALOG } from '../data/missions.ts';
import type { MissionWorldId, WorldInteractable } from '../types/game.ts';

interface MiniMapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  worldId: MissionWorldId;
  interactables: WorldInteractable[];
  completedChallenges?: Record<string, string[]>;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  worldId,
  interactables,
  completedChallenges,
}) => {
  // Map local world coords (-28..28) to SVG viewBox (0..120)
  const toMapCoord = (val: number) => Math.max(8, Math.min(112, ((val + 28) / 56) * 120));
  const px = toMapCoord(playerX);
  const pz = toMapCoord(playerZ);
  const worldMeta = MISSIONS_CATALOG.find((m) => m.id === worldId) ?? MISSIONS_CATALOG[0];
  const solvedIds = completedChallenges?.[String(worldId)] ?? [];

  return (
    <div className="holo-panel flex flex-col items-center rounded-2xl p-2">
      <div className="mb-1 flex w-full items-center justify-between gap-2 px-1 text-[10px] font-bold tracking-wider text-[#00C8F0]">
        <span className="truncate">{worldMeta.worldName.toUpperCase()}</span>
        <span className="font-mono-tabular text-[#F4F8FF]/70">
          {Math.round(playerX)},{Math.round(playerZ)}
        </span>
      </div>
      <svg
        viewBox="0 0 120 120"
        className="h-28 w-28 rounded-xl border border-[#00C8F0]/30 bg-[#0A1834]"
        aria-label={`Radar ${worldMeta.worldName}`}
      >
        <circle cx={60} cy={60} r={46} fill="none" stroke="#1E3A5F" strokeWidth={1.2} strokeDasharray="3 3" />
        <line x1={60} y1={12} x2={60} y2={108} stroke="#1E3A5F" strokeWidth={2} />
        <line x1={12} y1={60} x2={108} y2={60} stroke="#1E3A5F" strokeWidth={2} />

        {/* Interactable Nodes & World Portals */}
        {interactables.map((item) => {
          const ix = toMapCoord(item.position.x);
          const iz = toMapCoord(item.position.z);
          const isPortal = item.kind === 'world_portal';
          const isSolved = item.challengeId ? solvedIds.includes(item.challengeId) : false;
          const color = isPortal ? '#C4B5FD' : isSolved ? '#A5F05A' : worldMeta.accentColor;

          return (
            <g key={item.id}>
              {isPortal ? (
                <rect
                  x={ix - 4}
                  y={iz - 4}
                  width={8}
                  height={8}
                  rx={2}
                  fill={color}
                  fillOpacity={0.35}
                  stroke={color}
                  strokeWidth={1.2}
                />
              ) : (
                <circle
                  cx={ix}
                  cy={iz}
                  r={4.5}
                  fill={color}
                  fillOpacity={0.4}
                  stroke={color}
                  strokeWidth={1.4}
                />
              )}
            </g>
          );
        })}

        {/* Player Arrow */}
        <g transform={`translate(${px}, ${pz}) rotate(${(-playerYaw * 180) / Math.PI})`}>
          <polygon points="0,-5.5 4.2,4.2 0,2 -4.2,4.2" fill="#F4F8FF" stroke="#00C8F0" strokeWidth={1.3} />
        </g>
      </svg>
    </div>
  );
};

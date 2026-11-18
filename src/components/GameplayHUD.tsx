import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Compass,
  Gamepad2,
  GraduationCap,
  LogOut,
  Pause,
  Settings,
  Shield,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MISSIONS_CATALOG, computeLevelFromXp, getHeroById } from '../data/missions.ts';
import type { MissionWorldId, PlayerState, WorldInteractable } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';
import { MiniMap } from './MiniMap.tsx';
import { MobileControls } from './MobileControls.tsx';
import type { HudWorldSnapshot, MobileControlInput } from './NexusWorldCanvas.tsx';

interface GameplayHUDProps {
  state: PlayerState;
  activeWorldId: MissionWorldId;
  hudSnapshot: HudWorldSnapshot;
  missionOverrides: { mission_id: number; custom_title: string; custom_briefing: string }[];
  mobileInputRef: React.MutableRefObject<MobileControlInput>;
  muted: boolean;
  cinematicActive?: boolean;
  onToggleMute: () => void;
  onTriggerInteract: (item: WorldInteractable) => void;
  onSwitchWorld: (worldId: MissionWorldId) => void;
  onZoomCamera: (delta: number) => void;
  onOpenJournal: () => void;
  onOpenPause: () => void;
  onChangeHero: () => void;
  onOpenDewanWira: () => void;
  onOpenSettings: () => void;
  onOpenCeremony: () => void;
  onOpenTeacherPortal: () => void;
  onOpenAdminPortal: () => void;
  onLogout: () => void;
}

export const GameplayHUD: React.FC<GameplayHUDProps> = ({
  state,
  activeWorldId,
  hudSnapshot,
  missionOverrides,
  mobileInputRef,
  muted,
  cinematicActive = false,
  onToggleMute,
  onTriggerInteract,
  onSwitchWorld,
  onZoomCamera,
  onOpenJournal,
  onOpenPause,
  onChangeHero,
  onOpenDewanWira,
  onOpenSettings,
  onOpenCeremony,
  onOpenTeacherPortal,
  onOpenAdminPortal,
  onLogout,
}) => {
  const { user, missions } = state;
  const hero = getHeroById(user.selectedHero);
  const lvl = computeLevelFromXp(user.xp);

  const [showTouchPad, setShowTouchPad] = useState(false);
  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
    setShowTouchPad(isTouch);
  }, []);

  const worldMeta = MISSIONS_CATALOG.find((m) => m.id === activeWorldId) ?? MISSIONS_CATALOG[0];
  const worldProgress = missions.find((m) => m.missionId === activeWorldId);
  const override = missionOverrides.find((o) => o.mission_id === activeWorldId);
  const solvedForWorld = user.completedChallenges?.[String(activeWorldId)]?.length ?? 0;

  const worldStatusLabel =
    worldProgress?.status === 'selesai'
      ? 'Selesai'
      : worldProgress?.status === 'sedang_dilaksanakan' || solvedForWorld > 0
      ? 'Sedang Dijalankan'
      : 'Belum Bermula';

  if (cinematicActive) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 md:p-5">
      {/* Top Row: Left Player Profile + World Tracker + Switcher, Right Mini-Map & Action Buttons */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Player Identity & Active World Panel */}
        <div className="flex flex-col gap-2.5">
          <div className="holo-panel pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-display text-sm font-extrabold text-[#F4F8FF]"
              style={{
                borderColor: hero.secondaryColor,
                backgroundColor: `${hero.secondaryColor}28`,
              }}
            >
              {hero.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-extrabold text-[#F4F8FF]">
                  {user.name}
                </span>
                <span
                  className="font-mono-tabular text-[11px] font-bold"
                  style={{ color: hero.secondaryColor }}
                >
                  [{hero.name}]
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2.5 text-[11px]">
                <span className="font-mono-tabular font-bold text-[#00C8F0]">
                  Tahap {lvl.level}
                </span>
                <span className="font-mono-tabular font-bold text-[#FFB547]">{user.xp} XP</span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangeHero();
                  }}
                  className="text-[11px] font-semibold text-[#A5F05A] underline hover:text-[#F4F8FF]"
                >
                  Tukar Watak
                </button>
              </div>
            </div>
          </div>

          {/* Active World Mission Objective Panel */}
          <div className="holo-panel pointer-events-auto max-w-xs rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-mono-tabular text-[10px] font-bold tracking-wider"
                style={{ color: worldMeta.accentColor }}
              >
                {worldMeta.code} · {worldMeta.worldName}
              </span>
              <span className="font-mono-tabular text-[10px] font-bold text-[#A5F05A]">
                {Math.min(solvedForWorld, worldMeta.maxChallenges)}/{worldMeta.maxChallenges}
              </span>
            </div>
            <p className="mt-0.5 font-display text-sm font-bold text-[#F4F8FF]">
              {override?.custom_title || worldMeta.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[#F4F8FF]/75">
              {override?.custom_briefing || worldMeta.shortDesc}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-[#00C8F0]">
                <Compass className="h-3 w-3 shrink-0" />
                <span>{worldMeta.worldSubtitle}</span>
              </span>
              <span className="text-[#FFB547]">{worldStatusLabel}</span>
            </div>

            {/* Free-Exploration World Switcher Pills */}
            <div className="mt-2.5 flex items-center gap-1 border-t border-[#F4F8FF]/10 pt-2">
              {MISSIONS_CATALOG.map((m) => {
                const prog = missions.find((mp) => mp.missionId === m.id);
                const isActive = m.id === activeWorldId;
                const isDone = prog?.status === 'selesai';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onSwitchWorld(m.id);
                    }}
                    title={`${m.code}: ${m.worldName}`}
                    className={`flex-1 rounded-lg border py-1 font-mono-tabular text-[10px] font-extrabold transition-colors ${
                      isActive
                        ? 'border-[#00C8F0] bg-[#00C8F0] text-[#101C35]'
                        : isDone
                        ? 'border-[#A5F05A]/45 bg-[#A5F05A]/15 text-[#A5F05A] hover:border-[#A5F05A]'
                        : 'border-[#F4F8FF]/15 bg-[#0A1428] text-[#F4F8FF]/75 hover:border-[#00C8F0]'
                    }`}
                  >
                    M{m.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top-Right Mini-Map & Quick Action Bar */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
            {(user.isDutaBahasa || missions.every((m) => m.status === 'selesai')) && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenCeremony();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFB547] to-[#A5F05A] px-3 py-2 text-xs font-extrabold text-[#101C35]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Skor & Sijil Duta</span>
              </button>
            )}

            {(user.role === 'guru' || user.role === 'pentadbir') && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenTeacherPortal();
                }}
                className="holo-panel flex items-center gap-1.5 rounded-xl border-[#FFB547]/50 px-3 py-2 text-xs font-bold text-[#FFB547]"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Portal Guru</span>
              </button>
            )}

            {user.role === 'pentadbir' && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenAdminPortal();
                }}
                className="holo-panel flex items-center gap-1.5 rounded-xl border-[#7B61FF]/50 px-3 py-2 text-xs font-bold text-[#C4B5FD]"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pentadbir</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenJournal();
              }}
              className="holo-panel flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
              title="Jurnal Misi"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#00C8F0]" />
              <span className="hidden sm:inline">Jurnal Misi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenDewanWira();
              }}
              className="holo-panel flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
              title="Dewan Wira & Lencana"
            >
              <Award className="h-3.5 w-3.5 text-[#FFB547]" />
              <span className="hidden sm:inline">Dewan Wira</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowTouchPad((s) => !s);
              }}
              className={`holo-panel flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold ${
                showTouchPad ? 'border-[#A5F05A] text-[#A5F05A]' : 'text-[#F4F8FF]/80'
              }`}
              title="Tunjukkan / Sembunyikan Kawalan Sentuh"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenPause();
              }}
              className="holo-panel rounded-xl p-2 text-[#F4F8FF] hover:border-[#FFB547]"
              title="Jeda Permainan (ESC)"
            >
              <Pause className="h-4 w-4 text-[#FFB547]" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                onToggleMute();
              }}
              className={`holo-panel rounded-xl p-2 hover:border-[#00C8F0] ${
                muted ? 'border-[#FFB547]/60 text-[#FFB547]' : 'text-[#A5F05A]'
              }`}
              title={muted ? 'Hidupkan Audio' : 'Senyapkan Audio'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenSettings();
              }}
              className="holo-panel flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
              title="Tetapan Audio & Permainan"
            >
              <Settings className="h-4 w-4 text-[#00C8F0]" />
              <span className="hidden lg:inline">Tetapan Audio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onLogout();
              }}
              className="holo-panel rounded-xl p-2 text-[#F4F8FF]/75 hover:border-[#FFB547] hover:text-[#FFB547]"
              title="Log Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="pointer-events-auto flex items-end gap-2">
            {/* Camera Zoom Controls */}
            <div className="holo-panel flex flex-col gap-1 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onZoomCamera(-0.9);
                }}
                aria-label="Zum Masuk Kamera"
                title="Zum Masuk"
                className="rounded-lg p-1.5 text-[#00C8F0] hover:bg-[#00C8F0]/15"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onZoomCamera(0.9);
                }}
                aria-label="Zum Keluar Kamera"
                title="Zum Keluar"
                className="rounded-lg p-1.5 text-[#00C8F0] hover:bg-[#00C8F0]/15"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>

            <MiniMap
              playerX={hudSnapshot.x}
              playerZ={hudSnapshot.z}
              playerYaw={hudSnapshot.yaw}
              worldId={hudSnapshot.worldId}
              interactables={hudSnapshot.worldInteractables}
              completedChallenges={user.completedChallenges}
            />
          </div>
        </div>
      </div>

      {/* Bottom Center Prompts & Desktop Control Strip */}
      <div className="flex flex-col items-center gap-2 pb-1">
        {hudSnapshot.worldLoading && (
          <div className="holo-panel rounded-xl border-[#00C8F0]/60 px-4 py-2 text-xs font-bold text-[#00C8F0]">
            Memuatkan dunia 3D {worldMeta.worldName}...
          </div>
        )}

        {hudSnapshot.nearestInteractable && (
          <button
            type="button"
            onClick={() => onTriggerInteract(hudSnapshot.nearestInteractable!)}
            className="holo-panel pointer-events-auto flex items-center gap-3 rounded-2xl border-[#A5F05A] bg-[#0A1830]/95 px-5 py-3 shadow-[0_0_30px_rgba(0,200,240,0.35)] transition-transform hover:scale-[1.02]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#A5F05A] font-mono-tabular text-xs font-extrabold text-[#101C35]">
              E
            </span>
            <div className="text-left">
              <p className="text-xs font-extrabold text-[#A5F05A]">
                {hudSnapshot.nearestInteractable.kind === 'world_portal'
                  ? 'Tekan E untuk berpindah dunia'
                  : 'Tekan E untuk berinteraksi'}
              </p>
              <p className="text-xs font-semibold text-[#F4F8FF]">
                {hudSnapshot.nearestInteractable.label} · {hudSnapshot.nearestInteractable.subtitle}
              </p>
            </div>
          </button>
        )}

        {!showTouchPad && (
          <div className="holo-panel flex flex-wrap items-center justify-center gap-3 rounded-xl px-4 py-1.5 text-[11px] font-medium text-[#F4F8FF]/75">
            <span>
              <strong className="text-[#00C8F0]">WASD</strong> Gerak
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#00C8F0]">SHIFT</strong> Lari
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#00C8F0]">SPACE</strong> Lompat
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#A5F05A]">E</strong> Interaksi
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#FFB547]">Skrol Tetikus</strong> Zum
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#FFB547]">ESC</strong> Jeda
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              · <Users className="h-3 w-3 text-[#00C8F0]" /> {user.className}
            </span>
          </div>
        )}
      </div>

      {/* Optional / Auto-Detected Mobile Virtual Controls */}
      {showTouchPad && (
        <MobileControls
          mobileInputRef={mobileInputRef}
          canInteract={Boolean(hudSnapshot.nearestInteractable)}
          onTriggerInteract={() => {
            if (hudSnapshot.nearestInteractable) {
              onTriggerInteract(hudSnapshot.nearestInteractable);
            }
          }}
        />
      )}
    </div>
  );
};

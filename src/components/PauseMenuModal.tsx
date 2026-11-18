import React from 'react';
import { Award, BookOpen, Globe, LogOut, Play, Settings } from 'lucide-react';
import { MISSIONS_CATALOG } from '../data/missions.ts';
import type { MissionWorldId } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface PauseMenuModalProps {
  activeWorldId: MissionWorldId;
  onResume: () => void;
  onOpenJournal: () => void;
  onSwitchWorld: (worldId: MissionWorldId) => void;
  onOpenDewanWira: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  activeWorldId,
  onResume,
  onOpenJournal,
  onSwitchWorld,
  onOpenDewanWira,
  onOpenSettings,
  onLogout,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060E1F]/80 p-4">
      <div className="holo-panel w-full max-w-lg rounded-3xl p-6">
        <p className="font-mono-tabular text-[11px] font-bold tracking-widest text-[#00C8F0]">
          KAWALAN PERMAINAN WORDOPIA
        </p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-[#F4F8FF]">
          Jeda Permainan
        </h2>
        <p className="mt-1 text-xs text-[#F4F8FF]/75">
          Pilih tindakan anda atau berpindah terus ke mana-mana dunia misi.
        </p>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onResume();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] py-3.5 font-display text-sm font-extrabold text-[#101C35] shadow-lg"
          >
            <Play className="h-4 w-4" />
            <span>Teruskan Pengembaraan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onResume();
              onOpenJournal();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#00C8F0]/35 bg-[#0A1428] px-4 py-3 text-sm font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
          >
            <BookOpen className="h-4 w-4 text-[#00C8F0]" />
            <span>Buka Jurnal Misi</span>
          </button>

          <div className="rounded-2xl border border-[#F4F8FF]/12 bg-[#0A1428] p-3.5">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#FFB547]">
              <Globe className="h-3.5 w-3.5" />
              <span>Tukar Dunia Misi (Terokai Bebas):</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {MISSIONS_CATALOG.map((m) => {
                const active = m.id === activeWorldId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onSwitchWorld(m.id);
                      onResume();
                    }}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      active
                        ? 'border-[#A5F05A] bg-[#A5F05A]/15 text-[#A5F05A]'
                        : 'border-[#F4F8FF]/12 bg-[#101C35] text-[#F4F8FF]/85 hover:border-[#00C8F0]'
                    }`}
                  >
                    <span className="font-mono-tabular">M{m.id}</span> · {m.worldName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onResume();
                onOpenDewanWira();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#F4F8FF]/15 bg-[#0A1428] px-3 py-3 text-xs font-bold text-[#F4F8FF] hover:border-[#FFB547]"
            >
              <Award className="h-4 w-4 text-[#FFB547]" />
              <span>Dewan Wira & Lencana</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onResume();
                onOpenSettings();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#F4F8FF]/15 bg-[#0A1428] px-3 py-3 text-xs font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
            >
              <Settings className="h-4 w-4 text-[#00C8F0]" />
              <span>Tetapan Audio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onResume();
              onLogout();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FFB547]/35 bg-[#0A1428] py-3 text-xs font-bold text-[#FFB547] hover:bg-[#FFB547]/15"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Keluar ke Menu Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};

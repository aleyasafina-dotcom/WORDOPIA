import React from 'react';
import { ArrowLeft, Award, CheckCircle2, Compass, Lock, Shield, Sparkles } from 'lucide-react';
import {
  BADGE_CATALOG,
  MISSIONS_CATALOG,
  UNLOCKABLE_ITEMS_INFO,
  computeLevelFromXp,
} from '../data/missions.ts';
import type { PlayerState } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface DewanWiraViewProps {
  state: PlayerState;
  onOpenCeremony: () => void;
  onBack: () => void;
}

export const DewanWiraView: React.FC<DewanWiraViewProps> = ({
  state,
  onOpenCeremony,
  onBack,
}) => {
  const { user, missions } = state;
  const lvl = computeLevelFromXp(user.xp);
  const mMap = new Map(missions.map((m) => [m.missionId, m]));

  return (
    <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-5 overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="holo-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onBack();
            }}
            className="flex items-center gap-2 rounded-xl border border-[#00C8F0]/40 bg-[#0A1428] px-4 py-2 text-xs font-semibold text-[#F4F8FF] hover:border-[#00C8F0]"
          >
            <ArrowLeft className="h-4 w-4 text-[#00C8F0]" />
            <span>Kembali ke Kota NEXUS</span>
          </button>
          <div>
            <h2 className="font-display text-xl font-bold text-[#F4F8FF]">
              Dewan Wira · Pencapaian & Inventori
            </h2>
            <p className="text-xs text-[#00C8F0]">
              {user.name} · {user.className} · Tahap {lvl.level}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] text-[#F4F8FF]/70">Jumlah Mata Pengalaman</p>
            <p className="font-mono-tabular text-lg font-extrabold text-[#FFB547]">{user.xp} XP</p>
          </div>
          {user.isDutaBahasa && (
            <button
              type="button"
              onClick={onOpenCeremony}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB547] to-[#A5F05A] px-4 py-2.5 text-xs font-extrabold text-[#101C35]"
            >
              <Award className="h-4 w-4" />
              <span>Lihat Sijil Duta Bahasa</span>
            </button>
          )}
        </div>
      </div>

      {/* Journey Progress Tracker */}
      <div className="holo-panel rounded-2xl p-5">
        <h3 className="font-display text-base font-bold text-[#F4F8FF]">
          Penjejak Kemajuan 5 Operasi WORDOPIA
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
          {MISSIONS_CATALOG.map((m) => {
            const p = mMap.get(m.id);
            const status = p?.status ?? 'belum_dibuka';
            const label =
              status === 'selesai'
                ? 'SELESAI'
                : status === 'sedang_dilaksanakan'
                ? 'SEDANG DIJALANKAN'
                : 'BELUM BERMULA';
            const color =
              status === 'selesai'
                ? '#A5F05A'
                : status === 'sedang_dilaksanakan' || status === 'tersedia'
                ? '#00C8F0'
                : '#94A3B8';

            return (
              <div
                key={m.id}
                className="rounded-xl border border-[#F4F8FF]/12 bg-[#0A1428] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-bold text-[#F4F8FF]">
                    {m.code}
                  </span>
                  {status === 'selesai' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#A5F05A]" />
                  ) : status === 'belum_dibuka' ? (
                    <Compass className="h-3.5 w-3.5 text-[#00C8F0]/70" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-[#00C8F0]" />
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-[#F4F8FF]/90">{m.title}</p>
                <p className="mt-1 font-mono-tabular text-[11px] font-bold" style={{ color }}>
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Earned & Locked Badges */}
      <div className="holo-panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[#F4F8FF]">
            Koleksi Lencana Wira
          </h3>
          <span className="font-mono-tabular text-xs font-semibold text-[#00C8F0]">
            {user.badges.length} / {Object.keys(BADGE_CATALOG).length} Diperoleh
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(BADGE_CATALOG).map(([id, badge]) => {
            const earned = user.badges.includes(id);
            return (
              <div
                key={id}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  earned
                    ? 'border-[#00C8F0]/45 bg-[#0A1428]'
                    : 'border-[#F4F8FF]/10 bg-[#0A1428]/50 opacity-55'
                }`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: earned ? badge.color : '#475569',
                    backgroundColor: earned ? `${badge.color}1F` : 'transparent',
                    color: earned ? badge.color : '#64748B',
                  }}
                >
                  {earned ? <Shield className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#F4F8FF]">{badge.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#F4F8FF]/70">
                    {badge.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlockable Equipment Inventory */}
      <div className="holo-panel rounded-2xl p-5">
        <h3 className="font-display text-base font-bold text-[#F4F8FF]">
          Inventori Pakaian & Peralatan Pengembara
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(UNLOCKABLE_ITEMS_INFO).map(([key, info]) => {
            const owned = user.unlockedItems.includes(key);
            return (
              <div
                key={key}
                className={`rounded-xl border p-3 ${
                  owned
                    ? 'border-[#A5F05A]/45 bg-[#A5F05A]/10'
                    : 'border-[#F4F8FF]/10 bg-[#0A1428]/50 opacity-60'
                }`}
              >
                <p className="text-[11px] text-[#00C8F0]">{info.category}</p>
                <p className="mt-0.5 text-xs font-bold text-[#F4F8FF]">{info.label}</p>
                <p className="mt-1 text-[11px] font-medium text-[#A5F05A]">
                  {owned ? 'Terbuka' : 'Selesaikan misi untuk buka'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

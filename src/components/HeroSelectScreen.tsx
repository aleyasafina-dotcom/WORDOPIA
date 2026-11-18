import React, { useState } from 'react';
import { ArrowRight, Check, RotateCcw, RotateCw, Shield } from 'lucide-react';
import { HERO_ROSTER } from '../data/missions.ts';
import type { HeroId } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface HeroSelectScreenProps {
  playerName: string;
  selectedHero: HeroId;
  rotationOffset: number;
  onSelectHero: (heroId: HeroId) => void;
  onRotate: (deltaRad: number) => void;
  onResetRotation: (yaw: number) => void;
  onConfirmHero: (heroId: HeroId) => Promise<void>;
}

export const HeroSelectScreen: React.FC<HeroSelectScreenProps> = ({
  playerName,
  selectedHero,
  rotationOffset,
  onSelectHero,
  onRotate,
  onResetRotation,
  onConfirmHero,
}) => {
  const [saving, setSaving] = useState(false);
  const activeHero = HERO_ROSTER.find((h) => h.id === selectedHero) ?? HERO_ROSTER[0];

  const handleConfirm = async () => {
    setSaving(true);
    soundEngine.playMissionUnlock();
    try {
      await onConfirmHero(selectedHero);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="holo-panel pointer-events-auto rounded-2xl px-5 py-3">
          <p className="font-mono-tabular text-[11px] font-bold tracking-widest text-[#00C8F0]">
            BILIK PEMILIHAN WATAK EJEN WORDOPIA
          </p>
          <h2 className="font-display text-xl font-extrabold text-[#F4F8FF]">
            Selamat Bertugas, {playerName}
          </h2>
        </div>

        {/* Rotation Controls */}
        <div className="holo-panel pointer-events-auto flex items-center gap-2 rounded-2xl p-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onRotate(-Math.PI / 4);
            }}
            className="flex items-center gap-1 rounded-xl bg-[#0A1428] px-3 py-2 text-xs font-bold text-[#F4F8FF] hover:text-[#00C8F0]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Putar Kiri</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onResetRotation(Math.abs(rotationOffset % (Math.PI * 2)) < 0.3 ? Math.PI : 0);
            }}
            className="rounded-xl border border-[#00C8F0]/40 bg-[#0A1428] px-3 py-2 text-xs font-bold text-[#00C8F0]"
          >
            Hadapan / Belakang
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onRotate(Math.PI / 4);
            }}
            className="flex items-center gap-1 rounded-xl bg-[#0A1428] px-3 py-2 text-xs font-bold text-[#F4F8FF] hover:text-[#00C8F0]"
          >
            <span>Putar Kanan</span>
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Split: Left Hero Roster & Right Hero Dossier + Confirm */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        {/* 4 Playable Human Characters */}
        <div className="holo-panel pointer-events-auto grid grid-cols-2 gap-2.5 rounded-3xl p-4 sm:grid-cols-4 lg:w-[540px]">
          {HERO_ROSTER.map((hero) => {
            const active = hero.id === selectedHero;
            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSelectHero(hero.id);
                }}
                className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                  active
                    ? 'bg-[#0A1428] shadow-lg'
                    : 'border-[#F4F8FF]/12 bg-[#0A1428]/70 hover:border-[#00C8F0]/50'
                }`}
                style={{
                  borderColor: active ? hero.secondaryColor : undefined,
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: hero.secondaryColor }}
                  />
                  {active && <Check className="h-4 w-4 text-[#A5F05A]" />}
                </div>
                <p className="mt-2 font-display text-base font-extrabold text-[#F4F8FF]">
                  {hero.name}
                </p>
                <p className="text-[11px] font-medium text-[#00C8F0]">{hero.genderLabel}</p>
                <p className="mt-1 text-[11px] leading-snug text-[#F4F8FF]/70">
                  {hero.personality}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected Hero Bio & Enter City Action */}
        <div className="holo-panel pointer-events-auto w-full rounded-3xl p-5 lg:max-w-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="font-mono-tabular text-xs font-bold tracking-wider"
                style={{ color: activeHero.secondaryColor }}
              >
                {activeHero.roleTitle}
              </p>
              <h3 className="mt-0.5 font-display text-2xl font-extrabold text-[#F4F8FF]">
                {activeHero.name} · {activeHero.genderLabel}
              </h3>
            </div>
            <Shield className="h-6 w-6" style={{ color: activeHero.secondaryColor }} />
          </div>

          <div className="mt-3 space-y-1.5 rounded-2xl border border-[#F4F8FF]/10 bg-[#0A1428] p-3.5 text-xs text-[#F4F8FF]/85">
            <p>
              <strong className="text-[#00C8F0]">Gaya Rambut:</strong> {activeHero.hairDesc}
            </p>
            <p>
              <strong className="text-[#00C8F0]">Pakaian Rasmi:</strong> {activeHero.outfitDesc}
            </p>
            <p>
              <strong className="text-[#A5F05A]">Sifat Utama:</strong> {activeHero.personality}
            </p>
          </div>

          <p className="mt-2.5 text-[11px] text-[#F4F8FF]/65">
            Tip: Keempat-empat ejen berdiri di hadapan anda — pilih ARKA, NARA, ZAYAN atau MIKA dan seret skrin 3D untuk meninjau 360°.
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={handleConfirm}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] py-3.5 font-display text-sm font-extrabold text-[#101C35] shadow-lg disabled:opacity-60"
          >
            <span>{saving ? 'Menyediakan Kota NEXUS...' : `Sahkan ${activeHero.name} & Masuk ke NEXUS`}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

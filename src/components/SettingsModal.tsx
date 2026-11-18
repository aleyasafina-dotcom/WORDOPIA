import React, { useState } from 'react';
import { Check, Music, Save, Sliders, Volume2, VolumeX, Wind, X, Zap } from 'lucide-react';
import type { LearningPathway } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface SettingsModalProps {
  pathway?: LearningPathway;
  musicOn: boolean;
  sfxOn: boolean;
  ambientOn: boolean;
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  reducedMotion: boolean;
  simplified3d: boolean;
  onChangePathway?: (p: LearningPathway) => Promise<void>;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
  onToggleAmbient: () => void;
  onToggleMute: () => void;
  onChangeMusicVolume: (v: number) => void;
  onChangeSfxVolume: (v: number) => void;
  onChangeAmbientVolume: (v: number) => void;
  onToggleReducedMotion: () => void;
  onToggleSimplified3d: () => void;
  onReplayIntro: () => void;
  onClose: () => void;
}

const PATHWAYS: { id: LearningPathway; title: string; desc: string; color: string }[] = [
  {
    id: 'sokongan',
    title: 'Laluan Sokongan',
    desc: 'Petunjuk langkah demi langkah dan bantuan tambahan daripada ROBO.',
    color: '#00C8F0',
  },
  {
    id: 'kendiri',
    title: 'Laluan Kendiri',
    desc: 'Cabaran seimbang dengan petunjuk piawai mengikut rentak sendiri.',
    color: '#A5F05A',
  },
  {
    id: 'cabaran',
    title: 'Laluan Cabaran',
    desc: 'Penerokaan aras tinggi dengan panduan minimum.',
    color: '#FFB547',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  pathway,
  musicOn,
  sfxOn,
  ambientOn,
  muted,
  musicVolume,
  sfxVolume,
  ambientVolume,
  reducedMotion,
  simplified3d,
  onChangePathway,
  onToggleMusic,
  onToggleSfx,
  onToggleAmbient,
  onToggleMute,
  onChangeMusicVolume,
  onChangeSfxVolume,
  onChangeAmbientVolume,
  onToggleReducedMotion,
  onToggleSimplified3d,
  onReplayIntro,
  onClose,
}) => {
  const [savedToast, setSavedToast] = useState(false);

  const handleTestSound = () => {
    soundEngine.unlockAudio();
    if (muted) {
      onToggleMute();
    }
    soundEngine.playSuccess();
  };

  const handleSaveAudio = () => {
    soundEngine.savePrefs();
    soundEngine.playClick();
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060E1F]/80 p-4">
      <div className="holo-panel relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup tetapan"
          className="absolute right-5 top-5 rounded-xl border border-[#F4F8FF]/15 p-2 text-[#F4F8FF]/70 hover:text-[#F4F8FF]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <Sliders className="h-5 w-5 text-[#00C8F0]" />
          <h2 className="font-display text-xl font-bold text-[#F4F8FF]">
            TETAPAN AUDIO & PERMAINAN
          </h2>
        </div>

        {/* TETAPAN AUDIO */}
        <div className="mt-5 space-y-3.5 rounded-2xl border border-[#00C8F0]/25 bg-[#0A1428] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono-tabular text-xs font-extrabold tracking-wider text-[#00C8F0]">
              TETAPAN AUDIO
            </p>
            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                onToggleMute();
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                muted
                  ? 'border-[#FFB547]/60 bg-[#FFB547]/15 text-[#FFB547]'
                  : 'border-[#A5F05A]/50 bg-[#A5F05A]/15 text-[#A5F05A]'
              }`}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{muted ? 'Aktifkan Audio' : 'Senyap'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#F4F8FF]/12 bg-[#101C35] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#F4F8FF]">
                <Music className="h-4 w-4 text-[#00C8F0]" />
                <span>Muzik Latar</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-xs font-bold text-[#00C8F0]">
                  {muted || !musicOn ? 'Senyap' : `${Math.round(musicVolume * 100)}%`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlockAudio();
                    onToggleMusic();
                  }}
                  className={`rounded-lg border border-[#F4F8FF]/15 bg-[#0A1428] px-2.5 py-1 text-[11px] font-bold ${
                    musicOn ? 'text-[#A5F05A]' : 'text-slate-400'
                  }`}
                >
                  {musicOn ? 'Hidup' : 'Mati'}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="shrink-0 text-[11px] font-medium text-[#F4F8FF]/65">
                Tahap Kelantangan
              </span>
              <input
                type="range"
                aria-label="Tahap Kelantangan Muzik Latar"
                min={0}
                max={100}
                value={Math.round(musicVolume * 100)}
                onChange={(e) => {
                  soundEngine.unlockAudio();
                  onChangeMusicVolume(Number(e.target.value) / 100);
                }}
                className="w-full accent-[#00C8F0]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#F4F8FF]/12 bg-[#101C35] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#F4F8FF]">
                {sfxOn && !muted ? (
                  <Volume2 className="h-4 w-4 text-[#A5F05A]" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
                <span>Kesan Bunyi</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-xs font-bold text-[#A5F05A]">
                  {muted || !sfxOn ? 'Senyap' : `${Math.round(sfxVolume * 100)}%`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlockAudio();
                    onToggleSfx();
                  }}
                  className={`rounded-lg border border-[#F4F8FF]/15 bg-[#0A1428] px-2.5 py-1 text-[11px] font-bold ${
                    sfxOn ? 'text-[#A5F05A]' : 'text-slate-400'
                  }`}
                >
                  {sfxOn ? 'Hidup' : 'Mati'}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="shrink-0 text-[11px] font-medium text-[#F4F8FF]/65">
                Tahap Kelantangan
              </span>
              <input
                type="range"
                aria-label="Tahap Kelantangan Kesan Bunyi"
                min={0}
                max={100}
                value={Math.round(sfxVolume * 100)}
                onChange={(e) => {
                  soundEngine.unlockAudio();
                  onChangeSfxVolume(Number(e.target.value) / 100);
                }}
                className="w-full accent-[#A5F05A]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#F4F8FF]/12 bg-[#101C35] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#F4F8FF]">
                <Wind className={`h-4 w-4 ${ambientOn && !muted ? 'text-[#FFB547]' : 'text-slate-400'}`} />
                <span>Bunyi Persekitaran</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-xs font-bold text-[#FFB547]">
                  {muted || !ambientOn ? 'Senyap' : `${Math.round(ambientVolume * 100)}%`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlockAudio();
                    onToggleAmbient();
                  }}
                  className={`rounded-lg border border-[#F4F8FF]/15 bg-[#0A1428] px-2.5 py-1 text-[11px] font-bold ${
                    ambientOn ? 'text-[#A5F05A]' : 'text-slate-400'
                  }`}
                >
                  {ambientOn ? 'Hidup' : 'Mati'}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="shrink-0 text-[11px] font-medium text-[#F4F8FF]/65">
                Tahap Kelantangan
              </span>
              <input
                type="range"
                aria-label="Tahap Kelantangan Bunyi Persekitaran"
                min={0}
                max={100}
                value={Math.round(ambientVolume * 100)}
                onChange={(e) => {
                  soundEngine.unlockAudio();
                  onChangeAmbientVolume(Number(e.target.value) / 100);
                }}
                className="w-full accent-[#FFB547]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestSound}
              className="flex items-center gap-1.5 rounded-xl border border-[#00C8F0]/45 bg-[#00C8F0]/12 px-4 py-2 text-xs font-bold text-[#00C8F0] hover:bg-[#00C8F0]/22"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Uji Bunyi</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAudio}
              className="flex items-center gap-1.5 rounded-xl bg-[#A5F05A] px-4 py-2 text-xs font-extrabold text-[#101C35] hover:brightness-105"
            >
              {savedToast ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              <span>{savedToast ? 'Tetapan Disimpan!' : 'Simpan Tetapan'}</span>
            </button>
          </div>
        </div>

        {/* Differentiated Learning Pathways (when logged in) */}
        {pathway && onChangePathway && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#00C8F0]">
              Laluan Pembelajaran Terbeza (SP 5.3.3)
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PATHWAYS.map((pw) => (
                <button
                  key={pw.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangePathway(pw.id);
                  }}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    pathway === pw.id
                      ? 'border-[#00C8F0] bg-[#00C8F0]/18'
                      : 'border-[#F4F8FF]/12 bg-[#0A1428]'
                  }`}
                >
                  <span className="font-display text-xs font-bold" style={{ color: pw.color }}>
                    {pw.title}
                  </span>
                  <p className="mt-1 text-[11px] leading-snug text-[#F4F8FF]/70">{pw.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accessibility & Graphics */}
        <div className="mt-4 space-y-2 border-t border-[#F4F8FF]/10 pt-4">
          <button
            type="button"
            onClick={onToggleReducedMotion}
            className="flex w-full items-center justify-between rounded-xl border border-[#F4F8FF]/12 bg-[#0A1428] px-4 py-2.5 text-sm"
          >
            <span>Mod Kurangkan Pergerakan (Aksesibiliti)</span>
            <span className="font-bold text-[#FFB547]">{reducedMotion ? 'Aktif' : 'Biasa'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSimplified3d}
            className="flex w-full items-center justify-between rounded-xl border border-[#F4F8FF]/12 bg-[#0A1428] px-4 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#A5F05A]" />
              <span>Mod Visual Ringkas (Prestasi Tinggi)</span>
            </span>
            <span className="font-bold text-[#A5F05A]">{simplified3d ? 'Aktif' : '3D Penuh'}</span>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onReplayIntro();
            }}
            className="text-xs font-semibold text-[#00C8F0] underline"
          >
            Tonton Semula Intro Sinematik
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#00C8F0] px-5 py-2 text-xs font-bold text-[#101C35]"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

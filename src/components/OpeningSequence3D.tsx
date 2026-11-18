import React, { useEffect } from 'react';
import { AlertTriangle, Info, Play, Settings, SkipForward } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine.ts';

interface OpeningSequence3DProps {
  sceneStep: number; // 1 = NEXUS CITY, 2 = SIGNAL FAILURE, 3 = TITLE REVEAL, 4 = MAIN MENU
  setSceneStep: React.Dispatch<React.SetStateAction<number>>;
  canSkip: boolean;
  onStartGame: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
}

export const OpeningSequence3D: React.FC<OpeningSequence3DProps> = ({
  sceneStep,
  setSceneStep,
  canSkip,
  onStartGame,
  onOpenAbout,
  onOpenSettings,
}) => {
  useEffect(() => {
    if (sceneStep >= 4) return;
    const durations: Record<number, number> = {
      1: 3600,
      2: 4400,
      3: 3000,
    };
    const timer = window.setTimeout(() => {
      setSceneStep((prev) => Math.min(4, prev + 1));
    }, durations[sceneStep] ?? 3200);
    return () => window.clearTimeout(timer);
  }, [sceneStep, setSceneStep]);

  useEffect(() => {
    if (sceneStep === 2) {
      soundEngine.playAlert();
    } else if (sceneStep === 3) {
      soundEngine.playPortalWhoosh();
    }
  }, [sceneStep]);

  const handleInteraction = () => {
    soundEngine.unlockAudio();
    soundEngine.setSceneMusic('menu');
  };

  return (
    <div
      onClick={handleInteraction}
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5 md:p-8"
    >
      {/* Glitch scanline distortion layer during Scene B (Signal Failure) */}
      {sceneStep === 2 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-[repeating-linear-gradient(0deg,rgba(255,181,71,0.06)_0px,rgba(255,181,71,0.06)_2px,transparent_2px,transparent_8px)]"
        />
      )}

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="holo-panel pointer-events-auto flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wider text-[#00C8F0]">
          <span>SISTEM BANDAR NEXUS</span>
          <span aria-hidden="true">·</span>
          <span className={sceneStep === 2 ? 'text-[#FFB547]' : 'text-[#A5F05A]'}>
            {sceneStep === 2 ? 'GANGGUAN ISYARAT DIKESAN' : 'PAUTAN VISUAL AKTIF'}
          </span>
        </div>

        {sceneStep < 4 && (
          <button
            type="button"
            onClick={() => {
              handleInteraction();
              soundEngine.playClick();
              setSceneStep(4);
            }}
            className="holo-panel pointer-events-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#F4F8FF]/90 hover:border-[#00C8F0]"
          >
            <SkipForward className="h-3.5 w-3.5 text-[#00C8F0]" />
            <span>{canSkip ? 'Langkau Intro' : 'Terus ke Menu Utama'}</span>
          </button>
        )}
      </div>

      {/* Center Stage Content */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center">
        {sceneStep === 1 && (
          <div className="holo-panel max-w-xl rounded-2xl px-6 py-5">
            <p className="font-mono-tabular text-xs font-bold tracking-widest text-[#00C8F0]">
              BABAK 01 · KOTA NEXUS
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#F4F8FF] md:text-3xl">
              Kota Komunikasi Masa Hadapan
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#F4F8FF]/85">
              Setiap menara, papan iklan digital, dan stesen maklumat di Kota NEXUS dihubungkan oleh jaringan Bahasa Melayu yang tersusun rapi.
            </p>
          </div>
        )}

        {sceneStep === 2 && (
          <div className="holo-panel max-w-xl rounded-2xl border-[#FFB547]/70 bg-[#180E22]/92 px-6 py-6 shadow-[0_0_50px_rgba(255,181,71,0.28)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFB547]/20 text-[#FFB547]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="mt-3 font-mono-tabular text-xs font-bold tracking-widest text-[#FFB547]">
              AMARAN KECEMASAN · THE LOST SIGNAL
            </p>
            <div className="mt-3 space-y-2 text-base font-bold text-[#F4F8FF] md:text-lg">
              <p>“AMARAN! Sistem komunikasi NEXUS telah terganggu.”</p>
              <p className="text-[#FFB547]">“Semua isyarat komunikasi terputus.”</p>
              <p className="text-[#00C8F0]">“Pasukan WORDOPIA diperlukan segera.”</p>
            </div>
          </div>
        )}

        {sceneStep === 3 && (
          <div className="holo-panel max-w-2xl rounded-3xl border-[#00C8F0]/60 px-8 py-8 shadow-[0_0_70px_rgba(0,200,240,0.3)]">
            <p className="font-mono-tabular text-xs font-bold tracking-[0.28em] text-[#A5F05A]">
              MISI PENYELAMATAN BAHASA MELAYU TAHUN 6
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-[#F4F8FF] md:text-6xl">
              WORDOPIA
            </h1>
            <p className="mt-1 font-display text-lg font-bold tracking-[0.22em] text-[#00C8F0] md:text-2xl">
              THE LOST SIGNAL
            </p>
            <p className="mt-3 text-base font-semibold text-[#FFB547]">
              “Jejak Isyarat, Pulihkan Komunikasi.”
            </p>
          </div>
        )}

        {sceneStep === 4 && (
          <div className="holo-panel pointer-events-auto w-full max-w-md rounded-3xl border-[#00C8F0]/50 p-7 shadow-[0_24px_70px_rgba(6,14,31,0.85)]">
            <p className="font-mono-tabular text-[11px] font-bold tracking-[0.25em] text-[#00C8F0]">
              PENGEMBARAAN 3D KOTA NEXUS
            </p>
            <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-[#F4F8FF]">
              WORDOPIA
            </h1>
            <p className="font-display text-sm font-bold tracking-[0.22em] text-[#FFB547]">
              THE LOST SIGNAL
            </p>
            <p className="mt-2 text-xs text-[#F4F8FF]/75">
              “Jejak Isyarat, Pulihkan Komunikasi.”
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  handleInteraction();
                  soundEngine.playPortalWhoosh();
                  onStartGame();
                }}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] py-3.5 font-display text-base font-extrabold text-[#101C35] shadow-[0_0_28px_rgba(0,200,240,0.4)] transition-transform hover:scale-[1.01]"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>MULA PERMAINAN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInteraction();
                  soundEngine.playClick();
                  onOpenAbout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#00C8F0]/40 bg-[#0A1428]/90 py-3 text-sm font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
              >
                <Info className="h-4 w-4 text-[#00C8F0]" />
                <span>TENTANG WORDOPIA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInteraction();
                  soundEngine.playClick();
                  onOpenSettings();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#F4F8FF]/18 bg-[#0A1428]/85 py-3 text-sm font-bold text-[#F4F8FF]/90 hover:border-[#FFB547]"
              >
                <Settings className="h-4 w-4 text-[#FFB547]" />
                <span>TETAPAN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Cue */}
      <div className="relative z-10 flex items-center justify-center">
        {sceneStep < 4 ? (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  handleInteraction();
                  setSceneStep(step);
                }}
                aria-label={`Babak ${step}`}
                className={`pointer-events-auto h-2 rounded-full transition-all ${
                  sceneStep === step ? 'w-8 bg-[#00C8F0]' : 'w-2.5 bg-[#F4F8FF]/30'
                }`}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] font-medium text-[#F4F8FF]/60">
            Bahasa Melayu Tahun 6 · Standard Pembelajaran 5.3.3 (Ayat Aktif & Ayat Pasif)
          </p>
        )}
      </div>
    </div>
  );
};

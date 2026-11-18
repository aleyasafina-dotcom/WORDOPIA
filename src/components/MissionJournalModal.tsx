import React from 'react';
import { BookOpen, CheckCircle2, Compass, Globe, Sparkles, X } from 'lucide-react';
import { MISSIONS_CATALOG } from '../data/missions.ts';
import type { MissionWorldId, PlayerState } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface MissionJournalModalProps {
  state: PlayerState;
  activeWorldId: MissionWorldId;
  onSwitchWorld: (worldId: MissionWorldId) => void;
  onClose: () => void;
}

export const MissionJournalModal: React.FC<MissionJournalModalProps> = ({
  state,
  activeWorldId,
  onSwitchWorld,
  onClose,
}) => {
  const { user, missions } = state;
  const missionMap = new Map(missions.map((m) => [m.missionId, m]));
  const completedCount = missions.filter((m) => m.status === 'selesai').length;
  const collectedFragments = user.collectedFragments ?? [];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060E1F]/80 p-4">
      <div className="holo-panel relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl p-6">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          aria-label="Tutup Jurnal Misi"
          className="absolute right-5 top-5 rounded-xl border border-[#F4F8FF]/15 p-2 text-[#F4F8FF]/75 hover:text-[#F4F8FF]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00C8F0]/40 bg-[#00C8F0]/15 text-[#00C8F0]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono-tabular text-[11px] font-bold tracking-widest text-[#00C8F0]">
                JURNAL MISI PENGEMBARA
              </p>
              <h2 className="font-display text-2xl font-extrabold text-[#F4F8FF]">
                Peta 5 Dunia & Kemajuan Bahasa
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#A5F05A]/40 bg-[#0A1428] px-3.5 py-2 text-right">
              <p className="text-[10px] text-[#F4F8FF]/70">Operasi Selesai</p>
              <p className="font-mono-tabular text-sm font-extrabold text-[#A5F05A]">
                {completedCount} / 5 Dunia
              </p>
            </div>
            <div className="rounded-xl border border-[#FFB547]/40 bg-[#0A1428] px-3.5 py-2 text-right">
              <p className="text-[10px] text-[#F4F8FF]/70">Serpihan Terkumpul</p>
              <p className="font-mono-tabular text-sm font-extrabold text-[#FFB547]">
                {collectedFragments.length} Serpihan
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#F4F8FF]/80">
          Anda bebas menjelajah dan melawat mana-mana daripada lima dunia WORDOPIA pada bila-bila masa. Untuk pengesahan rasmi dan lencana operasi, selesaikan cabaran mengikut turutan Misi 01 hingga Misi 05.
        </p>

        {/* Collected Fragments Strip */}
        {collectedFragments.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#00C8F0]/25 bg-[#0A1428] p-3.5">
            <p className="text-[11px] font-bold text-[#00C8F0]">
              Serpihan & Artifak Isyarat Yang Berjaya Dikumpul:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {collectedFragments.map((frag) => (
                <span
                  key={frag}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#A5F05A]/35 bg-[#A5F05A]/12 px-2.5 py-1 text-[11px] font-semibold text-[#A5F05A]"
                >
                  <Sparkles className="h-3 w-3" />
                  {frag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5 World Cards */}
        <div className="mt-5 space-y-3">
          {MISSIONS_CATALOG.map((meta) => {
            const prog = missionMap.get(meta.id);
            const status = prog?.status ?? 'belum_dibuka';
            const solvedCount = user.completedChallenges?.[String(meta.id)]?.length ?? 0;
            const stats = user.challengeStats?.[String(meta.id)];
            const isCurrentWorld = activeWorldId === meta.id;

            const prevMissionDone =
              meta.id === 1 || missionMap.get(meta.id - 1)?.status === 'selesai';

            const statusLabel =
              status === 'selesai'
                ? 'Selesai'
                : status === 'sedang_dilaksanakan' || solvedCount > 0
                ? 'Sedang Dijalankan'
                : 'Belum Bermula';

            const statusColor =
              status === 'selesai'
                ? '#A5F05A'
                : status === 'sedang_dilaksanakan' || solvedCount > 0
                ? '#00C8F0'
                : '#FFB547';

            return (
              <div
                key={meta.id}
                className="rounded-2xl border bg-[#0A1428] p-4 transition-colors"
                style={{
                  borderColor: isCurrentWorld ? meta.accentColor : 'rgba(244,248,255,0.12)',
                }}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-mono-tabular text-xs font-extrabold"
                        style={{ color: meta.accentColor }}
                      >
                        {meta.code} · {meta.worldName}
                      </span>
                      <span
                        className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                        }}
                      >
                        {statusLabel}
                      </span>
                      {isCurrentWorld && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#00C8F0]/20 px-2 py-0.5 text-[10px] font-bold text-[#00C8F0]">
                          <Compass className="h-3 w-3" />
                          Lokasi Semasa
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 font-display text-base font-extrabold text-[#F4F8FF]">
                      {meta.title} — <span className="text-[#F4F8FF]/75">{meta.worldSubtitle}</span>
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#F4F8FF]/75">
                      {meta.objective}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px]">
                      <span className="font-mono-tabular font-bold text-[#A5F05A]">
                        Kemajuan Cabaran: {Math.min(solvedCount, meta.maxChallenges)}/{meta.maxChallenges}
                      </span>
                      <span className="text-[#FFB547]">
                        Ganjaran: +{meta.xpReward} XP · {meta.badgeTitle}
                      </span>
                      {stats && (stats.correctAttempts > 0 || stats.incorrectAttempts > 0) && (
                        <span className="font-mono-tabular text-[#F4F8FF]/65">
                          Rekod: {stats.correctAttempts} Betul · {stats.incorrectAttempts} Cuba Semula
                        </span>
                      )}
                    </div>

                    {!prevMissionDone && status !== 'selesai' && (
                      <p className="mt-2 text-[11px] font-medium text-[#FFB547]">
                        Nota Turutan: Anda boleh meneroka dunia ini sekarang. Selesaikan Misi 0{meta.id - 1} terlebih dahulu untuk mengesahkan lencana operasi ini.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {status === 'selesai' && (
                      <CheckCircle2 className="h-5 w-5 text-[#A5F05A]" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onSwitchWorld(meta.id);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold text-[#101C35] transition-transform hover:scale-[1.02]"
                      style={{
                        backgroundColor: isCurrentWorld ? '#A5F05A' : meta.accentColor,
                      }}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{isCurrentWorld ? 'Kekal di Dunia Ini' : 'Terokai Dunia Ini'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Film,
  Printer,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { BADGE_CATALOG, MISSIONS_CATALOG, getHeroById } from '../data/missions.ts';
import type { PlayerState } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface DutaBahasaCeremonyProps {
  state: PlayerState;
  onBack: () => void;
}

function formatMalayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Sedang dikemas kini';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Sedang dikemas kini';
  return d.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const DutaBahasaCeremony: React.FC<DutaBahasaCeremonyProps> = ({ state, onBack }) => {
  const { user, missions, videoSubmission, scriptSubmission } = state;
  const hero = getHeroById(user.selectedHero);
  const [showDetailed, setShowDetailed] = useState(false);

  const completedMissionsCount = missions.filter((m) => m.status === 'selesai').length;
  const missionScores = missions.filter((m) => m.status === 'selesai' && m.score > 0);
  const avgMissionScore =
    missionScores.length > 0
      ? missionScores.reduce((sum, m) => sum + m.score, 0) / 5
      : 0;

  let totalCorrect = 0;
  let totalIncorrect = 0;
  Object.values(user.challengeStats ?? {}).forEach((st) => {
    totalCorrect += st.correctAttempts ?? 0;
    totalIncorrect += st.incorrectAttempts ?? 0;
  });

  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracyPct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 100;

  const hasVideo = Boolean(videoSubmission && videoSubmission.videoUrl);
  const totalRubric = videoSubmission
    ? videoSubmission.rubricKandungan +
      videoSubmission.rubricTatabahasa +
      videoSubmission.rubricKreativiti +
      videoSubmission.rubricPenyampaian
    : 0;

  // Real calculated final score combining mission performance (80%) & challenge accuracy (20%)
  const finalScore = Math.min(
    100,
    Math.round(avgMissionScore * 0.8 + (completedMissionsCount > 0 ? accuracyPct * 0.2 : 0))
  );

  const m5 = missions.find((m) => m.missionId === 5);
  const completionDate = formatMalayDate(m5?.completedAt ?? videoSubmission?.updatedAt ?? null);

  return (
    <div className="relative z-10 flex h-full w-full flex-col gap-6 overflow-y-auto bg-[#060E1F]/80 p-4 md:p-8">
      {/* Top Bar */}
      <div className="no-print mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="flex items-center gap-2 rounded-xl border border-[#00C8F0]/40 bg-[#101C35]/95 px-4 py-2.5 text-sm font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
        >
          <ArrowLeft className="h-4 w-4 text-[#00C8F0]" />
          <span>Kembali ke Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowDetailed((v) => !v);
            }}
            className="flex items-center gap-2 rounded-xl border border-[#A5F05A]/45 bg-[#101C35]/95 px-4 py-2.5 text-sm font-bold text-[#A5F05A] hover:bg-[#A5F05A]/15"
          >
            {showDetailed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Lihat Keputusan Terperinci</span>
          </button>

          {hasVideo && (
            <a
              href={videoSubmission!.videoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => soundEngine.playClick()}
              className="flex items-center gap-2 rounded-xl border border-[#00C8F0]/50 bg-[#00C8F0]/15 px-4 py-2.5 text-sm font-bold text-[#00C8F0] hover:bg-[#00C8F0]/25"
            >
              <Film className="h-4 w-4" />
              <span>Lihat Video Saya</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              window.print();
            }}
            className="flex items-center gap-2 rounded-xl bg-[#FFB547] px-5 py-2.5 text-sm font-extrabold text-[#101C35]"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Sijil</span>
          </button>
        </div>
      </div>

      {/* Main Final Score Summary Dashboard */}
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="holo-panel rounded-3xl border-2 border-[#FFB547]/65 p-6 shadow-[0_0_55px_rgba(255,181,71,0.2)] md:p-8 print:border-slate-300 print:bg-white print:text-[#101C35] print:shadow-none">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-xl font-extrabold text-[#F4F8FF]"
                style={{
                  borderColor: hero.secondaryColor,
                  backgroundColor: `${hero.secondaryColor}28`,
                }}
              >
                {hero.name.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#00C8F0]">
                  <Trophy className="h-4 w-4 text-[#FFB547]" />
                  <span>PAPAN SKOR AKHIR · DUTA BAHASA WORDOPIA</span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-[#F4F8FF] md:text-3xl print:text-[#101C35]">
                  {user.name}
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-[#F4F8FF]/75 print:text-slate-600">
                  Watak Terpilih: <strong style={{ color: hero.secondaryColor }}>{hero.name}</strong> ({hero.roleTitle}) · Kelas {user.className}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[#FFB547]/45 bg-[#0A1428] px-5 py-3.5 print:border-slate-300 print:bg-slate-50">
              <div className="text-right">
                <p className="text-[11px] font-bold text-[#F4F8FF]/70 print:text-slate-600">Skor Akhir</p>
                <p className="font-mono-tabular text-3xl font-extrabold text-[#FFB547]">
                  {finalScore}%
                </p>
              </div>
              <div className="h-10 w-px bg-[#F4F8FF]/15" />
              <div className="text-right">
                <p className="text-[11px] font-bold text-[#F4F8FF]/70 print:text-slate-600">Jumlah XP</p>
                <p className="font-mono-tabular text-2xl font-extrabold text-[#A5F05A]">
                  {user.xp} XP
                </p>
              </div>
            </div>
          </div>

          {/* Real Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#00C8F0]/25 bg-[#0A1428] p-3.5">
              <p className="text-[11px] font-semibold text-[#F4F8FF]/70">Status Misi 1–5</p>
              <p className="mt-1 font-mono-tabular text-lg font-extrabold text-[#00C8F0]">
                {completedMissionsCount} / 5 Selesai
              </p>
            </div>
            <div className="rounded-2xl border border-[#A5F05A]/25 bg-[#0A1428] p-3.5">
              <p className="text-[11px] font-semibold text-[#F4F8FF]/70">Jawapan Tepat</p>
              <p className="mt-1 font-mono-tabular text-lg font-extrabold text-[#A5F05A]">
                {totalCorrect} Betul · {accuracyPct}%
              </p>
            </div>
            <div className="rounded-2xl border border-[#FFB547]/25 bg-[#0A1428] p-3.5">
              <p className="text-[11px] font-semibold text-[#F4F8FF]/70">Percubaan Salah</p>
              <p className="mt-1 font-mono-tabular text-lg font-extrabold text-[#FFB547]">
                {totalIncorrect} Kali
              </p>
            </div>
            <div className="rounded-2xl border border-[#7B61FF]/35 bg-[#0A1428] p-3.5">
              <p className="text-[11px] font-semibold text-[#F4F8FF]/70">Tarikh Tamat</p>
              <p className="mt-1 text-xs font-extrabold text-[#F4F8FF]">{completionDate}</p>
            </div>
          </div>

          {/* 5 Mission Status Strip */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            {MISSIONS_CATALOG.map((meta) => {
              const prog = missions.find((m) => m.missionId === meta.id);
              const done = prog?.status === 'selesai';
              return (
                <div
                  key={meta.id}
                  className="rounded-xl border p-3 text-left"
                  style={{
                    borderColor: done ? `${meta.accentColor}75` : 'rgba(244,248,255,0.12)',
                    backgroundColor: done ? `${meta.accentColor}12` : '#0A1428',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-[11px] font-extrabold" style={{ color: meta.accentColor }}>
                      M{meta.id}
                    </span>
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#A5F05A]" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-[#FFB547]" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#F4F8FF]">{meta.worldName}</p>
                  <p className="mt-0.5 text-[11px] text-[#F4F8FF]/70">
                    {done ? `Selesai · ${prog?.score ?? 100}%` : 'Belum Selesai'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Video Submission & Badges */}
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#F4F8FF]/12 bg-[#0A1428] p-4">
              <p className="text-xs font-bold text-[#00C8F0]">Status Video Mesej Digital</p>
              <p className="mt-1 text-sm font-bold text-[#F4F8FF]">
                {videoSubmission?.status === 'disahkan'
                  ? 'Disahkan Guru — Duta Bahasa Rasmi'
                  : videoSubmission?.status === 'menunggu_semakan'
                  ? 'Dihantar (Menunggu Semakan Guru)'
                  : 'Belum Dihantar'}
              </p>
              {hasVideo && (
                <p className="mt-1 text-xs text-[#F4F8FF]/70">
                  Alat: {videoSubmission?.tool} · Tajuk Skrip: {scriptSubmission?.title || 'Mesej Duta Bahasa'}
                </p>
              )}
              {totalRubric > 0 && (
                <p className="mt-1 text-xs font-semibold text-[#A5F05A]">
                  Markah Rubrik Guru: {totalRubric}/100
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#F4F8FF]/12 bg-[#0A1428] p-4">
              <p className="text-xs font-bold text-[#FFB547]">
                Lencana Diperoleh ({user.badges.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.badges.map((bId) => (
                  <span
                    key={bId}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#FFB547]/35 bg-[#FFB547]/12 px-2.5 py-1 text-[11px] font-semibold text-[#F4F8FF]"
                  >
                    <Award className="h-3 w-3 text-[#FFB547]" />
                    {BADGE_CATALOG[bId]?.title ?? bId}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Expandable Detailed Breakdown */}
          {showDetailed && (
            <div className="mt-5 rounded-2xl border border-[#A5F05A]/40 bg-[#0A1428] p-4">
              <h3 className="font-display text-sm font-extrabold text-[#A5F05A]">
                Keputusan Terperinci Setiap Operasi & Statistik Cabaran
              </h3>
              <div className="mt-3 space-y-2">
                {MISSIONS_CATALOG.map((meta) => {
                  const prog = missions.find((m) => m.missionId === meta.id);
                  const stat = user.challengeStats?.[String(meta.id)];
                  return (
                    <div
                      key={meta.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F4F8FF]/10 bg-[#101C35] px-4 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold" style={{ color: meta.accentColor }}>
                          {meta.code} · {meta.worldName}
                        </span>
                        <p className="text-[11px] text-[#F4F8FF]/70">{meta.objective}</p>
                      </div>
                      <div className="flex items-center gap-4 font-mono-tabular">
                        <span className="text-[#A5F05A]">
                          Betul: {stat?.correctAttempts ?? (prog?.status === 'selesai' ? meta.maxChallenges : 0)}
                        </span>
                        <span className="text-[#FFB547]">
                          Salah: {stat?.incorrectAttempts ?? 0}
                        </span>
                        <span className="font-extrabold text-[#F4F8FF]">
                          Skor: {prog?.score ?? 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Printable Official Certificate Card */}
        <div className="rounded-3xl border-2 border-[#FFB547] bg-[#101C35]/95 p-6 text-center shadow-[0_0_50px_rgba(255,181,71,0.25)] md:p-8 print:border-4 print:bg-white print:text-[#101C35] print:shadow-none">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#FFB547]">
            <img
              src="/src/assets/images/wordopia_emblem_1794837972677.jpg"
              alt="Mohor Rasmi WORDOPIA"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>

          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-bold tracking-widest text-[#00C8F0] print:text-[#0284C7]">
            <Sparkles className="h-4 w-4 text-[#FFB547]" />
            <span>SIJIL PENGIKTIRAFAN RASMI WORDOPIA: THE LOST SIGNAL</span>
            <Sparkles className="h-4 w-4 text-[#FFB547]" />
          </p>

          <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#FFB547] md:text-3xl print:text-[#B45309]">
            DUTA BAHASA WORDOPIA
          </h2>

          <p className="mt-3 text-sm text-[#F4F8FF]/85 print:text-slate-700">
            Tahniah <strong>{user.name}</strong> ({user.className})! Anda telah berjaya menamatkan pengembaraan bahasa Tahun 6 (SP 5.3.3: Ayat Aktif & Ayat Pasif) dengan skor keseluruhan{' '}
            <strong>{finalScore}%</strong> dan pencapaian <strong>{user.xp} XP</strong>.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#F4F8FF]/15 pt-4 text-xs text-[#F4F8FF]/70 print:border-slate-300 print:text-slate-600">
            <span>“Pulihkan Dunia, Satu Ayat pada Satu Masa.”</span>
            <span>Tarikh: {completionDate} · Disahkan oleh NOVA & Guru Pembimbing</span>
          </div>
        </div>
      </div>
    </div>
  );
};

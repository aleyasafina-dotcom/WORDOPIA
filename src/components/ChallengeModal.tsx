import React, { useState } from 'react';
import {
  CheckCircle2,
  Compass,
  HelpCircle,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import {
  MISSIONS_CATALOG,
  MISSION_1_CLUES,
  MISSION_2_TASKS,
  MISSION_3_SCENARIOS,
} from '../data/missions.ts';
import type { MissionWorldId, PlayerState, WorldInteractable } from '../types/game.ts';
import { api } from '../utils/apiClient.ts';
import { soundEngine } from '../utils/soundEngine.ts';
import { Mission4BinaMesej } from './missions/Mission4BinaMesej.tsx';
import { Mission5Penyelamatan } from './missions/Mission5Penyelamatan.tsx';

interface ChallengeModalProps {
  interactable: WorldInteractable;
  playerState: PlayerState;
  onChallengeSolved: (
    missionId: number,
    challengeId: string,
    notes: string
  ) => Promise<{ missionCompleted: boolean; nextWorldId: MissionWorldId | null } | void>;
  onAttemptLogged?: (updatedState: PlayerState) => void;
  onSwitchWorld?: (worldId: MissionWorldId) => void;
  onActivateTeleport?: (nextWorldId: MissionWorldId) => void;
  onScriptSubmitted: (xpEarned: number, message: string) => Promise<void>;
  onVideoSubmitted: (xpEarned: number, message: string) => Promise<void>;
  onOpenCeremony: () => void;
  onClose: () => void;
}

const SPARKLE_OFFSETS = [
  { tx: '-54px', ty: '-38px', delay: '0ms', color: '#A5F05A' },
  { tx: '48px', ty: '-42px', delay: '70ms', color: '#00C8F0' },
  { tx: '-28px', ty: '-58px', delay: '140ms', color: '#FFB547' },
  { tx: '22px', ty: '-54px', delay: '210ms', color: '#A5F05A' },
  { tx: '-68px', ty: '-14px', delay: '110ms', color: '#00C8F0' },
  { tx: '66px', ty: '-18px', delay: '170ms', color: '#FFB547' },
];

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  interactable,
  playerState,
  onChallengeSolved,
  onAttemptLogged,
  onSwitchWorld,
  onActivateTeleport,
  onScriptSubmitted,
  onVideoSubmitted,
  onOpenCeremony,
  onClose,
}) => {
  const pathway = playerState.user.pathway;
  const solvedList =
    playerState.user.completedChallenges?.[String(interactable.missionId)] ?? [];
  const alreadySolved = interactable.challengeId
    ? solvedList.includes(interactable.challengeId)
    : false;

  const prevMissionDone =
    interactable.missionId <= 1 ||
    playerState.missions.find((m) => m.missionId === interactable.missionId - 1)?.status ===
      'selesai';

  const prevMeta =
    interactable.missionId > 1
      ? MISSIONS_CATALOG.find((m) => m.id === interactable.missionId - 1)
      : null;

  const [showHint, setShowHint] = useState(pathway === 'sokongan');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [completedNextWorldId, setCompletedNextWorldId] = useState<MissionWorldId | null>(null);

  // Mission 02 states
  const [pickedWords, setPickedWords] = useState<number[]>([]);
  // Mission 03 states
  const [selectedSentenceIdx, setSelectedSentenceIdx] = useState<number | null>(null);
  const [selectedReasonIdx, setSelectedReasonIdx] = useState<number | null>(null);

  const logIncorrectAttempt = async (challengeId: string) => {
    try {
      const res = await api.completeChallenge(interactable.missionId, challengeId, false);
      onAttemptLogged?.(res.state);
    } catch {
      // Non-blocking stats log
    }
  };

  if (interactable.missionId === 4) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#060E1F]/80 p-3 md:p-6">
        <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#7B61FF]/50 bg-[#0A1428]">
          {!prevMissionDone && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FFB547]/35 bg-[#FFB547]/15 px-5 py-2.5 text-xs text-[#FFB547]">
              <span>
                Penerokaan Bebas: Anda boleh menyediakan draf skrip, namun selesaikan{' '}
                <strong>{prevMeta?.code} ({prevMeta?.worldName})</strong> terlebih dahulu untuk menghantar secara rasmi.
              </span>
              {onSwitchWorld && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onSwitchWorld(3);
                    onClose();
                  }}
                  className="rounded-lg bg-[#FFB547] px-3 py-1 font-extrabold text-[#101C35]"
                >
                  Ke {prevMeta?.worldName}
                </button>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1">
            <Mission4BinaMesej
              pathway={pathway}
              existingScript={playerState.scriptSubmission}
              onSubmitted={onScriptSubmitted}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    );
  }

  if (interactable.missionId === 5) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#060E1F]/80 p-3 md:p-6">
        <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#FFB547]/50 bg-[#0A1428]">
          {!prevMissionDone && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FFB547]/35 bg-[#FFB547]/15 px-5 py-2.5 text-xs text-[#FFB547]">
              <span>
                Penerokaan Bebas: Anda boleh meninjau Menara Langit, namun selesaikan{' '}
                <strong>{prevMeta?.code} ({prevMeta?.worldName})</strong> terlebih dahulu untuk penghantaran rasmi.
              </span>
              {onSwitchWorld && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onSwitchWorld(4);
                    onClose();
                  }}
                  className="rounded-lg bg-[#FFB547] px-3 py-1 font-extrabold text-[#101C35]"
                >
                  Ke {prevMeta?.worldName}
                </button>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1">
            <Mission5Penyelamatan
              scriptSubmission={playerState.scriptSubmission}
              existingVideo={playerState.videoSubmission}
              isDutaBahasa={playerState.user.isDutaBahasa}
              onSubmitted={onVideoSubmitted}
              onOpenCeremony={onOpenCeremony}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    );
  }

  const clue =
    interactable.missionId === 1
      ? MISSION_1_CLUES.find((c) => c.id === interactable.challengeId) ?? MISSION_1_CLUES[0]
      : null;

  const m2Task =
    interactable.missionId === 2
      ? MISSION_2_TASKS.find((t) => t.id === interactable.challengeId) ?? MISSION_2_TASKS[0]
      : null;

  const m3Scenario =
    interactable.missionId === 3
      ? MISSION_3_SCENARIOS.find((s) => s.id === interactable.challengeId) ?? MISSION_3_SCENARIOS[0]
      : null;

  const markSolved = async (challengeId: string, explanation: string) => {
    setSaving(true);
    soundEngine.playSuccess();
    window.setTimeout(() => soundEngine.playXpReward(), 220);
    setFeedback({ ok: true, text: explanation });
    try {
      const result = await onChallengeSolved(interactable.missionId, challengeId, explanation);
      if (result && result.missionCompleted && result.nextWorldId) {
        setCompletedNextWorldId(result.nextWorldId);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handlers per mission
  const handleMission1Answer = async (choice: 'aktif' | 'pasif') => {
    if (!clue || saving || !prevMissionDone) return;
    if (choice === clue.correctType) {
      await markSolved(clue.id, clue.explanation);
    } else {
      soundEngine.playIncorrect();
      setFeedback({ ok: false, text: `Kurang tepat! ${clue.hintSokongan}` });
      void logIncorrectAttempt(clue.id);
    }
  };

  const handleMission2ArrangeCheck = async () => {
    if (!m2Task || m2Task.mode !== 'susun' || saving || !prevMissionDone) return;
    const built = pickedWords.map((i) => m2Task.words[i]).join(' ');
    if (built.trim() === m2Task.correctSentence.trim()) {
      await markSolved(m2Task.id, m2Task.explanation);
    } else {
      soundEngine.playIncorrect();
      setFeedback({ ok: false, text: `Susunan belum tepat. Petunjuk: ${m2Task.hint}` });
      void logIncorrectAttempt(m2Task.id);
    }
  };

  const handleMission2TransformPick = async (optIdx: number) => {
    if (!m2Task || m2Task.mode !== 'tukar' || saving || !prevMissionDone) return;
    if (optIdx === m2Task.correctOptionIndex) {
      await markSolved(m2Task.id, m2Task.explanation);
    } else {
      soundEngine.playIncorrect();
      setFeedback({ ok: false, text: `Belum tepat! ${m2Task.hint}` });
      void logIncorrectAttempt(m2Task.id);
    }
  };

  const handleMission3Check = async () => {
    if (!m3Scenario || selectedSentenceIdx === null || selectedReasonIdx === null || saving || !prevMissionDone)
      return;
    const sentenceOk = m3Scenario.sentenceChoices[selectedSentenceIdx]?.isBest;
    const reasonOk = m3Scenario.reasonChoices[selectedReasonIdx]?.isCorrect;
    if (sentenceOk && reasonOk) {
      await markSolved(m3Scenario.id, m3Scenario.explanation);
    } else {
      soundEngine.playIncorrect();
      setFeedback({
        ok: false,
        text: `Semak semula pilihan ayat atau alasan kamu. ${m3Scenario.roboTip}`,
      });
      void logIncorrectAttempt(m3Scenario.id);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#060E1F]/80 p-4">
      <div className="holo-panel relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          aria-label="Tutup terminal"
          className="absolute right-5 top-5 rounded-xl border border-[#F4F8FF]/15 p-2 text-[#F4F8FF]/75 hover:text-[#F4F8FF]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-[#00C8F0]">
          {interactable.kind === 'npc' ? (
            <MessageSquare className="h-4 w-4 text-[#FFB547]" />
          ) : (
            <Terminal className="h-4 w-4 text-[#00C8F0]" />
          )}
          <span>{interactable.subtitle}</span>
          {alreadySolved && (
            <span className="ml-2 inline-flex items-center gap-1 text-[#A5F05A]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Selesai
            </span>
          )}
        </div>

        <h2 className="mt-1 font-display text-xl font-extrabold text-[#F4F8FF]">
          {interactable.label}
        </h2>

        {/* Friendly non-padlock sequential guidance when exploring ahead */}
        {!prevMissionDone && prevMeta && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FFB547]/45 bg-[#FFB547]/12 p-3.5 text-xs text-[#FFB547]">
            <div className="flex items-start gap-2">
              <Compass className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Penerokaan Bebas:</strong> Anda boleh melihat cabaran ini, namun selesaikan{' '}
                <strong>{prevMeta.code} ({prevMeta.worldName})</strong> terlebih dahulu untuk mengesahkan jawapan rasmi.
              </span>
            </div>
            {onSwitchWorld && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSwitchWorld(prevMeta.id);
                  onClose();
                }}
                className="rounded-xl bg-[#FFB547] px-3 py-1.5 font-extrabold text-[#101C35]"
              >
                Pergi ke {prevMeta.worldName}
              </button>
            )}
          </div>
        )}

        {/* MISSION 01: JEJAK BAHASA */}
        {clue && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-[#00C8F0]/35 bg-[#0A1428] p-4">
              <p className="text-xs font-semibold text-[#00C8F0]">
                Isyarat Bahasa yang Dikesan:
              </p>
              <p className="mt-2 font-display text-lg font-bold text-[#F4F8FF]">
                “{clue.sentence}”
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={saving || !prevMissionDone}
                onClick={() => handleMission1Answer('aktif')}
                className="rounded-2xl border border-[#00C8F0]/50 bg-[#0A1428] py-4 font-display text-base font-extrabold text-[#00C8F0] hover:bg-[#00C8F0] hover:text-[#101C35] disabled:opacity-45"
              >
                AYAT AKTIF
              </button>
              <button
                type="button"
                disabled={saving || !prevMissionDone}
                onClick={() => handleMission1Answer('pasif')}
                className="rounded-2xl border border-[#7B61FF]/55 bg-[#0A1428] py-4 font-display text-base font-extrabold text-[#C4B5FD] hover:bg-[#7B61FF] hover:text-[#F4F8FF] disabled:opacity-45"
              >
                AYAT PASIF
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#FFB547]"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{showHint ? 'Sembunyikan Petunjuk ROBO' : 'Lihat Petunjuk ROBO'}</span>
            </button>

            {showHint && (
              <div className="rounded-xl border border-[#FFB547]/40 bg-[#FFB547]/10 p-3 text-xs text-[#F4F8FF]/90">
                {clue.hintSokongan}
              </div>
            )}
          </div>
        )}

        {/* MISSION 02: BAIKI SISTEM */}
        {m2Task && (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-semibold text-[#A5F05A]">{m2Task.prompt}</p>

            {m2Task.mode === 'susun' ? (
              <>
                <div className="min-h-[60px] rounded-2xl border border-[#00C8F0]/40 bg-[#0A1428] p-3">
                  {pickedWords.length === 0 ? (
                    <span className="text-xs text-[#F4F8FF]/50">
                      Klik kad kata di bawah mengikut susunan ayat yang betul...
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pickedWords.map((wordIdx, pos) => (
                        <button
                          key={`${wordIdx}-${pos}`}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setPickedWords((prev) => prev.filter((_, i) => i !== pos));
                          }}
                          className="rounded-xl border border-[#A5F05A] bg-[#A5F05A]/15 px-3 py-1.5 text-sm font-bold text-[#F4F8FF]"
                        >
                          {m2Task.words[wordIdx]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {m2Task.words.map((word, idx) => {
                    const used = pickedWords.includes(idx);
                    return (
                      <button
                        key={word + idx}
                        type="button"
                        disabled={used || !prevMissionDone}
                        onClick={() => {
                          soundEngine.playClick();
                          setPickedWords((prev) => [...prev, idx]);
                        }}
                        className={`rounded-xl border px-3.5 py-2 text-sm font-bold ${
                          used || !prevMissionDone
                            ? 'border-[#F4F8FF]/10 bg-[#0A1428]/40 text-[#F4F8FF]/30'
                            : 'border-[#00C8F0]/50 bg-[#0A1428] text-[#00C8F0] hover:border-[#A5F05A]'
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!prevMissionDone}
                    onClick={() => setPickedWords([])}
                    className="flex items-center gap-1.5 rounded-xl border border-[#F4F8FF]/20 px-4 py-2.5 text-xs font-bold text-[#F4F8FF] disabled:opacity-45"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Susun Semula</span>
                  </button>
                  <button
                    type="button"
                    disabled={pickedWords.length < m2Task.words.length || saving || !prevMissionDone}
                    onClick={handleMission2ArrangeCheck}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] py-2.5 text-sm font-extrabold text-[#101C35] disabled:opacity-45"
                  >
                    Semak & Baiki Terminal
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-[#00C8F0]/35 bg-[#0A1428] p-4">
                  <p className="text-[11px] font-bold text-[#00C8F0]">AYAT ASAL:</p>
                  <p className="mt-1 font-display text-base font-bold text-[#F4F8FF]">
                    “{m2Task.sourceSentence}”
                  </p>
                </div>
                <div className="space-y-2">
                  {m2Task.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={saving || !prevMissionDone}
                      onClick={() => handleMission2TransformPick(idx)}
                      className="w-full rounded-xl border border-[#F4F8FF]/15 bg-[#0A1428] p-3 text-left text-sm font-medium text-[#F4F8FF] hover:border-[#A5F05A] disabled:opacity-45"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#FFB547]"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{showHint ? 'Sembunyikan Petunjuk' : 'Buka Petunjuk ROBO'}</span>
            </button>
            {showHint && (
              <div className="rounded-xl border border-[#FFB547]/40 bg-[#FFB547]/10 p-3 text-xs text-[#F4F8FF]/90">
                {m2Task.hint}
              </div>
            )}
          </div>
        )}

        {/* MISSION 03: PILIHAN TEPAT (NPC DIALOGUE) */}
        {m3Scenario && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-[#FFB547]/40 bg-[#0A1428] p-4">
              <p className="text-xs font-bold text-[#FFB547]">
                Situasi Warga NEXUS · {m3Scenario.characterName}
              </p>
              <p className="mt-1 text-sm text-[#F4F8FF]">{m3Scenario.situation}</p>
              <p className="mt-1.5 text-xs text-[#00C8F0]">Fokus: {m3Scenario.contextFocus}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-[#00C8F0]">1. Pilih Ayat Terbaik:</p>
              <div className="mt-2 space-y-2">
                {m3Scenario.sentenceChoices.map((sc, idx) => (
                  <button
                    key={sc.text}
                    type="button"
                    disabled={!prevMissionDone}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedSentenceIdx(idx);
                    }}
                    className={`w-full rounded-xl border p-3 text-left text-sm disabled:opacity-45 ${
                      selectedSentenceIdx === idx
                        ? 'border-[#00C8F0] bg-[#00C8F0]/18 text-[#F4F8FF]'
                        : 'border-[#F4F8FF]/15 bg-[#0A1428] text-[#F4F8FF]/85'
                    }`}
                  >
                    {sc.text}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#A5F05A]">2. Pilih Sebab Pemilihan Ayat:</p>
              <div className="mt-2 space-y-2">
                {m3Scenario.reasonChoices.map((rc, idx) => (
                  <button
                    key={rc.text}
                    type="button"
                    disabled={!prevMissionDone}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedReasonIdx(idx);
                    }}
                    className={`w-full rounded-xl border p-3 text-left text-xs disabled:opacity-45 ${
                      selectedReasonIdx === idx
                        ? 'border-[#A5F05A] bg-[#A5F05A]/18 text-[#F4F8FF]'
                        : 'border-[#F4F8FF]/15 bg-[#0A1428] text-[#F4F8FF]/85'
                    }`}
                  >
                    {rc.text}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={selectedSentenceIdx === null || selectedReasonIdx === null || saving || !prevMissionDone}
              onClick={handleMission3Check}
              className="w-full rounded-xl bg-gradient-to-r from-[#FFB547] to-[#A5F05A] py-3 text-sm font-extrabold text-[#101C35] disabled:opacity-45"
            >
              Sahkan Cadangan Kepada {m3Scenario.characterName}
            </button>
          </div>
        )}

        {/* Result Banner with Sparkle Particles & Glow on Correct Answer */}
        {feedback && (
          <div
            className={`relative mt-4 overflow-visible rounded-2xl border p-4 text-sm ${
              feedback.ok
                ? 'wordopia-glow-card border-[#A5F05A] bg-[#A5F05A]/15 text-[#F4F8FF]'
                : 'border-[#FFB547] bg-[#FFB547]/15 text-[#FFB547]'
            }`}
          >
            {feedback.ok && (
              <div className="pointer-events-none absolute left-1/2 top-2">
                {SPARKLE_OFFSETS.map((sp, i) => (
                  <span
                    key={i}
                    className="wordopia-sparkle absolute inline-block h-2.5 w-2.5 rounded-full"
                    style={
                      {
                        backgroundColor: sp.color,
                        animationDelay: sp.delay,
                        '--tx': sp.tx,
                        '--ty': sp.ty,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 font-bold">
              {feedback.ok && <Sparkles className="h-4 w-4 text-[#A5F05A]" />}
              <span>
                {feedback.ok ? 'Tahniah! Jawapan Tepat & Isyarat Pulih!' : 'Cuba Sekali Lagi'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#F4F8FF]/90">{feedback.text}</p>
            {feedback.ok && (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {completedNextWorldId && onActivateTeleport && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPortalWhoosh();
                      onClose();
                      onActivateTeleport(completedNextWorldId);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] px-4 py-2 text-xs font-extrabold text-[#101C35] shadow-lg"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      Aktifkan Teleportasi ke{' '}
                      {MISSIONS_CATALOG.find((m) => m.id === completedNextWorldId)?.worldName ??
                        `Misi 0${completedNextWorldId}`}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-xl px-4 py-2 text-xs font-extrabold ${
                    completedNextWorldId
                      ? 'border border-[#A5F05A]/45 bg-[#0A1428] text-[#A5F05A]'
                      : 'bg-[#A5F05A] text-[#101C35]'
                  }`}
                >
                  Teruskan Pengembaraan di WORDOPIA
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

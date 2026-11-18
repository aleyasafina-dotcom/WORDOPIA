import React, { useState } from 'react';
import { Bot, CheckCircle2, Send, Sparkles } from 'lucide-react';
import { MISSION_4_AUDIENCES, MISSION_4_THEMES } from '../../data/missions.ts';
import type { LearningPathway, RoboMood, ScriptSubmission } from '../../types/game.ts';
import { api } from '../../utils/apiClient.ts';
import { RoboGuideBubble } from '../RoboGuideBubble.tsx';
import { soundEngine } from '../../utils/soundEngine.ts';

interface Mission4Props {
  pathway: LearningPathway;
  existingScript: ScriptSubmission | null;
  onSubmitted: (xpEarned: number, message: string) => Promise<void>;
  onCancel: () => void;
}

export const Mission4BinaMesej: React.FC<Mission4Props> = ({
  pathway,
  existingScript,
  onSubmitted,
  onCancel,
}) => {
  const [issue, setIssue] = useState(existingScript?.issue ?? MISSION_4_THEMES[0].label);
  const [audience, setAudience] = useState(existingScript?.audience ?? MISSION_4_AUDIENCES[0]);
  const [title, setTitle] = useState(existingScript?.title ?? '');
  const [active1, setActive1] = useState(existingScript?.activeSentences[0] ?? '');
  const [active2, setActive2] = useState(existingScript?.activeSentences[1] ?? '');
  const [passive1, setPassive1] = useState(existingScript?.passiveSentences[0] ?? '');
  const [passive2, setPassive2] = useState(existingScript?.passiveSentences[1] ?? '');
  const [scriptText, setScriptText] = useState(existingScript?.scriptText ?? '');

  const [aiResult, setAiResult] = useState<{
    summary: string;
    tips: string[];
    isReady: boolean;
  } | null>(
    existingScript?.aiFeedback
      ? { summary: existingScript.aiFeedback, tips: [], isReady: true }
      : null
  );

  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [roboMood, setRoboMood] = useState<RoboMood>('mesra');
  const [roboMsg, setRoboMsg] = useState(
    'Rancang skrip mesej Duta Bahasa kamu! Sertakan sekurang-kurangnya 2 ayat aktif dan 2 ayat pasif, kemudian guna Semakan AI ROBO.'
  );

  const activeTheme = MISSION_4_THEMES.find((t) => t.label === issue) ?? MISSION_4_THEMES[0];

  const handleComposeFromSentences = () => {
    soundEngine.playClick();
    const draft = [
      `Salam sejahtera kepada ${audience}!`,
      active1.trim(),
      active2.trim(),
      passive1.trim(),
      passive2.trim(),
      'Marilah kita bersama-sama memulihkan komuniti kita.',
    ]
      .filter(Boolean)
      .join(' ');
    setScriptText(draft);
  };

  const handleAiReview = async () => {
    setError('');
    setAiLoading(true);
    soundEngine.playRoboChirp();
    try {
      const res = await api.reviewScriptWithAi({
        issue,
        audience,
        scriptText:
          scriptText.trim() ||
          [active1, active2, passive1, passive2].filter(Boolean).join(' '),
        activeSentences: [active1, active2].filter((s) => s.trim().length > 0),
        passiveSentences: [passive1, passive2].filter((s) => s.trim().length > 0),
      });
      setAiResult({ summary: res.summary, tips: res.tips ?? [], isReady: res.isReady });
      setRoboMood(res.isReady ? 'bangga' : 'berfikir');
      setRoboMsg(res.summary);
      if (res.isReady) soundEngine.playSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyemak dengan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const actives = [active1.trim(), active2.trim()].filter(Boolean);
    const passives = [passive1.trim(), passive2.trim()].filter(Boolean);
    if (actives.length < 2 || passives.length < 2) {
      setError('Sila tulis sekurang-kurangnya 2 ayat aktif dan 2 ayat pasif.');
      soundEngine.playHint();
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitScript({
        issue,
        audience,
        title: title.trim(),
        scriptText: scriptText.trim(),
        activeSentences: actives,
        passiveSentences: passives,
        aiFeedback: aiResult?.summary ?? '',
      });
      soundEngine.playSuccess();
      await onSubmitted(res.xpEarned, res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghantar skrip.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="holo-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C4B5FD]">
            <span>OPERASI 04 · BINA MESEJ RAHSIA</span>
            <span aria-hidden="true">·</span>
            <span>Studio Duta Bahasa</span>
          </div>
          <h2 className="mt-0.5 font-display text-xl font-bold text-[#F4F8FF]">
            Makmal Penulisan Skrip & Semakan AI ROBO
          </h2>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[#F4F8FF]/20 px-4 py-2 text-xs font-semibold text-[#F4F8FF] hover:border-[#00C8F0]"
        >
          Kembali ke Kota NEXUS
        </button>
      </div>

      {existingScript?.teacherFeedback && (
        <div className="rounded-2xl border border-[#A5F05A]/45 bg-[#A5F05A]/12 p-4 text-sm text-[#F4F8FF]">
          <p className="font-display text-xs font-bold text-[#A5F05A]">
            Maklum Balas Guru ({existingScript.status === 'diluluskan' ? 'Diluluskan' : 'Semakan Guru'}):
          </p>
          <p className="mt-1">{existingScript.teacherFeedback}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="holo-panel space-y-5 rounded-2xl p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#00C8F0]">1. Pilih Isu Dunia Sebenar</label>
            <select
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3 py-2.5 text-sm text-[#F4F8FF]"
            >
              {MISSION_4_THEMES.map((t) => (
                <option key={t.id} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#00C8F0]">2. Sasaran Khalayak</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3 py-2.5 text-sm text-[#F4F8FF]"
            >
              {MISSION_4_AUDIENCES.map((aud) => (
                <option key={aud} value={aud}>
                  {aud}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#00C8F0]">3. Tajuk Mesej</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Wira Siber Bijak"
              className="mt-1.5 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3.5 py-2.5 text-sm text-[#F4F8FF]"
            />
          </div>
        </div>

        {pathway === 'sokongan' && (
          <div className="rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] p-3 text-xs text-[#00C8F0]">
            Panduan Laluan Sokongan: {activeTheme.starterHint}
          </div>
        )}

        {/* Guided 2 Active + 2 Passive Builders */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2.5 rounded-2xl border border-[#00C8F0]/30 bg-[#0A1428]/80 p-4">
            <p className="text-xs font-bold text-[#00C8F0]">
              Sekurang-kurangnya 2 AYAT AKTIF (Subjek Pelaku + meN-)
            </p>
            <input
              type="text"
              required
              value={active1}
              onChange={(e) => setActive1(e.target.value)}
              placeholder="Ayat Aktif 1..."
              className="w-full rounded-xl border border-[#F4F8FF]/15 bg-[#101C35] px-3 py-2 text-sm text-[#F4F8FF]"
            />
            <input
              type="text"
              required
              value={active2}
              onChange={(e) => setActive2(e.target.value)}
              placeholder="Ayat Aktif 2..."
              className="w-full rounded-xl border border-[#F4F8FF]/15 bg-[#101C35] px-3 py-2 text-sm text-[#F4F8FF]"
            />
          </div>

          <div className="space-y-2.5 rounded-2xl border border-[#7B61FF]/35 bg-[#0A1428]/80 p-4">
            <p className="text-xs font-bold text-[#C4B5FD]">
              Sekurang-kurangnya 2 AYAT PASIF (Objek + di- oleh / kata ganti diri)
            </p>
            <input
              type="text"
              required
              value={passive1}
              onChange={(e) => setPassive1(e.target.value)}
              placeholder="Ayat Pasif 1..."
              className="w-full rounded-xl border border-[#F4F8FF]/15 bg-[#101C35] px-3 py-2 text-sm text-[#F4F8FF]"
            />
            <input
              type="text"
              required
              value={passive2}
              onChange={(e) => setPassive2(e.target.value)}
              placeholder="Ayat Pasif 2..."
              className="w-full rounded-xl border border-[#F4F8FF]/15 bg-[#101C35] px-3 py-2 text-sm text-[#F4F8FF]"
            />
          </div>
        </div>

        {/* Full Script Composer */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-[#A5F05A]">
              4. Skrip Lengkap Ucapan / Video (1–2 Minit)
            </label>
            <button
              type="button"
              onClick={handleComposeFromSentences}
              className="text-xs font-semibold text-[#00C8F0] underline hover:text-[#A5F05A]"
            >
              Gabungkan 4 Ayat di Atas ke Dalam Skrip
            </button>
          </div>
          <textarea
            required
            rows={4}
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="Tulis skrip penuh ucapan video Duta Bahasa kamu di sini..."
            className="mt-1.5 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] p-3.5 text-sm leading-relaxed text-[#F4F8FF]"
          />
        </div>

        {aiResult && (
          <div className="rounded-2xl border border-[#00C8F0]/45 bg-[#00C8F0]/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-display text-xs font-bold text-[#00C8F0]">
              <Bot className="h-4 w-4" />
              <span>Laporan Bimbingan AI ROBO</span>
            </p>
            <p className="mt-1 text-[#F4F8FF]">{aiResult.summary}</p>
            {aiResult.tips.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#F4F8FF]/85">
                {aiResult.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#FFB547]/50 bg-[#FFB547]/15 px-4 py-2.5 text-sm text-[#FFB547]">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={aiLoading}
            onClick={handleAiReview}
            className="flex items-center gap-2 rounded-xl border border-[#00C8F0] bg-[#00C8F0]/15 px-5 py-2.5 text-sm font-bold text-[#00C8F0] hover:bg-[#00C8F0]/25 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            <span>{aiLoading ? 'ROBO Sedang Menyemak...' : 'Semak Tatabahasa Bersama AI ROBO'}</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] px-6 py-3 text-sm font-extrabold text-[#101C35] shadow-lg disabled:opacity-60"
          >
            {existingScript ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            <span>
              {submitting
                ? 'Menghantar Skrip...'
                : existingScript
                ? 'Kemas Kini & Hantar Skrip'
                : 'Hantar Skrip & Buka Operasi 05'}
            </span>
          </button>
        </div>
      </form>

      <RoboGuideBubble message={roboMsg} mood={roboMood} compact />
    </div>
  );
};

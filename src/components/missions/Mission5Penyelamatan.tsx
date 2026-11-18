import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ExternalLink, Film, HeartHandshake, Send, Sparkles } from 'lucide-react';
import type { ScriptSubmission, ShowcaseItem, VideoSubmission } from '../../types/game.ts';
import { api } from '../../utils/apiClient.ts';
import { RoboGuideBubble } from '../RoboGuideBubble.tsx';
import { soundEngine } from '../../utils/soundEngine.ts';

interface Mission5Props {
  scriptSubmission: ScriptSubmission | null;
  existingVideo: VideoSubmission | null;
  isDutaBahasa: boolean;
  onSubmitted: (xpEarned: number, message: string) => Promise<void>;
  onOpenCeremony: () => void;
  onCancel: () => void;
}

export const Mission5Penyelamatan: React.FC<Mission5Props> = ({
  scriptSubmission,
  existingVideo,
  isDutaBahasa,
  onSubmitted,
  onOpenCeremony,
  onCancel,
}) => {
  const [tab, setTab] = useState<'hantar' | 'komuniti'>('hantar');
  const [tool, setTool] = useState<'Canva' | 'CapCut' | 'Lain-lain'>(
    existingVideo?.tool ?? 'Canva'
  );
  const [videoUrl, setVideoUrl] = useState(existingVideo?.videoUrl ?? '');
  const [reflection, setReflection] = useState(existingVideo?.reflection ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .getShowcase()
      .then((res) => setShowcase(res.items))
      .catch(() => {});
  }, []);

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.submitVideo({ tool, videoUrl, reflection });
      soundEngine.playSuccess();
      const updated = await api.getShowcase();
      setShowcase(updated.items);
      await onSubmitted(res.xpEarned, res.message);
    } catch (err) {
      soundEngine.playHint();
      setError(err instanceof Error ? err.message : 'Gagal menghantar pautan video.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostPeerComment = async (targetUserId: string) => {
    const comment = (commentInputs[targetUserId] ?? '').trim();
    if (comment.length < 6) return;
    soundEngine.playClick();
    try {
      const res = await api.postPeerFeedback(targetUserId, comment);
      soundEngine.playSuccess();
      setShowcase(res.items);
      setCommentInputs((prev) => ({ ...prev, [targetUserId]: '' }));
    } catch {
      // Ignore transient error
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="holo-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFB547]">
            <span>OPERASI 05 · PENYELAMATAN DUNIA BAHASA</span>
            <span aria-hidden="true">·</span>
            <span>Menara Bahasa Utama</span>
          </div>
          <h2 className="mt-0.5 font-display text-xl font-bold text-[#F4F8FF]">
            Produksi Video Mesej Digital & Galeri Rakan
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isDutaBahasa && (
            <button
              type="button"
              onClick={onOpenCeremony}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFB547] to-[#A5F05A] px-4 py-2 text-xs font-extrabold text-[#101C35]"
            >
              <Award className="h-4 w-4" />
              <span>Majlis Duta Bahasa</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#F4F8FF]/20 px-4 py-2 text-xs font-semibold text-[#F4F8FF]"
          >
            Kembali ke Kota NEXUS
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setTab('hantar');
          }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${
            tab === 'hantar'
              ? 'border-[#00C8F0] bg-[#00C8F0] text-[#101C35]'
              : 'border-[#F4F8FF]/15 bg-[#101C35]/85 text-[#F4F8FF]/80'
          }`}
        >
          <Film className="h-4 w-4" />
          <span>Hantar Video & Refleksi</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setTab('komuniti');
          }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${
            tab === 'komuniti'
              ? 'border-[#A5F05A] bg-[#A5F05A] text-[#101C35]'
              : 'border-[#F4F8FF]/15 bg-[#101C35]/85 text-[#F4F8FF]/80'
          }`}
        >
          <HeartHandshake className="h-4 w-4" />
          <span>Galeri & Maklum Balas Rakan ({showcase.length})</span>
        </button>
      </div>

      {tab === 'hantar' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Script Reference + Production Checklist */}
          <div className="holo-panel space-y-4 rounded-2xl p-5 lg:col-span-5">
            <div>
              <p className="text-xs font-bold text-[#00C8F0]">Skrip Mesej Anda (Operasi 04)</p>
              <h3 className="mt-1 font-display text-base font-bold text-[#F4F8FF]">
                {scriptSubmission?.title || 'Skrip Duta Bahasa'}
              </h3>
              <p className="mt-2 rounded-xl border border-[#F4F8FF]/10 bg-[#0A1428] p-3 text-xs leading-relaxed text-[#F4F8FF]/85">
                {scriptSubmission?.scriptText || 'Sila rujuk skrip yang telah anda tulis di Operasi 04.'}
              </p>
            </div>

            <div className="border-t border-[#F4F8FF]/10 pt-3">
              <p className="text-xs font-bold text-[#FFB547]">Panduan Produksi Video (1–2 Minit)</p>
              <ol className="mt-2 space-y-1.5 text-xs text-[#F4F8FF]/85">
                <li>1. Buka Canva atau CapCut untuk merakam atau menyunting video.</li>
                <li>2. Sebut dan paparkan sekurang-kurangnya 2 ayat aktif & 2 ayat pasif.</li>
                <li>3. Pastikan suara jelas, sopan, dan visual menarik.</li>
                <li>4. Salin pautan kongsi video (Canva / CapCut / Google Drive) dan hantar di sebelah.</li>
              </ol>
            </div>

            {existingVideo && (
              <div className="rounded-xl border border-[#A5F05A]/40 bg-[#A5F05A]/10 p-3 text-xs">
                <p className="font-bold text-[#A5F05A]">
                  Status Video: {existingVideo.status === 'disahkan' ? 'Disahkan Guru (Duta Bahasa!)' : 'Menunggu Semakan Guru'}
                </p>
                {existingVideo.teacherComment && (
                  <p className="mt-1 text-[#F4F8FF]">Ulasan Guru: {existingVideo.teacherComment}</p>
                )}
              </div>
            )}
          </div>

          {/* Video Link & Reflection Submission */}
          <form onSubmit={handleSubmitVideo} className="holo-panel space-y-4 rounded-2xl p-5 lg:col-span-7">
            <div>
              <label className="block text-xs font-semibold text-[#00C8F0]">
                1. Aplikasi Produksi Video Digunakan
              </label>
              <div className="mt-2 flex gap-2">
                {(['Canva', 'CapCut', 'Lain-lain'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTool(t)}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-bold ${
                      tool === t
                        ? 'border-[#00C8F0] bg-[#00C8F0]/20 text-[#F4F8FF]'
                        : 'border-[#F4F8FF]/15 bg-[#0A1428] text-[#F4F8FF]/70'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#00C8F0]">
                2. Pautan Video Mesej Digital (Canva / CapCut / Pautan Awan)
              </label>
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.canva.com/design/..."
                className="mt-1.5 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3.5 py-2.5 text-sm text-[#F4F8FF]"
              />
              <p className="mt-1 text-[11px] text-[#F4F8FF]/60">
                Nota penyimpanan: Hanya pautan video disimpan di pangkalan data demi kelajuan dan keselamatan fail pelajar.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A5F05A]">
                3. Refleksi Kendiri Pengembara
              </label>
              <textarea
                required
                rows={4}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Apakah yang anda pelajari tentang penggunaan ayat aktif dan ayat pasif semasa menyiapkan video ini?"
                className="mt-1.5 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] p-3.5 text-sm text-[#F4F8FF]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[#FFB547]/50 bg-[#FFB547]/15 px-4 py-2.5 text-sm text-[#FFB547]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00C8F0] to-[#A5F05A] py-3.5 text-sm font-extrabold text-[#101C35] shadow-lg"
            >
              {existingVideo ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              <span>
                {submitting
                  ? 'Menghantar Video...'
                  : existingVideo
                  ? 'Kemas Kini Pautan Video'
                  : 'Hantar Video ke Menara Bahasa Utama'}
              </span>
            </button>
          </form>
        </div>
      ) : (
        /* Community Showcase & Peer Feedback */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {showcase.map((item) => (
            <div key={item.id} className="holo-panel flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#00C8F0]">
                    {item.studentName} · {item.className}
                  </span>
                  {item.isDutaBahasa && (
                    <span className="flex items-center gap-1 font-bold text-[#FFB547]">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Duta Bahasa</span>
                    </span>
                  )}
                </div>
                <h4 className="mt-1 font-display text-base font-bold text-[#F4F8FF]">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs text-[#F4F8FF]/70">
                  Isu: {item.issue} · Alat: {item.tool}
                </p>

                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#00C8F0]/40 bg-[#00C8F0]/15 px-3.5 py-2 text-xs font-bold text-[#00C8F0] hover:bg-[#00C8F0]/25"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Tonton Video Mesej</span>
                </a>

                {item.peerComments.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-[#F4F8FF]/10 pt-3">
                    {item.peerComments.map((c) => (
                      <div key={c.id} className="rounded-lg bg-[#0A1428] p-2.5 text-xs">
                        <span className="font-semibold text-[#A5F05A]">{c.authorName}: </span>
                        <span className="text-[#F4F8FF]/85">{c.comment}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={commentInputs[item.userId] ?? ''}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({ ...prev, [item.userId]: e.target.value }))
                  }
                  placeholder="Tulis pujian atau komen membina..."
                  className="flex-1 rounded-xl border border-[#F4F8FF]/15 bg-[#0A1428] px-3 py-2 text-xs text-[#F4F8FF]"
                />
                <button
                  type="button"
                  onClick={() => handlePostPeerComment(item.userId)}
                  className="rounded-xl bg-[#A5F05A] px-3.5 py-2 text-xs font-bold text-[#101C35]"
                >
                  Komen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RoboGuideBubble
        message={
          isDutaBahasa
            ? 'Tahniah Duta Bahasa WORDOPIA! Ribut Kata telah lenyap sepenuhnya! Klik butang Majlis Duta Bahasa untuk melihat sijil rasmi kamu!'
            : 'Apabila video kamu dihantar, guru akan menilai menggunakan rubrik SP 5.3.3 dan mengesahkan gelaran rasmi DUTA BAHASA WORDOPIA untuk kamu!'
        }
        mood={isDutaBahasa ? 'teruja' : 'mesra'}
        compact
      />
    </div>
  );
};

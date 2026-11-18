import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Film,
  Sparkles,
  Users,
} from 'lucide-react';
import { computeLevelFromXp } from '../data/missions.ts';
import type { PlayerState } from '../types/game.ts';
import { api } from '../utils/apiClient.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface TeacherPortalProps {
  onBack: () => void;
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ onBack }) => {
  const [students, setStudents] = useState<PlayerState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Script review form
  const [scriptFeedback, setScriptFeedback] = useState('');

  // Video rubric form
  const [kandungan, setKandungan] = useState(22);
  const [tatabahasa, setTatabahasa] = useState(23);
  const [kreativiti, setKreativiti] = useState(22);
  const [penyampaian, setPenyampaian] = useState(22);
  const [videoComment, setVideoComment] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.getTeacherStudents();
      setStudents(res.students);
      if (res.students.length > 0 && !selectedId) {
        selectStudent(res.students[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const selectStudent = (st: PlayerState) => {
    setSelectedId(st.user.id);
    setScriptFeedback(st.scriptSubmission?.teacherFeedback ?? '');
    setKandungan(st.videoSubmission?.rubricKandungan || 22);
    setTatabahasa(st.videoSubmission?.rubricTatabahasa || 23);
    setKreativiti(st.videoSubmission?.rubricKreativiti || 22);
    setPenyampaian(st.videoSubmission?.rubricPenyampaian || 22);
    setVideoComment(st.videoSubmission?.teacherComment ?? '');
    setNotice('');
  };

  const selected = students.find((s) => s.user.id === selectedId) ?? null;

  const handleReviewScript = async (status: 'diluluskan' | 'perlu_pembaikan') => {
    if (!selected) return;
    soundEngine.playClick();
    const res = await api.reviewStudentScript(selected.user.id, status, scriptFeedback);
    soundEngine.playSuccess();
    setStudents((prev) =>
      prev.map((s) => (s.user.id === selected.user.id ? res.student : s))
    );
    setNotice('Maklum balas skrip murid telah disimpan.');
  };

  const handleEvaluateVideo = async (approveDuta: boolean) => {
    if (!selected) return;
    soundEngine.playClick();
    const res = await api.evaluateStudentVideo({
      studentId: selected.user.id,
      rubricKandungan: kandungan,
      rubricTatabahasa: tatabahasa,
      rubricKreativiti: kreativiti,
      rubricPenyampaian: penyampaian,
      teacherComment: videoComment,
      approveDuta,
    });
    soundEngine.playSuccess();
    setStudents((prev) =>
      prev.map((s) => (s.user.id === selected.user.id ? res.student : s))
    );
    setNotice(
      approveDuta
        ? `Tahniah! ${selected.user.name} telah disahkan sebagai DUTA BAHASA WORDOPIA!`
        : 'Penilaian rubrik video telah disimpan.'
    );
  };

  const handleExportCsv = () => {
    soundEngine.playClick();
    const headers = [
      'Nama Murid',
      'Kelas',
      'Emel',
      'Laluan',
      'XP',
      'Tahap',
      'Duta Bahasa',
      'M1 Status',
      'M1 Betul',
      'M1 Cuba Semula',
      'M2 Status',
      'M2 Betul',
      'M2 Cuba Semula',
      'M3 Status',
      'M3 Betul',
      'M3 Cuba Semula',
      'M4 Status',
      'Status Skrip',
      'M5 Status',
      'Status Video',
      'Jumlah Rubrik Video (/100)',
      'Serpihan Terkumpul',
    ];

    const rows = students.map((st) => {
      const mMap = new Map(st.missions.map((m) => [m.missionId, m]));
      const stats = st.user.challengeStats ?? {};
      const lvl = computeLevelFromXp(st.user.xp).level;
      const vidTotal = st.videoSubmission
        ? st.videoSubmission.rubricKandungan +
          st.videoSubmission.rubricTatabahasa +
          st.videoSubmission.rubricKreativiti +
          st.videoSubmission.rubricPenyampaian
        : 0;

      return [
        st.user.name,
        st.user.className,
        st.user.email,
        st.user.pathway,
        st.user.xp,
        lvl,
        st.user.isDutaBahasa ? 'Ya' : 'Belum',
        mMap.get(1)?.status ?? 'belum_dibuka',
        stats['1']?.correctAttempts ?? 0,
        stats['1']?.incorrectAttempts ?? 0,
        mMap.get(2)?.status ?? 'belum_dibuka',
        stats['2']?.correctAttempts ?? 0,
        stats['2']?.incorrectAttempts ?? 0,
        mMap.get(3)?.status ?? 'belum_dibuka',
        stats['3']?.correctAttempts ?? 0,
        stats['3']?.incorrectAttempts ?? 0,
        mMap.get(4)?.status ?? 'belum_dibuka',
        st.scriptSubmission?.status ?? 'belum_dihantar',
        mMap.get(5)?.status ?? 'belum_dibuka',
        st.videoSubmission?.status ?? 'belum_dihantar',
        vidTotal,
        (st.user.collectedFragments ?? []).length,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = `\uFEFF${headers.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-wordopia-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice('Laporan CSV kemajuan murid telah dimuat turun.');
  };

  return (
    <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="holo-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <p className="text-xs font-semibold text-[#FFB547]">PORTAL GURU PEMBIMBING</p>
          <h2 className="font-display text-xl font-bold text-[#F4F8FF]">
            Pemantauan Kemajuan, Semakan Skrip & Rubrik Video SP 5.3.3
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={students.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[#A5F05A]/45 bg-[#A5F05A]/15 px-4 py-2 text-xs font-bold text-[#A5F05A] hover:bg-[#A5F05A]/25 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Muat Turun Laporan CSV</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-[#00C8F0]/40 bg-[#0A1428] px-4 py-2 text-xs font-semibold text-[#F4F8FF]"
          >
            <ArrowLeft className="h-4 w-4 text-[#00C8F0]" />
            <span>Masuk ke Kota NEXUS</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-[#A5F05A]/50 bg-[#A5F05A]/15 px-4 py-3 text-sm font-medium text-[#A5F05A]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Student List */}
        <div className="holo-panel rounded-2xl p-4 lg:col-span-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F4F8FF]">
            <Users className="h-4 w-4 text-[#00C8F0]" />
            <span>Senarai Murid ({students.length})</span>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-xs text-[#F4F8FF]/60">Memuatkan rekod murid...</p>
            ) : (
              students.map((st) => {
                const doneCount = st.missions.filter((m) => m.status === 'selesai').length;
                const active = st.user.id === selectedId;
                return (
                  <button
                    key={st.user.id}
                    type="button"
                    onClick={() => selectStudent(st)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-[#00C8F0] bg-[#00C8F0]/18'
                        : 'border-[#F4F8FF]/12 bg-[#0A1428] hover:border-[#00C8F0]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#F4F8FF]">
                        {st.user.name}
                      </span>
                      <span className="font-mono-tabular text-xs font-bold text-[#FFB547]">
                        {st.user.xp} XP
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-[#F4F8FF]/70">
                      <span>{st.user.className}</span>
                      <span>
                        {doneCount}/5 Misi {st.user.isDutaBahasa ? '· Duta Bahasa' : ''}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Student Review Panel */}
        <div className="holo-panel space-y-5 rounded-2xl p-5 lg:col-span-8">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4F8FF]/10 pb-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#F4F8FF]">
                    {selected.user.name} ({selected.user.className})
                  </h3>
                  <p className="text-xs text-[#00C8F0]">
                    Laluan: {selected.user.pathway.toUpperCase()} · Lencana: {selected.user.badges.length} · Serpihan:{' '}
                    {(selected.user.collectedFragments ?? []).length}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {selected.missions.map((m) => (
                    <span
                      key={m.missionId}
                      className={`rounded-lg px-2.5 py-1 font-mono-tabular text-xs font-bold ${
                        m.status === 'selesai'
                          ? 'bg-[#A5F05A]/20 text-[#A5F05A]'
                          : 'bg-[#0A1428] text-[#F4F8FF]/50'
                      }`}
                    >
                      M{m.missionId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Challenge Attempt Stats Summary */}
              <div className="rounded-2xl border border-[#F4F8FF]/12 bg-[#0A1428] p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#00C8F0]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Statistik Percubaan Cabaran Tatabahasa</span>
                  </span>
                  <span className="font-mono-tabular text-[#F4F8FF]/65">
                    Serpihan: {(selected.user.collectedFragments ?? []).length}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((mid) => {
                    const stat = selected.user.challengeStats?.[String(mid)];
                    const solved = selected.user.completedChallenges?.[String(mid)]?.length ?? 0;
                    return (
                      <div
                        key={mid}
                        className="rounded-xl border border-[#F4F8FF]/10 bg-[#101C35] px-3 py-2 text-xs"
                      >
                        <p className="font-mono-tabular font-bold text-[#F4F8FF]">
                          Misi 0{mid} ({solved}/3)
                        </p>
                        <p className="mt-0.5 font-mono-tabular text-[11px] text-[#A5F05A]">
                          Betul: {stat?.correctAttempts ?? solved}
                        </p>
                        <p className="font-mono-tabular text-[11px] text-[#FFB547]">
                          Cuba Semula: {stat?.incorrectAttempts ?? 0}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Script Review */}
              <div className="space-y-3 rounded-2xl border border-[#F4F8FF]/12 bg-[#0A1428] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#00C8F0]">
                    <FileText className="h-4 w-4" />
                    <span>Semakan Skrip Operasi 04</span>
                  </span>
                  <span className="text-xs font-semibold text-[#FFB547]">
                    {selected.scriptSubmission?.status ?? 'Belum dihantar'}
                  </span>
                </div>

                {selected.scriptSubmission ? (
                  <>
                    <p className="text-sm font-bold text-[#F4F8FF]">
                      {selected.scriptSubmission.title} ({selected.scriptSubmission.audience})
                    </p>
                    <p className="text-xs leading-relaxed text-[#F4F8FF]/85">
                      {selected.scriptSubmission.scriptText}
                    </p>
                    <textarea
                      rows={2}
                      value={scriptFeedback}
                      onChange={(e) => setScriptFeedback(e.target.value)}
                      placeholder="Tulis maklum balas guru untuk skrip murid..."
                      className="w-full rounded-xl border border-[#00C8F0]/30 bg-[#101C35] p-2.5 text-xs text-[#F4F8FF]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewScript('diluluskan')}
                        className="flex items-center gap-1.5 rounded-xl bg-[#A5F05A] px-4 py-2 text-xs font-bold text-[#101C35]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Luluskan Skrip</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewScript('perlu_pembaikan')}
                        className="rounded-xl border border-[#FFB547] px-4 py-2 text-xs font-bold text-[#FFB547]"
                      >
                        Minta Pembaikan
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#F4F8FF]/55">Murid belum menghantar skrip Operasi 04.</p>
                )}
              </div>

              {/* Video Rubric Evaluation */}
              <div className="space-y-3 rounded-2xl border border-[#F4F8FF]/12 bg-[#0A1428] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#FFB547]">
                    <Film className="h-4 w-4" />
                    <span>Penilaian Rubrik Video Operasi 05</span>
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-[#A5F05A]">
                    Jumlah: {kandungan + tatabahasa + kreativiti + penyampaian}/100
                  </span>
                </div>

                {selected.videoSubmission ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>Alat: {selected.videoSubmission.tool}</span>
                      <a
                        href={selected.videoSubmission.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#00C8F0] underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Buka Pautan Video Murid</span>
                      </a>
                    </div>
                    <p className="text-xs text-[#F4F8FF]/75">
                      Refleksi Murid: “{selected.videoSubmission.reflection}”
                    </p>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Kandungan (25)', val: kandungan, set: setKandungan },
                        { label: 'Ayat Aktif/Pasif (25)', val: tatabahasa, set: setTatabahasa },
                        { label: 'Kreativiti (25)', val: kreativiti, set: setKreativiti },
                        { label: 'Penyampaian (25)', val: penyampaian, set: setPenyampaian },
                      ].map((r) => (
                        <div key={r.label}>
                          <label className="block text-[11px] text-[#F4F8FF]/75">{r.label}</label>
                          <input
                            type="number"
                            min={0}
                            max={25}
                            value={r.val}
                            onChange={(e) => r.set(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-[#00C8F0]/30 bg-[#101C35] px-2.5 py-1.5 font-mono-tabular text-sm text-[#F4F8FF]"
                          />
                        </div>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={videoComment}
                      onChange={(e) => setVideoComment(e.target.value)}
                      placeholder="Ulasan penilaian video & ucapan tahniah guru..."
                      className="w-full rounded-xl border border-[#00C8F0]/30 bg-[#101C35] p-2.5 text-xs text-[#F4F8FF]"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEvaluateVideo(false)}
                        className="rounded-xl border border-[#00C8F0] px-4 py-2 text-xs font-bold text-[#00C8F0]"
                      >
                        Simpan Markah Rubrik
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEvaluateVideo(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFB547] to-[#A5F05A] px-4 py-2 text-xs font-extrabold text-[#101C35]"
                      >
                        <Award className="h-4 w-4" />
                        <span>Sahkan Sebagai Duta Bahasa WORDOPIA</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#F4F8FF]/55">Murid belum menghantar video Operasi 05.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#F4F8FF]/60">Pilih seorang murid di sebelah kiri.</p>
          )}
        </div>
      </div>
    </div>
  );
};

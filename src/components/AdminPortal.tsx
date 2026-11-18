import React, { useEffect, useState } from 'react';
import { ArrowLeft, Database, Plus, ShieldCheck, Users } from 'lucide-react';
import { MISSIONS_CATALOG } from '../data/missions.ts';
import type { UserProfile, UserRole } from '../types/game.ts';
import { api } from '../utils/apiClient.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface AdminPortalProps {
  onBack: () => void;
  onRefreshState: () => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBack, onRefreshState }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string; teacher_name: string }[]>([]);
  const [missionStats, setMissionStats] = useState<{ mission_id: number; completed_count: number }[]>([]);
  const [sysConfig, setSysConfig] = useState<{
    databaseEngine: string;
    geminiConfigured: boolean;
    firebaseConfigured: boolean;
  } | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('murid');
  const [newClass, setNewClass] = useState('6 Bestari');
  const [classNameInput, setClassNameInput] = useState('');
  const [teacherInput, setTeacherInput] = useState('');

  const [editMissionId, setEditMissionId] = useState(1);
  const [editTitle, setEditTitle] = useState(MISSIONS_CATALOG[0].title);
  const [editBriefing, setEditBriefing] = useState(MISSIONS_CATALOG[0].storyIntro);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    const res = await api.getAdminOverview();
    setUsers(res.users);
    setClasses(res.classes);
    setMissionStats(res.missionStats);
    setSysConfig(res.systemConfig);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    await api.adminCreateUser({
      name: newName,
      email: newEmail,
      password: 'wordopia123',
      role: newRole,
      className: newClass,
    });
    soundEngine.playSuccess();
    setNewName('');
    setNewEmail('');
    setNotice('Akaun baharu berjaya dicipta.');
    await loadData();
  };

  const handleRoleChange = async (id: string, role: UserRole) => {
    soundEngine.playClick();
    await api.adminUpdateUser(id, { role });
    setNotice('Peranan akaun berjaya dikemas kini.');
    await loadData();
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    await api.adminCreateClass(classNameInput, teacherInput);
    soundEngine.playSuccess();
    setClassNameInput('');
    setTeacherInput('');
    setNotice('Kelas baharu berjaya ditambah.');
    await loadData();
  };

  const handleSaveMissionOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    await api.adminUpdateMission(editMissionId, editTitle, editBriefing);
    soundEngine.playSuccess();
    setNotice(`Kandungan Operasi 0${editMissionId} telah dikemas kini.`);
    await onRefreshState();
  };

  return (
    <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="holo-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <p className="text-xs font-semibold text-[#C4B5FD]">PORTAL PENTADBIR SISTEM</p>
          <h2 className="font-display text-xl font-bold text-[#F4F8FF]">
            Pengurusan Akaun, Kelas, Kandungan Misi & Laporan
          </h2>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-[#00C8F0]/40 bg-[#0A1428] px-4 py-2 text-xs font-semibold text-[#F4F8FF]"
        >
          <ArrowLeft className="h-4 w-4 text-[#00C8F0]" />
          <span>Masuk ke Kota NEXUS</span>
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-[#A5F05A]/50 bg-[#A5F05A]/15 px-4 py-2.5 text-sm text-[#A5F05A]">
          {notice}
        </div>
      )}

      {/* System Status & Mission Reports */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="holo-panel rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#F4F8FF]">
            <Database className="h-4 w-4 text-[#00C8F0]" />
            <span>Status Infrastruktur Pangkalan Data & AI</span>
          </h3>
          {sysConfig && (
            <div className="mt-3 space-y-2 text-xs text-[#F4F8FF]/85">
              <p>
                Pangkalan Data Aktif: <strong className="text-[#A5F05A]">{sysConfig.databaseEngine}</strong>
              </p>
              <p>
                Semakan AI Gemini (Server-Side):{' '}
                <strong className={sysConfig.geminiConfigured ? 'text-[#A5F05A]' : 'text-[#FFB547]'}>
                  {sysConfig.geminiConfigured ? 'Aktif (GEMINI_API_KEY disambung)' : 'Mod Panduan Tempatan'}
                </strong>
              </p>
              <p>
                Firebase Cloud Firestore:{' '}
                <strong className={sysConfig.firebaseConfigured ? 'text-[#A5F05A]' : 'text-[#FFB547]'}>
                  {sysConfig.firebaseConfigured
                    ? 'Dikonfigurasi'
                    : 'Tidak dikonfigurasi (Sekatan kebenaran projek pada akaun organisasi; pelayan SQLite berterusan aktif digunakan)'}
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="holo-panel rounded-2xl p-5">
          <h3 className="font-display text-base font-bold text-[#F4F8FF]">
            Laporan Penyiapan Misi Murid
          </h3>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {MISSIONS_CATALOG.map((m) => {
              const stat = missionStats.find((s) => s.mission_id === m.id);
              return (
                <div key={m.id} className="rounded-xl border border-[#F4F8FF]/12 bg-[#0A1428] p-2.5 text-center">
                  <p className="font-mono-tabular text-[11px] text-[#00C8F0]">M0{m.id}</p>
                  <p className="mt-1 font-mono-tabular text-lg font-extrabold text-[#A5F05A]">
                    {stat?.completed_count ?? 0}
                  </p>
                  <p className="text-[10px] text-[#F4F8FF]/60">Selesai</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Management & Class Management */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="holo-panel space-y-4 rounded-2xl p-5 lg:col-span-7">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#F4F8FF]">
            <Users className="h-4 w-4 text-[#00C8F0]" />
            <span>Pengurusan Akaun & Peranan ({users.length})</span>
          </h3>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama penuh"
              className="rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-3 py-2 text-xs text-[#F4F8FF]"
            />
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="E-mel"
              className="rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-3 py-2 text-xs text-[#F4F8FF]"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-2.5 py-2 text-xs text-[#F4F8FF]"
            >
              <option value="murid">Murid</option>
              <option value="guru">Guru</option>
              <option value="pentadbir">Pentadbir</option>
            </select>
            <button
              type="submit"
              className="flex items-center justify-center gap-1 rounded-xl bg-[#00C8F0] px-3 py-2 text-xs font-bold text-[#101C35]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah</span>
            </button>
          </form>

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F4F8FF]/10 bg-[#0A1428] px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-[#F4F8FF]">{u.name}</p>
                  <p className="text-[11px] text-[#F4F8FF]/60">
                    {u.email} · {u.className}
                  </p>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                  className="rounded-lg border border-[#00C8F0]/30 bg-[#101C35] px-2 py-1 text-xs font-semibold text-[#00C8F0]"
                >
                  <option value="murid">Murid</option>
                  <option value="guru">Guru</option>
                  <option value="pentadbir">Pentadbir</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Classes & Mission Content Editor */}
        <div className="holo-panel space-y-5 rounded-2xl p-5 lg:col-span-5">
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#F4F8FF]">
              <ShieldCheck className="h-4 w-4 text-[#A5F05A]" />
              <span>Pengurusan Kelas</span>
            </h3>
            <form onSubmit={handleCreateClass} className="mt-2.5 flex gap-2">
              <input
                type="text"
                required
                value={classNameInput}
                onChange={(e) => setClassNameInput(e.target.value)}
                placeholder="Nama kelas (cth: 6 Dinamik)"
                className="flex-1 rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-3 py-2 text-xs text-[#F4F8FF]"
              />
              <input
                type="text"
                value={teacherInput}
                onChange={(e) => setTeacherInput(e.target.value)}
                placeholder="Nama guru"
                className="w-28 rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-2.5 py-2 text-xs text-[#F4F8FF]"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#A5F05A] px-3 py-2 text-xs font-bold text-[#101C35]"
              >
                Simpan
              </button>
            </form>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {classes.map((c) => (
                <span
                  key={c.id}
                  className="rounded-lg border border-[#F4F8FF]/15 bg-[#0A1428] px-2.5 py-1 text-xs text-[#F4F8FF]/85"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveMissionOverride} className="space-y-2.5 border-t border-[#F4F8FF]/10 pt-4">
            <h3 className="font-display text-sm font-bold text-[#FFB547]">
              Urus Kandungan Misi
            </h3>
            <select
              value={editMissionId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setEditMissionId(id);
                const found = MISSIONS_CATALOG.find((m) => m.id === id);
                if (found) {
                  setEditTitle(found.title);
                  setEditBriefing(found.storyIntro);
                }
              }}
              className="w-full rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-3 py-2 text-xs text-[#F4F8FF]"
            >
              {MISSIONS_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}: {m.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] px-3 py-2 text-xs text-[#F4F8FF]"
            />
            <textarea
              rows={2}
              value={editBriefing}
              onChange={(e) => setEditBriefing(e.target.value)}
              className="w-full rounded-xl border border-[#00C8F0]/30 bg-[#0A1428] p-2.5 text-xs text-[#F4F8FF]"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-[#FFB547] py-2 text-xs font-bold text-[#101C35]"
            >
              Kemas Kini Misi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

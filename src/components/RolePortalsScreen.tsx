import React, { useEffect, useState } from 'react';
import { ArrowLeft, GraduationCap, Shield, UserCheck, Users } from 'lucide-react';
import type { PlayerState, UserRole } from '../types/game.ts';
import { api } from '../utils/apiClient.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface RolePortalsScreenProps {
  highlightedPortal: UserRole | null;
  onHighlightPortal: (role: UserRole | null) => void;
  onBackToMenu: () => void;
  onAuthSuccess: (state: PlayerState) => void;
}

const PORTALS: {
  role: UserRole;
  title: string;
  subtitle: string;
  color: string;
  demoEmail: string;
  demoPass: string;
  demoLabel: string;
  allowRegister: boolean;
}[] = [
  {
    role: 'pentadbir',
    title: 'PORTAL PENTADBIR',
    subtitle: 'Pengurusan akaun, kelas, kandungan misi & infrastruktur.',
    color: '#7B61FF',
    demoEmail: 'admin@wordopia.edu.my',
    demoPass: 'admin123',
    demoLabel: 'Isi Akaun Demo Pentadbir',
    allowRegister: false,
  },
  {
    role: 'guru',
    title: 'PORTAL GURU',
    subtitle: 'Pemantauan murid, semakan skrip & pengesahan Duta Bahasa.',
    color: '#FFB547',
    demoEmail: 'guru@wordopia.edu.my',
    demoPass: 'guru123',
    demoLabel: 'Isi Akaun Demo Guru (Cikgu Farah)',
    allowRegister: false,
  },
  {
    role: 'murid',
    title: 'PORTAL MURID',
    subtitle: 'Masuk sebagai ejen pengembara & jelajahi Kota NEXUS.',
    color: '#00C8F0',
    demoEmail: 'aiman@wordopia.edu.my',
    demoPass: 'wordopia123',
    demoLabel: 'Isi Akaun Demo Murid (Aiman)',
    allowRegister: true,
  },
];

export const RolePortalsScreen: React.FC<RolePortalsScreenProps> = ({
  highlightedPortal,
  onHighlightPortal,
  onBackToMenu,
  onAuthSuccess,
}) => {
  const [selectedPortal, setSelectedPortal] = useState<UserRole | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [className, setClassName] = useState('6 Bestari');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getClasses()
      .then((res) => setClasses(res.classes))
      .catch(() => {});
  }, []);

  const openPortal = (role: UserRole) => {
    soundEngine.unlockAudio();
    soundEngine.playPortalWhoosh();
    setSelectedPortal(role);
    onHighlightPortal(role);
    setAuthTab('login');
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  const portalMeta = PORTALS.find((p) => p.role === selectedPortal) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalMeta) return;
    setError('');
    setLoading(true);
    try {
      const state =
        authTab === 'login'
          ? await api.login(email, password)
          : await api.register(name, email, password, className);

      if (authTab === 'login' && state.user.role !== portalMeta.role) {
        setError(
          `Akaun ini didaftarkan sebagai peranan ${state.user.role.toUpperCase()}. Sila masuk melalui Portal ${state.user.role.toUpperCase()}.`
        );
        soundEngine.playHint();
        setLoading(false);
        return;
      }

      soundEngine.playSuccess();
      onAuthSuccess(state);
    } catch (err) {
      soundEngine.playHint();
      setError(err instanceof Error ? err.message : 'Pengesahan gagal. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (role: UserRole, color: string) => {
    if (role === 'pentadbir') return <Shield className="h-6 w-6" style={{ color }} />;
    if (role === 'guru') return <GraduationCap className="h-6 w-6" style={{ color }} />;
    return <Users className="h-6 w-6" style={{ color }} />;
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            if (selectedPortal) {
              setSelectedPortal(null);
              onHighlightPortal(null);
            } else {
              onBackToMenu();
            }
          }}
          className="holo-panel flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-[#F4F8FF] hover:border-[#00C8F0]"
        >
          <ArrowLeft className="h-4 w-4 text-[#00C8F0]" />
          <span>{selectedPortal ? 'Kembali ke 3 Portal' : 'Menu Utama'}</span>
        </button>

        <div className="holo-panel rounded-xl px-4 py-2 text-right">
          <p className="font-mono-tabular text-[10px] font-bold tracking-widest text-[#00C8F0]">
            PUSAT KAWALAN AKSES WORDOPIA
          </p>
          <p className="font-display text-sm font-bold text-[#F4F8FF]">
            Pilih Portal Peranan Anda
          </p>
        </div>
      </div>

      {/* Either 3 Portal Cards aligned over the 3D Portals OR Selected Portal Login Form */}
      {!portalMeta ? (
        <div className="mx-auto my-auto grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          {PORTALS.map((portal) => {
            const isHighlighted = highlightedPortal === portal.role;
            return (
              <button
                key={portal.role}
                type="button"
                onMouseEnter={() => onHighlightPortal(portal.role)}
                onMouseLeave={() => onHighlightPortal(null)}
                onClick={() => openPortal(portal.role)}
                className="holo-panel group flex flex-col items-center justify-between rounded-3xl p-6 text-center transition-all hover:-translate-y-1"
                style={{
                  borderColor: isHighlighted ? portal.color : `${portal.color}66`,
                  boxShadow: isHighlighted ? `0 0 38px ${portal.color}44` : undefined,
                }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: portal.color,
                    backgroundColor: `${portal.color}20`,
                  }}
                >
                  {renderIcon(portal.role, portal.color)}
                </div>

                <div className="mt-4">
                  <h3 className="font-display text-lg font-extrabold tracking-wide text-[#F4F8FF]">
                    {portal.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#F4F8FF]/75">
                    {portal.subtitle}
                  </p>
                </div>

                <span
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-[#101C35]"
                  style={{ backgroundColor: portal.color }}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Masuk Portal</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto my-auto w-full max-w-md">
          <div
            className="holo-panel rounded-3xl p-6 shadow-2xl"
            style={{ borderColor: `${portalMeta.color}88` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  borderColor: portalMeta.color,
                  backgroundColor: `${portalMeta.color}20`,
                }}
              >
                {renderIcon(portalMeta.role, portalMeta.color)}
              </div>
              <div>
                <p className="font-mono-tabular text-[11px] font-bold" style={{ color: portalMeta.color }}>
                  GERBANG PENGESAHAN
                </p>
                <h2 className="font-display text-xl font-extrabold text-[#F4F8FF]">
                  {portalMeta.title}
                </h2>
              </div>
            </div>

            {portalMeta.allowRegister && (
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#0A1428] p-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setAuthTab('login');
                    setError('');
                  }}
                  className={`rounded-lg py-2 text-xs font-bold ${
                    authTab === 'login' ? 'bg-[#00C8F0] text-[#101C35]' : 'text-[#F4F8FF]/75'
                  }`}
                >
                  Log Masuk Ejen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setAuthTab('register');
                    setError('');
                  }}
                  className={`rounded-lg py-2 text-xs font-bold ${
                    authTab === 'register' ? 'bg-[#A5F05A] text-[#101C35]' : 'text-[#F4F8FF]/75'
                  }`}
                >
                  Daftar Murid Baharu
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {authTab === 'register' && portalMeta.allowRegister && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#00C8F0]">Nama Penuh Murid</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Siti Aisyah"
                      className="mt-1 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3.5 py-2.5 text-sm text-[#F4F8FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#00C8F0]">Kelas Tahun 6</label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3.5 py-2.5 text-sm text-[#F4F8FF]"
                    >
                      {(classes.length > 0 ? classes.map((c) => c.name) : ['6 Bestari', '6 Inovatif', '6 Wawasan']).map(
                        (cn) => (
                          <option key={cn} value={cn}>
                            {cn}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#00C8F0]">E-mel Pengguna</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={portalMeta.demoEmail}
                  className="mt-1 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3.5 py-2.5 text-sm text-[#F4F8FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#00C8F0]">Kata Laluan</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-[#00C8F0]/35 bg-[#0A1428] px-3.5 py-2.5 text-sm text-[#F4F8FF]"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-[#FFB547]/50 bg-[#FFB547]/15 px-3 py-2 text-xs font-medium text-[#FFB547]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 font-display text-sm font-extrabold text-[#101C35] shadow-lg disabled:opacity-60"
                style={{ backgroundColor: portalMeta.color }}
              >
                {loading
                  ? 'Mengesahkan Akses...'
                  : authTab === 'login'
                  ? 'Masuk ke Dunia WORDOPIA'
                  : 'Cipta Akaun & Pilih Watak'}
              </button>
            </form>

            {authTab === 'login' && (
              <div className="mt-4 border-t border-[#F4F8FF]/12 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setEmail(portalMeta.demoEmail);
                    setPassword(portalMeta.demoPass);
                  }}
                  className="w-full rounded-xl border border-[#F4F8FF]/18 bg-[#0A1428] py-2 text-xs font-semibold text-[#F4F8FF]/85 hover:border-[#00C8F0]"
                >
                  {portalMeta.demoLabel}
                </button>
                {portalMeta.role === 'murid' && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setEmail('izzah@wordopia.edu.my');
                      setPassword('wordopia123');
                    }}
                    className="mt-2 w-full rounded-xl border border-[#A5F05A]/30 bg-[#0A1428] py-2 text-xs font-semibold text-[#A5F05A] hover:border-[#A5F05A]"
                  >
                    Isi Akaun Demo Murid Lanjutan (Nurul Izzah)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center text-[11px] text-[#F4F8FF]/55">
        Pengesahan akaun dilindungi oleh pelayan WORDOPIA · Hak akses peranan dikuatkuasakan
      </div>
    </div>
  );
};

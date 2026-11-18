import React from 'react';
import { Compass, Gamepad2, Radio, ShieldCheck, X } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine.ts';

interface AboutWordopiaModalProps {
  onClose: () => void;
}

export const AboutWordopiaModal: React.FC<AboutWordopiaModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060E1F]/80 p-4">
      <div className="holo-panel relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          aria-label="Tutup maklumat"
          className="absolute right-5 top-5 rounded-xl border border-[#F4F8FF]/15 p-2 text-[#F4F8FF]/75 hover:text-[#F4F8FF]"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="font-mono-tabular text-xs font-bold tracking-widest text-[#00C8F0]">
          TENTANG WORDOPIA: THE LOST SIGNAL
        </p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-[#F4F8FF]">
          Jejak Isyarat, Pulihkan Komunikasi
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[#F4F8FF]/85">
          Di Kota NEXUS yang serba canggih, kegagalan isyarat misteri yang dikenali sebagai <strong className="text-[#FFB547]">THE LOST SIGNAL</strong> telah mengganggu seluruh sistem komunikasi bandar. Mesej menjadi bercelaru dan ayat aktif serta ayat pasif tersalah guna. Sebagai ejen khas pasukan WORDOPIA, anda perlu meneroka 5 zon bandar dan memulihkan Menara Utama!
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#00C8F0]/30 bg-[#0A1428] p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-[#00C8F0]">
              <Gamepad2 className="h-4 w-4" />
              <span>Kawalan Komputer (Desktop)</span>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[#F4F8FF]/80">
              <li><strong>W / A / S / D</strong> atau Kekunci Anak Panah: Berjalan</li>
              <li><strong>SHIFT</strong>: Berlari pantas</li>
              <li><strong>SPACE</strong>: Melompat</li>
              <li><strong>E</strong>: Berinteraksi dengan terminal & warga</li>
              <li><strong>Seret Tetikus</strong>: Putar kamera orang ketiga</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#A5F05A]/30 bg-[#0A1428] p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-[#A5F05A]">
              <Compass className="h-4 w-4" />
              <span>Kawalan Peranti Mudah Alih</span>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[#F4F8FF]/80">
              <li><strong>Kayu Ria (Kiri Bawah)</strong>: Gerakkan watak</li>
              <li><strong>Butang Lari / Lompat / Interaksi (Kanan)</strong></li>
              <li><strong>Sentuh & Seret Skrin</strong>: Kawal sudut kamera</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#7B61FF]/35 bg-[#0A1428] p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-[#C4B5FD]">
            <Radio className="h-4 w-4" />
            <span>5 Zon Misi Berangkai (SP 5.3.3)</span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#F4F8FF]/80">
            Misi 01: Jejak Bahasa (Zon Bandar) → Misi 02: Baiki Sistem (Pusat Data) → Misi 03: Pilihan Tepat (Stesen Komunikasi) → Misi 04: Mesej Rahsia (Pusat Media) → Misi 05: Isyarat Terakhir (Menara Utama & Gelaran Duta Bahasa WORDOPIA).
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-[#A5F05A]">
            <ShieldCheck className="h-4 w-4" />
            <span>Bahasa Melayu Tahun 6</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="rounded-xl bg-[#00C8F0] px-5 py-2 text-xs font-extrabold text-[#101C35]"
          >
            Faham
          </button>
        </div>
      </div>
    </div>
  );
};

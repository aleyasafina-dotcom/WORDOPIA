import type {
  CharacterConfig,
  CityZoneMeta,
  HeroDefinition,
  HeroId,
  MissionMeta,
  PlayerWorldPosition,
} from '../types/game.ts';

export const DEFAULT_PLAYER_POSITION: PlayerWorldPosition = {
  zone: 'zon_bandar',
  x: 0,
  y: 0,
  z: 16,
  yaw: 0,
};

export const DEFAULT_CHARACTER: CharacterConfig = {
  style: 'putra',
  skinTone: '#D9A47E',
  faceExpression: 'yakin',
  hairStyle: 'pendek_futuristik',
  hairColor: '#171E2E',
  outfitStyle: 'penjelajah_langit',
  outfitColor: '#00C8F0',
  shoeStyle: 'but_kuantum',
  accessory: 'kaca_holo',
  backpack: 'pek_jet',
};

export const HERO_ROSTER: HeroDefinition[] = [
  {
    id: 'arka',
    name: 'ARKA',
    genderLabel: 'Lelaki',
    hairDesc: 'Rambut pendek gelap kemas',
    outfitDesc: 'Sut Penjelajah Navy & Sian Futuristik',
    personality: 'Yakin dan Berani',
    roleTitle: 'Ejen Lapangan Barisan Hadapan',
    primaryColor: '#132B52',
    secondaryColor: '#00C8F0',
    hairColor: '#161B26',
    skinTone: '#D6A17A',
    coatStyle: 'long_trench',
    hairVariant: 'short_taper',
    modelAssetPath: '/assets/models/arka.glb',
  },
  {
    id: 'nara',
    name: 'NARA',
    genderLabel: 'Perempuan',
    hairDesc: 'Rambut gelap ikat ekor tinggi',
    outfitDesc: 'Sut Taktikal Sian & Navy Futuristik',
    personality: 'Pintar dan Analitik',
    roleTitle: 'Pakar Dekod Isyarat Bahasa',
    primaryColor: '#00A9CF',
    secondaryColor: '#13274A',
    hairColor: '#181A24',
    skinTone: '#E3B492',
    coatStyle: 'tactical_jacket',
    hairVariant: 'ponytail',
    modelAssetPath: '/assets/models/nara.glb',
  },
  {
    id: 'zayan',
    name: 'ZAYAN',
    genderLabel: 'Lelaki',
    hairDesc: 'Rambut gelap beralun moden',
    outfitDesc: 'Sut Peninjau Kelabu & Teal Futuristik',
    personality: 'Kreatif dan Suka Mengembara',
    roleTitle: 'Pengemudi Sistem & Arkitek Kata',
    primaryColor: '#3B485E',
    secondaryColor: '#14B8A6',
    hairColor: '#1D2230',
    skinTone: '#C88D66',
    coatStyle: 'field_parka',
    hairVariant: 'wavy_textured',
    modelAssetPath: '/assets/models/zayan.glb',
  },
  {
    id: 'mika',
    name: 'MIKA',
    genderLabel: 'Perempuan',
    hairDesc: 'Rambut gelap paras bahu',
    outfitDesc: 'Sut Komander Hitam & Ungu Futuristik',
    personality: 'Yakin dan Komunikatif',
    roleTitle: 'Penyampai Strategik & Duta Media',
    primaryColor: '#181C2E',
    secondaryColor: '#7B61FF',
    hairColor: '#151722',
    skinTone: '#DDA987',
    coatStyle: 'cyber_blazer',
    hairVariant: 'shoulder_bob',
    modelAssetPath: '/assets/models/mika.glb',
  },
];

export function getHeroById(heroId: HeroId | null | undefined): HeroDefinition {
  return HERO_ROSTER.find((h) => h.id === heroId) ?? HERO_ROSTER[0];
}

export function heroToCharacterConfig(heroId: HeroId): CharacterConfig {
  const hero = getHeroById(heroId);
  return {
    style: hero.id === 'nara' || hero.id === 'mika' ? 'putri' : 'putra',
    skinTone: hero.skinTone,
    faceExpression: hero.id === 'nara' ? 'pintar' : 'yakin',
    hairStyle:
      hero.id === 'nara'
        ? 'ikat_ekor'
        : hero.id === 'mika'
        ? 'bob_beralun'
        : hero.id === 'zayan'
        ? 'spiky_cyber'
        : 'pendek_futuristik',
    hairColor: hero.hairColor,
    outfitStyle:
      hero.id === 'mika'
        ? 'jubah_kristal'
        : hero.id === 'zayan'
        ? 'komander_siber'
        : 'penjelajah_langit',
    outfitColor: hero.secondaryColor,
    shoeStyle: 'but_kuantum',
    accessory: 'kaca_holo',
    backpack: 'pek_jet',
  };
}

export const CITY_ZONES: CityZoneMeta[] = [
  {
    id: 'zon_bandar',
    missionId: 1,
    name: 'Kota NEXUS',
    shortLabel: 'Kota NEXUS',
    accentColor: '#00C8F0',
    center: { x: 0, z: 0 },
    radius: 26,
    spawnPoint: { x: 0, z: 16, yaw: 0 },
  },
  {
    id: 'pusat_data',
    missionId: 2,
    name: 'Makmal Neural',
    shortLabel: 'Makmal Neural',
    accentColor: '#A5F05A',
    center: { x: 0, z: 0 },
    radius: 24,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
  },
  {
    id: 'stesen_komunikasi',
    missionId: 3,
    name: 'Stesen Orbital',
    shortLabel: 'Stesen Orbital',
    accentColor: '#FFB547',
    center: { x: 0, z: 0 },
    radius: 24,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
  },
  {
    id: 'pusat_media',
    missionId: 4,
    name: 'Bandar Media Digital',
    shortLabel: 'Studio Kreatif',
    accentColor: '#7B61FF',
    center: { x: 0, z: 0 },
    radius: 24,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
  },
  {
    id: 'menara_utama',
    missionId: 5,
    name: 'Menara Langit NEXUS',
    shortLabel: 'Menara Langit',
    accentColor: '#FFB547',
    center: { x: 0, z: 0 },
    radius: 24,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
  },
];

export const BADGE_CATALOG: Record<
  string,
  { title: string; subtitle: string; icon: string; color: string }
> = {
  pengesan_bahasa: {
    title: 'Lencana Pengesan Bahasa',
    subtitle: 'Menjejak 3 serpihan isyarat dan membezakan ayat aktif serta pasif di Kota NEXUS.',
    icon: 'Radar',
    color: '#00C8F0',
  },
  pakar_bahasa: {
    title: 'Lencana Pakar Bahasa',
    subtitle: 'Membaiki 3 terminal ayat di Makmal Neural dengan tepat.',
    icon: 'Wrench',
    color: '#A5F05A',
  },
  strategis_bahasa: {
    title: 'Lencana Strategis Bahasa',
    subtitle: 'Menyelesaikan 3 situasi komunikasi warga di Stesen Orbital.',
    icon: 'Compass',
    color: '#FFB547',
  },
  pencipta_mesej: {
    title: 'Lencana Pencipta Mesej',
    subtitle: 'Merangka skrip mesej rahsia Duta Bahasa di Bandar Media Digital.',
    icon: 'Sparkles',
    color: '#7B61FF',
  },
  wira_bahasa: {
    title: 'Lencana Wira Bahasa',
    subtitle: 'Menghantar video penyelamatan dan memulihkan Menara Langit NEXUS.',
    icon: 'Award',
    color: '#FFB547',
  },
  pereka_identiti: {
    title: 'Lencana Ejen Rasmi',
    subtitle: 'Memilih identiti ejen pengembara dan memasuki dunia WORDOPIA.',
    icon: 'UserCheck',
    color: '#00C8F0',
  },
  sahabat_wordopia: {
    title: 'Lencana Sahabat Wordopia',
    subtitle: 'Memberikan maklum balas membina kepada rakan pengembara.',
    icon: 'HeartHandshake',
    color: '#A5F05A',
  },
};

export const UNLOCKABLE_ITEMS_INFO: Record<
  string,
  { label: string; category: string }
> = {
  kaca_holo: { label: 'Visor Pengesan Isyarat', category: 'Aksesori' },
  fon_telinga: { label: 'Set Audio Komunikasi', category: 'Aksesori' },
  mahkota_duta: { label: 'Emblem Duta Bahasa', category: 'Aksesori Istimewa' },
  pek_jet: { label: 'Pek Tenaga Siber', category: 'Peralatan' },
  skrol_bahasa: { label: 'Modul Arkib Bahasa', category: 'Peralatan' },
  sayap_tenaga: { label: 'Pemancar Gelombang', category: 'Peralatan Istimewa' },
  komander_siber: { label: 'Jaket Ejen Siber', category: 'Pakaian' },
  jubah_kristal: { label: 'Sut Pakar Data', category: 'Pakaian Istimewa' },
  wira_neon: { label: 'Sut Wira NEXUS', category: 'Pakaian Istimewa' },
};

export const MISSIONS_CATALOG: MissionMeta[] = [
  {
    id: 1,
    code: 'MISI 01',
    title: 'Detektif Ayat',
    worldName: 'Kota NEXUS',
    worldSubtitle: 'Zon 01 · Bandaraya Utama',
    zoneId: 'zon_bandar',
    locationName: 'Kota NEXUS',
    locationCode: 'Dunia 01 · Kota NEXUS',
    shortDesc:
      'Terokai Kota NEXUS, periksa 3 papan iklan & peranti isyarat rosak dan kenal pasti ayat aktif serta pasif.',
    storyIntro:
      'Kegagalan isyarat THE LOST SIGNAL melanda Kota NEXUS! Papan iklan holografik berkelip memancarkan ayat yang bercelaru. Periksa 3 peranti isyarat di sekitar bandar untuk mengumpul Serpihan Bahasa.',
    roboBriefing:
      'Ejen, jalan raya Kota NEXUS dipenuhi papan iklan tergendala! Dekati 3 peranti komunikasi bercahaya dan tekan E untuk mengenal pasti ayat aktif dan pasif.',
    objective: 'Mengenal pasti 3 serpihan ayat aktif dan ayat pasif (SP 5.3.3).',
    fragmentLabels: [
      'Serpihan Isyarat Dataran',
      'Serpihan Isyarat Gerbang',
      'Serpihan Isyarat Arkib',
    ],
    badgeId: 'pengesan_bahasa',
    badgeTitle: 'Lencana Pengesan Bahasa',
    xpReward: 250,
    unlockItem: 'fon_telinga',
    accentColor: '#00C8F0',
    maxChallenges: 3,
  },
  {
    id: 2,
    code: 'MISI 02',
    title: 'Makmal Ayat',
    worldName: 'Makmal Neural',
    worldSubtitle: 'Zon 02 · Makmal Penyelidikan',
    zoneId: 'pusat_data',
    locationName: 'Makmal Neural',
    locationCode: 'Dunia 02 · Makmal Neural',
    shortDesc:
      'Masuki Makmal Neural dan baiki 3 terminal penyelidikan dengan membina serta menukar ayat aktif dan pasif.',
    storyIntro:
      'Selamat datang ke Makmal Neural! Mesin teras penyelidikan kehilangan struktur tatabahasa. Susun kata dan tukar bentuk ayat aktif serta pasif di 3 meja kerja holografik.',
    roboBriefing:
      'Lihat teras tenaga yang berputar di tengah makmal! Baiki kesemua 3 terminal penyelidikan untuk menstabilkan aliran data bahasa.',
    objective: 'Membina dan menukarkan 3 struktur ayat aktif dan ayat pasif dengan betul.',
    fragmentLabels: [
      'Modul Teras Alpha',
      'Modul Penukar Beta',
      'Kapsul Kuantum Bahasa',
    ],
    badgeId: 'pakar_bahasa',
    badgeTitle: 'Lencana Pakar Bahasa',
    xpReward: 320,
    unlockItem: 'jubah_kristal',
    accentColor: '#A5F05A',
    maxChallenges: 3,
  },
  {
    id: 3,
    code: 'MISI 03',
    title: 'Hakim Bahasa',
    worldName: 'Stesen Orbital',
    worldSubtitle: 'Zon 03 · Dek Kawalan Angkasa',
    zoneId: 'stesen_komunikasi',
    locationName: 'Stesen Orbital',
    locationCode: 'Dunia 03 · Stesen Orbital',
    shortDesc:
      'Berinteraksi dengan 3 pegawai di Stesen Orbital dan pilih ayat serta alasan paling tepat mengikut konteks.',
    storyIntro:
      'Dari tingkap panoramik Stesen Orbital, petugas melihat mesej kecemasan planet tersalah fokus! Bantu Pegawai Hana, Juruteknik Rafiq dan Komander Maya menilai ayat mengikut situasi.',
    roboBriefing:
      'Dekati 3 pegawai bertugas di sekeliling peta holografik orbit dan tekan E untuk membantu mereka membuat keputusan bahasa terbaik.',
    objective: 'Memilih ayat aktif atau ayat pasif yang sesuai beserta alasan konteks.',
    fragmentLabels: [
      'Sijil Penilai Siaran',
      'Kunci Pemancar Orbit',
      'Protokol Ikrar Ejen',
    ],
    badgeId: 'strategis_bahasa',
    badgeTitle: 'Lencana Strategis Bahasa',
    xpReward: 360,
    unlockItem: 'sayap_tenaga',
    accentColor: '#FFB547',
    maxChallenges: 3,
  },
  {
    id: 4,
    code: 'MISI 04',
    title: 'Studio Kreatif',
    worldName: 'Bandar Media Digital',
    worldSubtitle: 'Zon 04 · Studio Produksi',
    zoneId: 'pusat_media',
    locationName: 'Bandar Media Digital',
    locationCode: 'Dunia 04 · Studio Kreatif',
    shortDesc:
      'Masuki Bandar Media Digital dan cipta skrip mesej pemulihan dengan sekurang-kurangnya 2 ayat aktif dan 2 ayat pasif.',
    storyIntro:
      'Studio Produksi Bandar Media Digital bersedia merakam mesej rasmi! Pilih tema komuniti, tulis skrip anda di meja suntingan holografik dan semak bersama AI ROBO.',
    roboBriefing:
      'Dron kamera sedang bersedia di pentas studio! Pergi ke Konsol Penulisan Mesej Rahsia untuk merangka skrip Duta Bahasa anda.',
    objective: 'Menulis skrip bermakna dengan sekurang-kurangnya 2 ayat aktif dan 2 ayat pasif.',
    fragmentLabels: ['Skrip Siaran Rasmi Duta Bahasa'],
    badgeId: 'pencipta_mesej',
    badgeTitle: 'Lencana Pencipta Mesej',
    xpReward: 420,
    unlockItem: 'wira_neon',
    accentColor: '#7B61FF',
    maxChallenges: 1,
  },
  {
    id: 5,
    code: 'MISI 05',
    title: 'Misi Akhir · Sampaikan Mesej Anda!',
    worldName: 'Menara Langit',
    worldSubtitle: 'Zon 05 · Puncak Pencakar Langit',
    zoneId: 'menara_utama',
    locationName: 'Menara Langit NEXUS',
    locationCode: 'Dunia 05 · Menara Langit',
    shortDesc:
      'Tiba di puncak Menara Langit, hantar video mesej 1–2 minit Canva/CapCut dan pulihkan jaringan WORDOPIA.',
    storyIntro:
      'Inilah puncak pencakar langit tertinggi di WORDOPIA! Aktifkan Teras Pemulihan Menara Langit dengan pautan video mesej digital anda untuk menamatkan THE LOST SIGNAL.',
    roboBriefing:
      'Lihat cahaya bandar di bawah kita! Dekati Teras Pemulihan Menara Langit dan hantar video mesej anda untuk mengembalikan isyarat penuh WORDOPIA!',
    objective: 'Menghasilkan video mesej digital 1–2 minit dan memulihkan Menara Langit.',
    fragmentLabels: ['Teras Pancaran Duta Bahasa'],
    badgeId: 'wira_bahasa',
    badgeTitle: 'Lencana Wira Bahasa',
    xpReward: 550,
    unlockItem: 'mahkota_duta',
    accentColor: '#FFB547',
    maxChallenges: 1,
  },
];

// STRICT MAX 3 CHALLENGES FOR MISSION 01
export interface Mission1Clue {
  id: string;
  zoneLabel: string;
  sentence: string;
  correctType: 'aktif' | 'pasif';
  explanation: string;
  hintSokongan: string;
}

export const MISSION_1_CLUES: Mission1Clue[] = [
  {
    id: 'clue-1',
    zoneLabel: 'Terminal Dataran Selatan',
    sentence: 'Ejen muda itu mengesan punca gangguan isyarat di Zon Bandar.',
    correctType: 'aktif',
    explanation:
      'Ayat Aktif kerana subjek pelaku ("Ejen muda itu") berada di hadapan ayat dan diikuti kata kerja transitif berimbuhan meN- ("mengesan").',
    hintSokongan:
      'Perhatikan kata kerja "mengesan" yang bermula dengan imbuhan meN-. Pelaku melakukan tindakan di hadapan ayat.',
  },
  {
    id: 'clue-2',
    zoneLabel: 'Terminal Gerbang Barat',
    sentence: 'Papan tanda digital itu dibaiki oleh pasukan teknikal NEXUS pagi tadi.',
    correctType: 'pasif',
    explanation:
      'Ayat Pasif kerana objek ("Papan tanda digital itu") diutamakan di hadapan ayat dan menggunakan kata kerja berimbuhan di- ("dibaiki") diikuti "oleh".',
    hintSokongan:
      'Lihat kata kerja "dibaiki" (imbuhan di-) dan kata sendi "oleh". Objek berada di permulaan ayat.',
  },
  {
    id: 'clue-3',
    zoneLabel: 'Terminal Arkib Timur',
    sentence: 'Kod pemulihan komunikasi itu kami salin sebelum rangkaian terputus.',
    correctType: 'pasif',
    explanation:
      'Ayat Pasif Kata Ganti Nama Diri Pertama! Kata ganti nama "kami" hadir terus di hadapan kata kerja dasar "salin" tanpa imbuhan di-.',
    hintSokongan:
      'Ingat hukum Bahasa Melayu: kata ganti nama diri pertama ("kami/saya/kita") + kata kerja dasar ("salin") ialah Ayat Pasif.',
  },
];

// STRICT MAX 3 CHALLENGES FOR MISSION 02
export interface Mission2WordOrderTask {
  id: string;
  mode: 'susun';
  terminalName: string;
  prompt: string;
  targetType: 'aktif' | 'pasif';
  words: string[];
  correctSentence: string;
  hint: string;
  explanation: string;
}

export interface Mission2TransformTask {
  id: string;
  mode: 'tukar';
  terminalName: string;
  prompt: string;
  sourceSentence: string;
  sourceType: 'aktif' | 'pasif';
  targetType: 'aktif' | 'pasif';
  options: string[];
  correctOptionIndex: number;
  hint: string;
  explanation: string;
}

export type Mission2Task = Mission2WordOrderTask | Mission2TransformTask;

export const MISSION_2_TASKS: Mission2Task[] = [
  {
    id: 'm2-1',
    mode: 'susun',
    terminalName: 'Terminal Pelayan Alpha',
    prompt: 'Susun kad kata ini menjadi AYAT AKTIF yang gramatis untuk menghidupkan pelayan:',
    targetType: 'aktif',
    words: ['Jurutera siber', 'memulihkan', 'rangkaian utama', 'di Pusat Data.', 'kota'],
    correctSentence: 'Jurutera siber memulihkan rangkaian utama kota di Pusat Data.',
    hint: 'Mulakan dengan pelaku ("Jurutera siber"), diikuti kata kerja "memulihkan", objek, dan tempat.',
    explanation:
      'Susunan Ayat Aktif yang tepat ialah Subjek (Jurutera siber) + Kata Kerja Transitif (memulihkan) + Objek (rangkaian utama kota) + Keterangan.',
  },
  {
    id: 'm2-2',
    mode: 'tukar',
    terminalName: 'Terminal Pelayan Beta',
    prompt: 'Tukarkan AYAT AKTIF ini kepada AYAT PASIF diri ketiga yang betul:',
    sourceSentence: 'Pasukan WORDOPIA menyalurkan tenaga bersih ke seluruh bandar.',
    sourceType: 'aktif',
    targetType: 'pasif',
    options: [
      'Tenaga bersih disalurkan oleh Pasukan WORDOPIA ke seluruh bandar.',
      'Tenaga bersih Pasukan WORDOPIA menyalurkan ke seluruh bandar.',
      'Pasukan WORDOPIA disalurkan oleh tenaga bersih ke seluruh bandar.',
      'Tenaga bersih menyalurkan oleh Pasukan WORDOPIA ke seluruh bandar.',
    ],
    correctOptionIndex: 0,
    hint: 'Pindahkan objek ("Tenaga bersih") ke hadapan dan tukar "menyalurkan" kepada "disalurkan oleh".',
    explanation:
      '"Tenaga bersih disalurkan oleh Pasukan WORDOPIA ke seluruh bandar." ialah Ayat Pasif yang betul.',
  },
  {
    id: 'm2-3',
    mode: 'tukar',
    terminalName: 'Terminal Teras Kuantum',
    prompt: 'Tukarkan AYAT AKTIF Kata Ganti Nama Diri Pertama ini kepada AYAT PASIF yang tepat:',
    sourceSentence: 'Saya menguji kod keselamatan itu di Makmal Pusat Data.',
    sourceType: 'aktif',
    targetType: 'pasif',
    options: [
      'Kod keselamatan itu diuji oleh saya di Makmal Pusat Data.',
      'Kod keselamatan itu saya uji di Makmal Pusat Data.',
      'Kod keselamatan itu saya menguji di Makmal Pusat Data.',
      'Saya diuji kod keselamatan itu di Makmal Pusat Data.',
    ],
    correctOptionIndex: 1,
    hint: 'Untuk kata ganti nama diri pertama ("saya"), JANGAN guna "di-... oleh". Gunakan "saya uji" tanpa imbuhan!',
    explanation:
      'Tepat! Bagi kata ganti nama diri pertama ("saya"), bentuk pasif yang gramatis ialah "Kod keselamatan itu saya uji...".',
  },
];

// STRICT MAX 3 CHALLENGES FOR MISSION 03
export interface Mission3Scenario {
  id: string;
  stationName: string;
  characterName: string;
  characterRole: string;
  situation: string;
  contextFocus: string;
  sentenceChoices: {
    text: string;
    type: 'aktif' | 'pasif';
    isBest: boolean;
  }[];
  reasonChoices: {
    text: string;
    isCorrect: boolean;
  }[];
  roboTip: string;
  explanation: string;
}

export const MISSION_3_SCENARIOS: Mission3Scenario[] = [
  {
    id: 'm3-1',
    stationName: 'Bilik Siaran Utara',
    characterName: 'Pegawai Hana',
    characterRole: 'Penyiar Bandar NEXUS',
    situation:
      'Pegawai Hana mahu menyeru semua warga NEXUS supaya menjaga keselamatan laluan siber dengan segera.',
    contextFocus: 'Menekankan pelaku (semua warga NEXUS) supaya mengambil tindakan langsung.',
    sentenceChoices: [
      {
        text: 'Semua warga NEXUS perlu menjaga keselamatan laluan siber setiap masa.',
        type: 'aktif',
        isBest: true,
      },
      {
        text: 'Keselamatan laluan siber dijaga oleh seseorang.',
        type: 'pasif',
        isBest: false,
      },
      {
        text: 'Laluan siber itu ditutup oleh pekerja malam tadi.',
        type: 'pasif',
        isBest: false,
      },
    ],
    reasonChoices: [
      {
        text: 'Ayat aktif memberi tumpuan jelas kepada pelaku ("Semua warga NEXUS") untuk bertindak.',
        isCorrect: true,
      },
      {
        text: 'Kerana ayat ini tidak mempunyai kata kerja langsung.',
        isCorrect: false,
      },
    ],
    roboTip:
      'Apabila mahu menyeru warga bertindak secara langsung, pilih Ayat Aktif!',
    explanation:
      'Ayat Aktif meletakkan "Semua warga NEXUS" di hadapan sebagai seruan tanggungjawab terus.',
  },
  {
    id: 'm3-2',
    stationName: 'Dek Antena Timur',
    characterName: 'Juruteknik Rafiq',
    characterRole: 'Ketua Pemancar NEXUS',
    situation:
      'Buletin kecemasan ingin menonjolkan pemancar utama yang telah berjaya dipulihkan kepada orang ramai.',
    contextFocus: 'Menonjolkan objek berita (Pemancar Utama Timur) sebagai fokus utama.',
    sentenceChoices: [
      {
        text: 'Seseorang memeriksa kabel di bilik teknikal pagi ini.',
        type: 'aktif',
        isBest: false,
      },
      {
        text: 'Pemancar Utama Timur telah berjaya dipulihkan oleh pasukan jurutera.',
        type: 'pasif',
        isBest: true,
      },
      {
        text: 'Mereka berjalan menuju ke Stesen Komunikasi.',
        type: 'aktif',
        isBest: false,
      },
    ],
    reasonChoices: [
      {
        text: 'Ayat pasif menonjolkan objek penting berita ("Pemancar Utama Timur") di permulaan ayat.',
        isCorrect: true,
      },
      {
        text: 'Kerana berita rasmi dilarang menyebut nama pasukan jurutera.',
        isCorrect: false,
      },
    ],
    roboTip:
      'Dalam laporan berita yang mengutamakan objek atau hasil pemulihan, Ayat Pasif ialah pilihan terbaik!',
    explanation:
      'Ayat Pasif menjadikan "Pemancar Utama Timur" sebagai fokus pembaca berita.',
  },
  {
    id: 'm3-3',
    stationName: 'Konsol Keselamatan Kata',
    characterName: 'Komander Maya',
    characterRole: 'Penasihat Protokol Digital',
    situation:
      'Komander Maya meminta kamu menulis ikrar peribadi tentang perlindungan kata laluan rasmi ejen.',
    contextFocus: 'Menggunakan kata ganti nama diri pertama dalam Ayat Pasif yang betul.',
    sentenceChoices: [
      {
        text: 'Kata laluan ejen tidak akan didedahkan oleh saya kepada pihak luar.',
        type: 'pasif',
        isBest: false,
      },
      {
        text: 'Kata laluan ejen tidak akan saya dedahkan kepada pihak luar.',
        type: 'pasif',
        isBest: true,
      },
      {
        text: 'Pihak luar didedahkan kata laluan oleh saya.',
        type: 'pasif',
        isBest: false,
      },
    ],
    reasonChoices: [
      {
        text: 'Struktur pasif kata ganti nama diri pertama ("tidak akan saya dedahkan") adalah gramatis dan tepat.',
        isCorrect: true,
      },
      {
        text: 'Kerana frasa "oleh saya" wajib ditambah di hujung semua ayat pasif.',
        isCorrect: false,
      },
    ],
    roboTip:
      'Awas! Untuk "saya", gunakan struktur "objek + kata bantu + saya + kata dasar".',
    explanation:
      '"Kata laluan ejen tidak akan saya dedahkan..." mematuhi hukum tatabahasa pasif diri pertama.',
  },
];

export const MISSION_4_THEMES = [
  {
    id: 'alam',
    label: 'Pemeliharaan Alam Sekitar & Bandar Hijau',
    starterHint:
      'Aktif: "Semua murid perlu mengasingkan sisa plastik setiap hari." | Pasif: "Alam sekitar dapat kita pelihara bersama-sama."',
  },
  {
    id: 'siber',
    label: 'Keselamatan Siber & Etika Komunikasi',
    starterHint:
      'Aktif: "Pengguna bijak menyemak kesahihan berita sebelum berkongsi." | Pasif: "Maklumat peribadi mestilah kita lindungi dengan teliti."',
  },
  {
    id: 'membaca',
    label: 'Budaya Membaca & Ilmu Pengetahuan',
    starterHint:
      'Aktif: "Rakan-rakan sebaya patut meluangkan masa membaca buku." | Pasif: "Pelbagai ilmu baharu dapat diteroka oleh pelajar."',
  },
  {
    id: 'perpaduan',
    label: 'Hormati Rakan & Bahasa Sopan',
    starterHint:
      'Aktif: "Setiap pelajar perlu menuturkan bahasa yang sopan." | Pasif: "Suasana harmoni di sekolah dapat diwujudkan oleh semua warga."',
  },
];

export const MISSION_4_AUDIENCES = [
  'Rakan Sebaya Tahun 6',
  'Warga Sekolah',
  'Komuniti & Ibu Bapa',
];

export function computeLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const safeXp = Math.max(0, xp);
  const perLevel = 250;
  const level = Math.floor(safeXp / perLevel) + 1;
  const currentLevelXp = safeXp % perLevel;
  return {
    level,
    currentLevelXp,
    nextLevelXp: perLevel,
    progressPercent: Math.min(100, Math.round((currentLevelXp / perLevel) * 100)),
  };
}

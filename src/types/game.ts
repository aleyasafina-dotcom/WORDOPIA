export type UserRole = 'murid' | 'guru' | 'pentadbir';

export type LearningPathway = 'sokongan' | 'kendiri' | 'cabaran';

export type HeroId = 'arka' | 'nara' | 'zayan' | 'mika';

export type CityZoneId =
  | 'zon_bandar'
  | 'pusat_data'
  | 'stesen_komunikasi'
  | 'pusat_media'
  | 'menara_utama';

export type MissionWorldId = 1 | 2 | 3 | 4 | 5;

export type PlayerAnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'landing'
  | 'ascend'
  | 'interact'
  | 'victory';

export type MissionStatus =
  | 'belum_dibuka'
  | 'tersedia'
  | 'sedang_dilaksanakan'
  | 'selesai';

export interface ChallengeAttemptStats {
  correctAttempts: number;
  incorrectAttempts: number;
  lastAttemptAt?: string;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  genderLabel: string;
  hairDesc: string;
  outfitDesc: string;
  personality: string;
  roleTitle: string;
  primaryColor: string;
  secondaryColor: string;
  hairColor: string;
  skinTone: string;
  coatStyle: 'long_trench' | 'tactical_jacket' | 'field_parka' | 'cyber_blazer';
  hairVariant: 'short_taper' | 'ponytail' | 'wavy_textured' | 'shoulder_bob';
  modelAssetPath: string;
}

export interface PlayerWorldPosition {
  zone: CityZoneId;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface CharacterConfig {
  style: 'putra' | 'putri';
  skinTone: string;
  faceExpression: 'ceria' | 'yakin' | 'pintar';
  hairStyle:
    | 'pendek_futuristik'
    | 'bob_beralun'
    | 'ikat_ekor'
    | 'sanggul_moden'
    | 'spiky_cyber';
  hairColor: string;
  outfitStyle:
    | 'penjelajah_langit'
    | 'komander_siber'
    | 'jubah_kristal'
    | 'wira_neon';
  outfitColor: string;
  shoeStyle: 'but_kuantum' | 'kasut_aeropecut' | 'but_pelindung';
  accessory: 'tiada' | 'kaca_holo' | 'fon_telinga' | 'mahkota_duta';
  backpack: 'tiada' | 'pek_jet' | 'skrol_bahasa' | 'sayap_tenaga';
}

export interface MissionProgressItem {
  missionId: number;
  status: MissionStatus;
  score: number;
  attempts: number;
  completedAt: string | null;
  notes?: string;
}

export interface ScriptSubmission {
  id?: number;
  userId: string;
  issue: string;
  audience: string;
  title: string;
  scriptText: string;
  activeSentences: string[];
  passiveSentences: string[];
  aiFeedback: string;
  teacherFeedback: string;
  status: 'draf' | 'dihantar' | 'perlu_pembaikan' | 'diluluskan';
  updatedAt: string;
}

export interface VideoSubmission {
  id?: number;
  userId: string;
  tool: 'Canva' | 'CapCut' | 'Lain-lain';
  videoUrl: string;
  reflection: string;
  rubricKandungan: number;
  rubricTatabahasa: number;
  rubricKreativiti: number;
  rubricPenyampaian: number;
  teacherComment: string;
  status: 'belum_dihantar' | 'menunggu_semakan' | 'disahkan';
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  className: string;
  xp: number;
  level: number;
  pathway: LearningPathway;
  badges: string[];
  unlockedItems: string[];
  isDutaBahasa: boolean;
  hasSeenIntro: boolean;
  selectedHero: HeroId | null;
  playerPosition: PlayerWorldPosition;
  completedChallenges: Record<string, string[]>;
  challengeStats: Record<string, ChallengeAttemptStats>;
  collectedFragments: string[];
  character: CharacterConfig;
}

export interface PlayerState {
  user: UserProfile;
  missions: MissionProgressItem[];
  scriptSubmission: ScriptSubmission | null;
  videoSubmission: VideoSubmission | null;
}

export interface ShowcaseItem {
  id: number;
  userId: string;
  studentName: string;
  className: string;
  title: string;
  issue: string;
  audience: string;
  tool: string;
  videoUrl: string;
  isDutaBahasa: boolean;
  peerComments: {
    id: number;
    authorName: string;
    comment: string;
    createdAt: string;
  }[];
}

export interface MissionMeta {
  id: MissionWorldId;
  code: string;
  title: string;
  worldName: string;
  worldSubtitle: string;
  zoneId: CityZoneId;
  locationName: string;
  locationCode: string;
  shortDesc: string;
  storyIntro: string;
  roboBriefing: string;
  objective: string;
  fragmentLabels: string[];
  badgeId: string;
  badgeTitle: string;
  xpReward: number;
  unlockItem: string;
  accentColor: string;
  maxChallenges: number;
}

export interface CityZoneMeta {
  id: CityZoneId;
  missionId: number;
  name: string;
  shortLabel: string;
  accentColor: string;
  center: { x: number; z: number };
  radius: number;
  spawnPoint: { x: number; z: number; yaw: number };
}

export interface WorldInteractable {
  id: string;
  missionId: number;
  zoneId: CityZoneId;
  kind: 'clue' | 'terminal' | 'npc' | 'studio_terminal' | 'tower_core' | 'world_portal';
  label: string;
  subtitle: string;
  position: { x: number; y: number; z: number };
  challengeId?: string;
  targetWorldId?: MissionWorldId;
}

export type RoboMood = 'mesra' | 'amaran' | 'berfikir' | 'bangga' | 'teruja';

export type GameView =
  | 'opening'
  | 'about'
  | 'portals'
  | 'login'
  | 'character_select'
  | 'city_play'
  | 'dewan_wira'
  | 'ceremony'
  | 'teacher_portal'
  | 'admin_portal';

export type TeleportPhaseId =
  | 'idle'
  | 'activate'
  | 'eruption'
  | 'ascend'
  | 'transform'
  | 'tunnel'
  | 'arrive';

export interface TeleportProgressInfo {
  active: boolean;
  phase: TeleportPhaseId;
  phaseNumber: number;
  targetWorldId: MissionWorldId;
  flashOpacity: number;
  canSkip: boolean;
}

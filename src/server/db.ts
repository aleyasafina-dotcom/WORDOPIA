import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  DEFAULT_CHARACTER,
  DEFAULT_PLAYER_POSITION,
  MISSIONS_CATALOG,
  computeLevelFromXp,
} from '../data/missions.ts';
import type {
  ChallengeAttemptStats,
  CharacterConfig,
  HeroId,
  LearningPathway,
  MissionProgressItem,
  MissionStatus,
  PlayerState,
  PlayerWorldPosition,
  ScriptSubmission,
  ShowcaseItem,
  UserProfile,
  UserRole,
  VideoSubmission,
} from '../types/game.ts';

const DB_PATH = path.join(process.cwd(), 'wordopia.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, original] = stored.split(':');
  if (!salt || !original) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const bufA = Buffer.from(hash, 'hex');
  const bufB = Buffer.from(original, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      teacher_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('murid', 'guru', 'pentadbir')),
      class_name TEXT NOT NULL DEFAULT '6 Bestari',
      xp INTEGER NOT NULL DEFAULT 0,
      pathway TEXT NOT NULL DEFAULT 'kendiri' CHECK(pathway IN ('sokongan', 'kendiri', 'cabaran')),
      badges_json TEXT NOT NULL DEFAULT '[]',
      unlocked_items_json TEXT NOT NULL DEFAULT '["kaca_holo","pek_jet","but_kuantum","penjelajah_langit"]',
      is_duta_bahasa INTEGER NOT NULL DEFAULT 0,
      has_seen_intro INTEGER NOT NULL DEFAULT 0,
      character_json TEXT NOT NULL,
      hero_id TEXT DEFAULT NULL,
      player_pos_json TEXT DEFAULT NULL,
      challenge_progress_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mission_progress (
      user_id TEXT NOT NULL,
      mission_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('belum_dibuka', 'tersedia', 'sedang_dilaksanakan', 'selesai')),
      score INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      notes TEXT DEFAULT '',
      PRIMARY KEY (user_id, mission_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS script_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      issue TEXT NOT NULL,
      audience TEXT NOT NULL,
      title TEXT NOT NULL,
      script_text TEXT NOT NULL,
      active_sentences_json TEXT NOT NULL DEFAULT '[]',
      passive_sentences_json TEXT NOT NULL DEFAULT '[]',
      ai_feedback TEXT NOT NULL DEFAULT '',
      teacher_feedback TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draf' CHECK(status IN ('draf', 'dihantar', 'perlu_pembaikan', 'diluluskan')),
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      tool TEXT NOT NULL DEFAULT 'Canva',
      video_url TEXT NOT NULL,
      reflection TEXT NOT NULL,
      rubric_kandungan INTEGER NOT NULL DEFAULT 0,
      rubric_tatabahasa INTEGER NOT NULL DEFAULT 0,
      rubric_kreativiti INTEGER NOT NULL DEFAULT 0,
      rubric_penyampaian INTEGER NOT NULL DEFAULT 0,
      teacher_comment TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'menunggu_semakan' CHECK(status IN ('belum_dihantar', 'menunggu_semakan', 'disahkan')),
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS peer_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_user_id TEXT NOT NULL,
      author_user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mission_overrides (
      mission_id INTEGER PRIMARY KEY,
      custom_title TEXT NOT NULL,
      custom_briefing TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe backwards-compatible migrations for existing wordopia.db
  const cols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('hero_id')) {
    db.exec('ALTER TABLE users ADD COLUMN hero_id TEXT DEFAULT NULL');
    db.prepare("UPDATE users SET hero_id = 'nara' WHERE id = 'usr-murid-izzah'").run();
    db.prepare("UPDATE users SET hero_id = 'zayan' WHERE id = 'usr-murid-danish'").run();
    db.prepare("UPDATE users SET hero_id = 'nara' WHERE id = 'usr-guru-farah'").run();
    db.prepare("UPDATE users SET hero_id = 'arka' WHERE id = 'usr-admin-sistem'").run();
  }
  if (!colNames.has('player_pos_json')) {
    db.exec('ALTER TABLE users ADD COLUMN player_pos_json TEXT DEFAULT NULL');
  }
  if (!colNames.has('challenge_progress_json')) {
    db.exec("ALTER TABLE users ADD COLUMN challenge_progress_json TEXT NOT NULL DEFAULT '{}'");
  }
  if (!colNames.has('challenge_stats_json')) {
    db.exec("ALTER TABLE users ADD COLUMN challenge_stats_json TEXT NOT NULL DEFAULT '{}'");
  }
  if (!colNames.has('collected_fragments_json')) {
    db.exec("ALTER TABLE users ADD COLUMN collected_fragments_json TEXT NOT NULL DEFAULT '[]'");
  }

  seedInitialData();
}

export function initializeMissionsForUser(userId: string): void {
  const insertMission = db.prepare(`
    INSERT OR IGNORE INTO mission_progress (user_id, mission_id, status, score, attempts, completed_at, notes)
    VALUES (?, ?, ?, 0, 0, NULL, '')
  `);

  for (const m of MISSIONS_CATALOG) {
    const initialStatus: MissionStatus = m.id === 1 ? 'tersedia' : 'belum_dibuka';
    insertMission.run(userId, m.id, initialStatus);
  }
}

function seedInitialData(): void {
  const now = new Date().toISOString();
  const classCount = db.prepare('SELECT COUNT(*) as c FROM classes').get() as { c: number };
  if (classCount.c === 0) {
    const insertClass = db.prepare('INSERT INTO classes (name, teacher_name, created_at) VALUES (?, ?, ?)');
    insertClass.run('6 Bestari', 'Cikgu Farah', now);
    insertClass.run('6 Inovatif', 'Cikgu Farah', now);
    insertClass.run('6 Wawasan', 'Cikgu Hakimi', now);
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, class_name, xp, pathway,
      badges_json, unlocked_items_json, is_duta_bahasa, has_seen_intro, character_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Fresh Student
  const aimanId = 'usr-murid-aiman';
  insertUser.run(
    aimanId,
    'Aiman Hakim',
    'aiman@wordopia.edu.my',
    hashPassword('wordopia123'),
    'murid',
    '6 Bestari',
    120,
    'kendiri',
    JSON.stringify(['pereka_identiti']),
    JSON.stringify(['kaca_holo', 'pek_jet', 'but_kuantum', 'penjelajah_langit', 'komander_siber']),
    0,
    0,
    JSON.stringify(DEFAULT_CHARACTER),
    now
  );
  initializeMissionsForUser(aimanId);

  // 2. Advanced Student with Mission 1-3 completed + Mission 4 script submitted
  const izzahId = 'usr-murid-izzah';
  const izzahChar: CharacterConfig = {
    ...DEFAULT_CHARACTER,
    style: 'putri',
    hairStyle: 'ikat_ekor',
    hairColor: '#3B2314',
    outfitStyle: 'jubah_kristal',
    outfitColor: '#7B61FF',
    accessory: 'fon_telinga',
    backpack: 'sayap_tenaga',
  };
  insertUser.run(
    izzahId,
    'Nurul Izzah',
    'izzah@wordopia.edu.my',
    hashPassword('wordopia123'),
    'murid',
    '6 Bestari',
    980,
    'cabaran',
    JSON.stringify(['pereka_identiti', 'pengesan_bahasa', 'pakar_bahasa', 'strategis_bahasa', 'pencipta_mesej']),
    JSON.stringify([
      'kaca_holo',
      'pek_jet',
      'but_kuantum',
      'penjelajah_langit',
      'komander_siber',
      'fon_telinga',
      'jubah_kristal',
      'sayap_tenaga',
      'wira_neon',
    ]),
    0,
    1,
    JSON.stringify(izzahChar),
    now
  );
  const insertMp = db.prepare(`
    INSERT INTO mission_progress (user_id, mission_id, status, score, attempts, completed_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertMp.run(izzahId, 1, 'selesai', 100, 1, now, 'Cemerlang di Zon Pengesanan');
  insertMp.run(izzahId, 2, 'selesai', 95, 1, now, 'Menukar semua ayat dengan tepat');
  insertMp.run(izzahId, 3, 'selesai', 100, 1, now, 'Pilihan konteks yang amat tepat');
  insertMp.run(izzahId, 4, 'selesai', 92, 1, now, 'Skrip mesej telah dihantar');
  insertMp.run(izzahId, 5, 'tersedia', 0, 0, null, '');

  db.prepare(`
    INSERT INTO script_submissions (
      user_id, issue, audience, title, script_text, active_sentences_json, passive_sentences_json,
      ai_feedback, teacher_feedback, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    izzahId,
    'Pemeliharaan Alam Sekitar & Kitar Semula',
    'Warga Sekolah',
    'Wira Hijau Selamatkan Bumi Wordopia',
    'Salam sejahtera warga sekolah! Semua murid perlu mengasingkan sisa plastik di dalam tong kitar semula. Selain itu, pasukan kelab alam sekitar menanam pokok baharu di taman sekolah. Kawasan sekolah yang bersih dapat kita nikmati bersama-sama. Marilah kita menjaga alam sekitar kerana bumi ini diwarisi oleh generasi masa hadapan.',
    JSON.stringify([
      'Semua murid perlu mengasingkan sisa plastik di dalam tong kitar semula.',
      'Pasukan kelab alam sekitar menanam pokok baharu di taman sekolah.',
    ]),
    JSON.stringify([
      'Kawasan sekolah yang bersih dapat kita nikmati bersama-sama.',
      'Bumi ini diwarisi oleh generasi masa hadapan.',
    ]),
    'Hebat! ROBO mendapati skrip kamu mengandungi 2 ayat aktif dan 2 ayat pasif yang gramatis termasuk bentuk pasif kata ganti nama diri pertama ("dapat kita nikmati").',
    'Bagus Nurul Izzah! Skrip jelas dan sangat sesuai untuk video Canva/CapCut. Teruskan ke Misi 05.',
    'diluluskan',
    now
  );

  // 3. Certified Student showcase example
  const danishId = 'usr-murid-danish';
  insertUser.run(
    danishId,
    'Danish Irfan',
    'danish@wordopia.edu.my',
    hashPassword('wordopia123'),
    'murid',
    '6 Inovatif',
    1850,
    'kendiri',
    JSON.stringify([
      'pereka_identiti',
      'pengesan_bahasa',
      'pakar_bahasa',
      'strategis_bahasa',
      'pencipta_mesej',
      'wira_bahasa',
    ]),
    JSON.stringify([
      'kaca_holo',
      'pek_jet',
      'but_kuantum',
      'penjelajah_langit',
      'komander_siber',
      'fon_telinga',
      'jubah_kristal',
      'sayap_tenaga',
      'wira_neon',
      'mahkota_duta',
    ]),
    1,
    1,
    JSON.stringify({ ...DEFAULT_CHARACTER, outfitStyle: 'wira_neon', accessory: 'mahkota_duta' }),
    now
  );
  for (let m = 1; m <= 5; m++) {
    insertMp.run(danishId, m, 'selesai', 96, 1, now, 'Operasi selesai');
  }
  db.prepare(`
    INSERT INTO script_submissions (
      user_id, issue, audience, title, script_text, active_sentences_json, passive_sentences_json,
      ai_feedback, teacher_feedback, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    danishId,
    'Keselamatan Siber & Etika Digital',
    'Rakan Sebaya Tahun 6',
    'Benteng Siber Pengembara Muda',
    'Rakan-rakan sekalian, pengguna bijak sentiasa menyemak kesahihan berita sebelum berkongsi. Kita juga harus menggunakan kata laluan yang kuat setiap masa. Maklumat peribadi tidak patut kita dedahkan kepada orang yang tidak dikenali. Etika siber yang baik diamalkan oleh warga Wordopia untuk membina komuniti digital yang selamat.',
    JSON.stringify([
      'Pengguna bijak sentiasa menyemak kesahihan berita sebelum berkongsi.',
      'Kita juga harus menggunakan kata laluan yang kuat setiap masa.',
    ]),
    JSON.stringify([
      'Maklumat peribadi tidak patut kita dedahkan kepada orang yang tidak dikenali.',
      'Etika siber yang baik diamalkan oleh warga Wordopia.',
    ]),
    'Cemerlang! Struktur ayat aktif dan pasif sangat tepat.',
    'Tahniah Danish! Mesej padat dan berkesan.',
    'diluluskan',
    now
  );
  db.prepare(`
    INSERT INTO video_submissions (
      user_id, tool, video_url, reflection, rubric_kandungan, rubric_tatabahasa, rubric_kreativiti, rubric_penyampaian,
      teacher_comment, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    danishId,
    'Canva',
    'https://www.canva.com/design/contoh-duta-bahasa-danish',
    'Saya belajar membezakan ayat aktif dan ayat pasif kata ganti nama diri pertama dengan lebih yakin semasa merakam suara latar video.',
    25,
    25,
    24,
    24,
    'Video Canva yang kreatif dengan sebutan Bahasa Melayu baku yang amat jelas. Diluluskan sebagai Duta Bahasa WORDOPIA!',
    'disahkan',
    now
  );
  db.prepare(`
    INSERT INTO peer_feedback (submission_user_id, author_user_id, author_name, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    danishId,
    izzahId,
    'Nurul Izzah',
    'Tahniah Danish! Penggunaan ayat pasif "tidak patut kita dedahkan" sangat tepat dan mudah difahami.',
    now
  );

  // 4. Teacher account
  const guruId = 'usr-guru-farah';
  insertUser.run(
    guruId,
    'Cikgu Farah',
    'guru@wordopia.edu.my',
    hashPassword('guru123'),
    'guru',
    '6 Bestari',
    1200,
    'kendiri',
    JSON.stringify(['wira_bahasa']),
    JSON.stringify(['kaca_holo', 'pek_jet', 'mahkota_duta', 'jubah_kristal']),
    1,
    1,
    JSON.stringify({ ...DEFAULT_CHARACTER, style: 'putri', outfitStyle: 'jubah_kristal', accessory: 'kaca_holo' }),
    now
  );
  initializeMissionsForUser(guruId);

  // 5. Admin account
  const adminId = 'usr-admin-sistem';
  insertUser.run(
    adminId,
    'Pentadbir Wordopia',
    'admin@wordopia.edu.my',
    hashPassword('admin123'),
    'pentadbir',
    'Pentadbiran',
    2000,
    'cabaran',
    JSON.stringify(['wira_bahasa']),
    JSON.stringify(['kaca_holo', 'pek_jet', 'mahkota_duta', 'wira_neon']),
    1,
    1,
    JSON.stringify({ ...DEFAULT_CHARACTER, outfitStyle: 'komander_siber', accessory: 'kaca_holo' }),
    now
  );
  initializeMissionsForUser(adminId);
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapUserRowToProfile(row: Record<string, unknown>): UserProfile {
  const xp = Number(row.xp ?? 0);
  const { level } = computeLevelFromXp(xp);
  const rawHero = row.hero_id ? String(row.hero_id) : null;
  const selectedHero: HeroId | null =
    rawHero === 'arka' || rawHero === 'nara' || rawHero === 'zayan' || rawHero === 'mika'
      ? rawHero
      : null;

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as UserRole,
    className: String(row.class_name ?? '6 Bestari'),
    xp,
    level,
    pathway: (row.pathway as LearningPathway) || 'kendiri',
    badges: parseJsonSafe<string[]>(String(row.badges_json ?? '[]'), []),
    unlockedItems: parseJsonSafe<string[]>(
      String(row.unlocked_items_json ?? '[]'),
      ['kaca_holo', 'pek_jet', 'but_kuantum', 'penjelajah_langit']
    ),
    isDutaBahasa: Boolean(row.is_duta_bahasa),
    hasSeenIntro: Boolean(row.has_seen_intro),
    selectedHero,
    playerPosition: row.player_pos_json
      ? parseJsonSafe<PlayerWorldPosition>(String(row.player_pos_json), DEFAULT_PLAYER_POSITION)
      : DEFAULT_PLAYER_POSITION,
    completedChallenges: parseJsonSafe<Record<string, string[]>>(
      String(row.challenge_progress_json ?? '{}'),
      {}
    ),
    challengeStats: parseJsonSafe<Record<string, ChallengeAttemptStats>>(
      String(row.challenge_stats_json ?? '{}'),
      {}
    ),
    collectedFragments: parseJsonSafe<string[]>(
      String(row.collected_fragments_json ?? '[]'),
      []
    ),
    character: parseJsonSafe<CharacterConfig>(String(row.character_json ?? '{}'), DEFAULT_CHARACTER),
  };
}

export function getPlayerState(userId: string): PlayerState | null {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | Record<string, unknown>
    | undefined;
  if (!userRow) return null;

  initializeMissionsForUser(userId);

  const missionRows = db
    .prepare('SELECT * FROM mission_progress WHERE user_id = ? ORDER BY mission_id ASC')
    .all(userId) as Record<string, unknown>[];

  const missions: MissionProgressItem[] = missionRows.map((m) => ({
    missionId: Number(m.mission_id),
    status: m.status as MissionStatus,
    score: Number(m.score ?? 0),
    attempts: Number(m.attempts ?? 0),
    completedAt: m.completed_at ? String(m.completed_at) : null,
    notes: m.notes ? String(m.notes) : '',
  }));

  const scriptRow = db.prepare('SELECT * FROM script_submissions WHERE user_id = ?').get(userId) as
    | Record<string, unknown>
    | undefined;
  const scriptSubmission: ScriptSubmission | null = scriptRow
    ? {
        id: Number(scriptRow.id),
        userId: String(scriptRow.user_id),
        issue: String(scriptRow.issue),
        audience: String(scriptRow.audience),
        title: String(scriptRow.title),
        scriptText: String(scriptRow.script_text),
        activeSentences: parseJsonSafe<string[]>(String(scriptRow.active_sentences_json ?? '[]'), []),
        passiveSentences: parseJsonSafe<string[]>(String(scriptRow.passive_sentences_json ?? '[]'), []),
        aiFeedback: String(scriptRow.ai_feedback ?? ''),
        teacherFeedback: String(scriptRow.teacher_feedback ?? ''),
        status: scriptRow.status as ScriptSubmission['status'],
        updatedAt: String(scriptRow.updated_at),
      }
    : null;

  const videoRow = db.prepare('SELECT * FROM video_submissions WHERE user_id = ?').get(userId) as
    | Record<string, unknown>
    | undefined;
  const videoSubmission: VideoSubmission | null = videoRow
    ? {
        id: Number(videoRow.id),
        userId: String(videoRow.user_id),
        tool: videoRow.tool as VideoSubmission['tool'],
        videoUrl: String(videoRow.video_url),
        reflection: String(videoRow.reflection),
        rubricKandungan: Number(videoRow.rubric_kandungan ?? 0),
        rubricTatabahasa: Number(videoRow.rubric_tatabahasa ?? 0),
        rubricKreativiti: Number(videoRow.rubric_kreativiti ?? 0),
        rubricPenyampaian: Number(videoRow.rubric_penyampaian ?? 0),
        teacherComment: String(videoRow.teacher_comment ?? ''),
        status: videoRow.status as VideoSubmission['status'],
        updatedAt: String(videoRow.updated_at),
      }
    : null;

  return {
    user: mapUserRowToProfile(userRow),
    missions,
    scriptSubmission,
    videoSubmission,
  };
}

export function getShowcaseItems(): ShowcaseItem[] {
  const rows = db
    .prepare(
      `SELECT v.id, v.user_id, v.tool, v.video_url, u.name as student_name, u.class_name, u.is_duta_bahasa,
              COALESCE(s.title, 'Mesej Duta Bahasa') as title,
              COALESCE(s.issue, 'Komunikasi Bahasa Melayu') as issue,
              COALESCE(s.audience, 'Warga Sekolah') as audience
       FROM video_submissions v
       JOIN users u ON u.id = v.user_id
       LEFT JOIN script_submissions s ON s.user_id = v.user_id
       ORDER BY v.updated_at DESC
       LIMIT 20`
    )
    .all() as Record<string, unknown>[];

  const commentsStmt = db.prepare(
    'SELECT id, author_name, comment, created_at FROM peer_feedback WHERE submission_user_id = ? ORDER BY id DESC'
  );

  return rows.map((r) => {
    const commentRows = commentsStmt.all(String(r.user_id)) as Record<string, unknown>[];
    return {
      id: Number(r.id),
      userId: String(r.user_id),
      studentName: String(r.student_name),
      className: String(r.class_name),
      title: String(r.title),
      issue: String(r.issue),
      audience: String(r.audience),
      tool: String(r.tool),
      videoUrl: String(r.video_url),
      isDutaBahasa: Boolean(r.is_duta_bahasa),
      peerComments: commentRows.map((c) => ({
        id: Number(c.id),
        authorName: String(c.author_name),
        comment: String(c.comment),
        createdAt: String(c.created_at),
      })),
    };
  });
}

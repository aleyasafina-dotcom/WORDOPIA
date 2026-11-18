import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  db,
  getPlayerState,
  getShowcaseItems,
  hashPassword,
  initDatabase,
  initializeMissionsForUser,
  mapUserRowToProfile,
  verifyPassword,
} from './src/server/db.ts';
import {
  DEFAULT_CHARACTER,
  MISSIONS_CATALOG,
  heroToCharacterConfig,
} from './src/data/missions.ts';
import type {
  CharacterConfig,
  HeroId,
  LearningPathway,
  PlayerWorldPosition,
  UserProfile,
  UserRole,
} from './src/types/game.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = 3000;

interface AuthRequest extends Request {
  authUser?: UserProfile;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesi pengembara diperlukan. Sila log masuk dahulu.' });
    return;
  }

  const session = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { user_id: string; expires_at: string } | undefined;

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    res.status(401).json({ error: 'Sesi telah tamat tempoh. Sila log masuk semula.' });
    return;
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as
    | Record<string, unknown>
    | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Akaun pengguna tidak dijumpai.' });
    return;
  }

  req.authUser = mapUserRowToProfile(userRow);
  next();
}

function requireRole(allowed: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser || !allowed.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Akses ditolak. Peranan anda tidak dibenarkan untuk tindakan ini.' });
      return;
    }
    next();
  };
}

function createSessionToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  return token;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// =========================================================================
// AUTHENTICATION ENDPOINTS (RBAC Protected)
// =========================================================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const className = String(req.body?.className ?? '6 Bestari').trim() || '6 Bestari';

  if (name.length < 2 || name.length > 60) {
    res.status(400).json({ error: 'Nama pengembara mestilah antara 2 hingga 60 aksara.' });
    return;
  }
  if (!email.includes('@') || email.length > 100) {
    res.status(400).json({ error: 'Sila masukkan alamat e-mel yang sah.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'E-mel ini telah didaftarkan. Sila log masuk.' });
    return;
  }

  const userId = `usr-${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  // SECURITY: Self-registration ALWAYS forces role = 'murid'. Students cannot elevate privileges.
  db.prepare(
    `INSERT INTO users (
      id, name, email, password_hash, role, class_name, xp, pathway,
      badges_json, unlocked_items_json, is_duta_bahasa, has_seen_intro, character_json, created_at
    ) VALUES (?, ?, ?, ?, 'murid', ?, 0, 'kendiri', '[]', ?, 0, 1, ?, ?)`
  ).run(
    userId,
    name,
    email,
    hashPassword(password),
    className,
    JSON.stringify(['kaca_holo', 'pek_jet', 'but_kuantum', 'penjelajah_langit']),
    JSON.stringify(DEFAULT_CHARACTER),
    now
  );

  initializeMissionsForUser(userId);
  const token = createSessionToken(userId);
  const state = getPlayerState(userId);
  res.status(201).json({ token, state });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | Record<string, unknown>
    | undefined;

  if (!userRow || !verifyPassword(password, String(userRow.password_hash))) {
    res.status(401).json({ error: 'E-mel atau kata laluan tidak sah.' });
    return;
  }

  const userId = String(userRow.id);
  const token = createSessionToken(userId);
  const state = getPlayerState(userId);
  res.json({ token, state });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getBearerToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ ok: true });
});

app.get('/api/auth/classes', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT id, name, teacher_name FROM classes ORDER BY name ASC').all();
  res.json({ classes: rows });
});

// =========================================================================
// PLAYER STATE & PROGRESSION ENDPOINTS
// =========================================================================

app.get('/api/me/state', requireAuth, (req: AuthRequest, res: Response) => {
  const state = getPlayerState(req.authUser!.id);
  if (!state) {
    res.status(404).json({ error: 'Profil pengembara tidak dijumpai.' });
    return;
  }
  const overrides = db.prepare('SELECT * FROM mission_overrides').all();
  res.json({ state, missionOverrides: overrides });
});

app.put('/api/me/intro-seen', requireAuth, (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE users SET has_seen_intro = 1 WHERE id = ?').run(req.authUser!.id);
  res.json({ state: getPlayerState(req.authUser!.id) });
});

app.put('/api/me/pathway', requireAuth, (req: AuthRequest, res: Response) => {
  const pathway = String(req.body?.pathway ?? '');
  if (!['sokongan', 'kendiri', 'cabaran'].includes(pathway)) {
    res.status(400).json({ error: 'Laluan pembelajaran tidak sah.' });
    return;
  }
  db.prepare('UPDATE users SET pathway = ? WHERE id = ?').run(
    pathway as LearningPathway,
    req.authUser!.id
  );
  res.json({ state: getPlayerState(req.authUser!.id) });
});

app.put('/api/me/character', requireAuth, (req: AuthRequest, res: Response) => {
  const char = req.body?.character as CharacterConfig | undefined;
  if (!char || !char.style || !char.outfitStyle || !char.hairStyle) {
    res.status(400).json({ error: 'Konfigurasi karakter 3D tidak lengkap.' });
    return;
  }

  const user = req.authUser!;
  const badges = new Set(user.badges);
  let bonusXp = 0;
  if (!badges.has('pereka_identiti')) {
    badges.add('pereka_identiti');
    bonusXp = 50;
  }

  db.prepare('UPDATE users SET character_json = ?, badges_json = ?, xp = xp + ? WHERE id = ?').run(
    JSON.stringify(char),
    JSON.stringify(Array.from(badges)),
    bonusXp,
    user.id
  );

  res.json({ state: getPlayerState(user.id), bonusXp });
});

app.put('/api/me/hero', requireAuth, (req: AuthRequest, res: Response) => {
  const heroId = String(req.body?.heroId ?? '') as HeroId;
  if (!['arka', 'nara', 'zayan', 'mika'].includes(heroId)) {
    res.status(400).json({ error: 'Watak pengembara tidak sah.' });
    return;
  }

  const user = req.authUser!;
  const badges = new Set(user.badges);
  let bonusXp = 0;
  if (!badges.has('pereka_identiti')) {
    badges.add('pereka_identiti');
    bonusXp = 50;
  }

  const charConfig = heroToCharacterConfig(heroId);
  db.prepare(
    'UPDATE users SET hero_id = ?, character_json = ?, badges_json = ?, xp = xp + ? WHERE id = ?'
  ).run(heroId, JSON.stringify(charConfig), JSON.stringify(Array.from(badges)), bonusXp, user.id);

  res.json({ state: getPlayerState(user.id), bonusXp });
});

app.put('/api/me/position', requireAuth, (req: AuthRequest, res: Response) => {
  const pos = req.body as Partial<PlayerWorldPosition> | undefined;
  if (!pos || typeof pos.x !== 'number' || typeof pos.z !== 'number') {
    res.status(400).json({ error: 'Koordinat kedudukan tidak sah.' });
    return;
  }

  const cleanPos: PlayerWorldPosition = {
    zone: pos.zone || 'zon_bandar',
    x: Number(pos.x.toFixed(2)),
    y: Number((pos.y ?? 0).toFixed(2)),
    z: Number(pos.z.toFixed(2)),
    yaw: Number((pos.yaw ?? 0).toFixed(3)),
  };

  db.prepare('UPDATE users SET player_pos_json = ? WHERE id = ?').run(
    JSON.stringify(cleanPos),
    req.authUser!.id
  );
  res.json({ ok: true });
});

app.post('/api/missions/:missionId/challenge', requireAuth, (req: AuthRequest, res: Response) => {
  const missionId = Number(req.params.missionId);
  const challengeId = String(req.body?.challengeId ?? '').trim();
  const isCorrect = req.body?.isCorrect !== false;
  const meta = MISSIONS_CATALOG.find((m) => m.id === missionId);
  if (!meta || !challengeId) {
    res.status(400).json({ error: 'Maklumat cabaran misi tidak sah.' });
    return;
  }

  const userId = req.authUser!.id;
  initializeMissionsForUser(userId);

  if (missionId > 1) {
    const prev = db
      .prepare('SELECT status FROM mission_progress WHERE user_id = ? AND mission_id = ?')
      .get(userId, missionId - 1) as { status: string } | undefined;
    if (!prev || prev.status !== 'selesai') {
      res.status(403).json({
        error: `Anda bebas meneroka dunia ini, namun sila selesaikan Misi 0${missionId - 1} terlebih dahulu sebelum mengesahkan cabaran Misi 0${missionId}.`,
      });
      return;
    }
  }

  const row = db
    .prepare('SELECT challenge_progress_json, challenge_stats_json, collected_fragments_json FROM users WHERE id = ?')
    .get(userId) as
    | {
        challenge_progress_json: string;
        challenge_stats_json: string;
        collected_fragments_json: string;
      }
    | undefined;

  let progressMap: Record<string, string[]> = {};
  let statsMap: Record<string, { correctAttempts: number; incorrectAttempts: number; lastAttemptAt?: string }> = {};
  let fragments: string[] = [];
  try {
    progressMap = JSON.parse(row?.challenge_progress_json || '{}');
  } catch {
    progressMap = {};
  }
  try {
    statsMap = JSON.parse(row?.challenge_stats_json || '{}');
  } catch {
    statsMap = {};
  }
  try {
    fragments = JSON.parse(row?.collected_fragments_json || '[]');
  } catch {
    fragments = [];
  }

  const key = String(missionId);
  const curStat = statsMap[key] ?? { correctAttempts: 0, incorrectAttempts: 0 };
  curStat.lastAttemptAt = new Date().toISOString();

  if (!isCorrect) {
    curStat.incorrectAttempts += 1;
    statsMap[key] = curStat;
    db.prepare('UPDATE users SET challenge_stats_json = ? WHERE id = ?').run(
      JSON.stringify(statsMap),
      userId
    );
    db.prepare(
      `UPDATE mission_progress
       SET status = CASE WHEN status = 'tersedia' THEN 'sedang_dilaksanakan' ELSE status END
       WHERE user_id = ? AND mission_id = ?`
    ).run(userId, missionId);

    res.json({
      state: getPlayerState(userId),
      solvedChallenges: progressMap[key] ?? [],
      xpEarned: 0,
      collectedFragment: null,
    });
    return;
  }

  curStat.correctAttempts += 1;
  statsMap[key] = curStat;

  const solved = new Set<string>(progressMap[key] ?? []);
  const isNew = !solved.has(challengeId);
  solved.add(challengeId);
  progressMap[key] = Array.from(solved);

  const fragIndex = Math.max(0, solved.size - 1);
  const fragmentName = meta.fragmentLabels[fragIndex] ?? `${meta.worldName} · Serpihan ${solved.size}`;
  const fragSet = new Set<string>(fragments);
  const gainedFragment = !fragSet.has(fragmentName) ? fragmentName : null;
  fragSet.add(fragmentName);

  const bonusXp = isNew ? 35 : 0;
  db.prepare(
    'UPDATE users SET challenge_progress_json = ?, challenge_stats_json = ?, collected_fragments_json = ?, xp = xp + ? WHERE id = ?'
  ).run(
    JSON.stringify(progressMap),
    JSON.stringify(statsMap),
    JSON.stringify(Array.from(fragSet)),
    bonusXp,
    userId
  );

  db.prepare(
    `UPDATE mission_progress
     SET status = CASE WHEN status = 'tersedia' THEN 'sedang_dilaksanakan' ELSE status END
     WHERE user_id = ? AND mission_id = ?`
  ).run(userId, missionId);

  res.json({
    state: getPlayerState(userId),
    solvedChallenges: progressMap[key],
    xpEarned: bonusXp,
    collectedFragment: gainedFragment,
  });
});

app.post('/api/missions/:missionId/complete', requireAuth, (req: AuthRequest, res: Response) => {
  const missionId = Number(req.params.missionId);
  const score = Math.max(0, Math.min(100, Number(req.body?.score ?? 100)));
  const notes = String(req.body?.notes ?? '').slice(0, 500);

  const meta = MISSIONS_CATALOG.find((m) => m.id === missionId);
  if (!meta) {
    res.status(404).json({ error: 'Misi tidak dijumpai.' });
    return;
  }

  const userId = req.authUser!.id;
  initializeMissionsForUser(userId);

  // Enforce sequential mission unlocking: cannot complete Mission N unless Mission N-1 is completed
  if (missionId > 1) {
    const prev = db
      .prepare('SELECT status FROM mission_progress WHERE user_id = ? AND mission_id = ?')
      .get(userId, missionId - 1) as { status: string } | undefined;
    if (!prev || prev.status !== 'selesai') {
      res.status(403).json({
        error: `Sila selesaikan Misi ${String(missionId - 1).padStart(2, '0')} terlebih dahulu sebelum menamatkan Misi ${String(missionId).padStart(2, '0')}.`,
      });
      return;
    }
  }

  const existingProgress = db
    .prepare('SELECT status, score FROM mission_progress WHERE user_id = ? AND mission_id = ?')
    .get(userId, missionId) as { status: string; score: number } | undefined;

  const alreadyCompleted = existingProgress?.status === 'selesai';
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE mission_progress
     SET status = 'selesai',
         score = MAX(score, ?),
         attempts = attempts + 1,
         completed_at = COALESCE(completed_at, ?),
         notes = ?
     WHERE user_id = ? AND mission_id = ?`
  ).run(score, now, notes, userId, missionId);

  // Unlock next mission if it is currently locked
  if (missionId < 5) {
    db.prepare(
      `UPDATE mission_progress
       SET status = CASE WHEN status = 'belum_dibuka' THEN 'tersedia' ELSE status END
       WHERE user_id = ? AND mission_id = ?`
    ).run(userId, missionId + 1);
  }

  // Grant XP, badge, and unlockable cosmetic item
  const userRow = db.prepare('SELECT badges_json, unlocked_items_json, xp FROM users WHERE id = ?').get(
    userId
  ) as { badges_json: string; unlocked_items_json: string; xp: number };
  const badges = new Set<string>(JSON.parse(userRow.badges_json || '[]'));
  const unlocked = new Set<string>(JSON.parse(userRow.unlocked_items_json || '[]'));

  badges.add(meta.badgeId);
  if (meta.unlockItem) unlocked.add(meta.unlockItem);

  const xpEarned = alreadyCompleted ? 0 : meta.xpReward;

  db.prepare('UPDATE users SET xp = xp + ?, badges_json = ?, unlocked_items_json = ? WHERE id = ?').run(
    xpEarned,
    JSON.stringify(Array.from(badges)),
    JSON.stringify(Array.from(unlocked)),
    userId
  );

  res.json({
    state: getPlayerState(userId),
    xpEarned,
    newlyUnlockedMission: !alreadyCompleted && missionId < 5 ? missionId + 1 : null,
    badgeEarned: meta.badgeTitle,
  });
});

// =========================================================================
// MISSION 04 & 05 SUBMISSIONS + PEER FEEDBACK
// =========================================================================

app.post('/api/submissions/script', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.authUser!.id;
  const issue = String(req.body?.issue ?? '').trim();
  const audience = String(req.body?.audience ?? '').trim();
  const title = String(req.body?.title ?? '').trim();
  const scriptText = String(req.body?.scriptText ?? '').trim();
  const activeSentences = Array.isArray(req.body?.activeSentences)
    ? req.body.activeSentences.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  const passiveSentences = Array.isArray(req.body?.passiveSentences)
    ? req.body.passiveSentences.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  const aiFeedback = String(req.body?.aiFeedback ?? '').trim();

  if (!issue || !audience || !title || scriptText.length < 30) {
    res.status(400).json({ error: 'Sila lengkapkan tajuk, isu, sasaran, dan skrip mesej anda.' });
    return;
  }
  if (activeSentences.length < 2 || passiveSentences.length < 2) {
    res.status(400).json({
      error: 'Skrip mesti mengandungi sekurang-kurangnya 2 ayat aktif dan 2 ayat pasif.',
    });
    return;
  }

  // Ensure Mission 03 is completed before Mission 04 submission
  const m3 = db
    .prepare('SELECT status FROM mission_progress WHERE user_id = ? AND mission_id = 3')
    .get(userId) as { status: string } | undefined;
  if (!m3 || m3.status !== 'selesai') {
    res.status(403).json({ error: 'Selesaikan Operasi 03 dahulu sebelum menghantar skrip Operasi 04.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO script_submissions (
      user_id, issue, audience, title, script_text, active_sentences_json, passive_sentences_json,
      ai_feedback, teacher_feedback, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'dihantar', ?)
    ON CONFLICT(user_id) DO UPDATE SET
      issue = excluded.issue,
      audience = excluded.audience,
      title = excluded.title,
      script_text = excluded.script_text,
      active_sentences_json = excluded.active_sentences_json,
      passive_sentences_json = excluded.passive_sentences_json,
      ai_feedback = excluded.ai_feedback,
      status = 'dihantar',
      updated_at = excluded.updated_at`
  ).run(
    userId,
    issue,
    audience,
    title,
    scriptText,
    JSON.stringify(activeSentences),
    JSON.stringify(passiveSentences),
    aiFeedback,
    now
  );

  // Mark Mission 04 completed & unlock Mission 05
  const existingM4 = db
    .prepare('SELECT status FROM mission_progress WHERE user_id = ? AND mission_id = 4')
    .get(userId) as { status: string } | undefined;
  const alreadyM4 = existingM4?.status === 'selesai';

  db.prepare(
    `UPDATE mission_progress SET status = 'selesai', score = 100, attempts = attempts + 1, completed_at = COALESCE(completed_at, ?)
     WHERE user_id = ? AND mission_id = 4`
  ).run(now, userId);

  db.prepare(
    `UPDATE mission_progress SET status = CASE WHEN status = 'belum_dibuka' THEN 'tersedia' ELSE status END
     WHERE user_id = ? AND mission_id = 5`
  ).run(userId);

  const userRow = db.prepare('SELECT badges_json, unlocked_items_json FROM users WHERE id = ?').get(userId) as {
    badges_json: string;
    unlocked_items_json: string;
  };
  const badges = new Set<string>(JSON.parse(userRow.badges_json || '[]'));
  const unlocked = new Set<string>(JSON.parse(userRow.unlocked_items_json || '[]'));
  badges.add('pencipta_mesej');
  unlocked.add('wira_neon');

  const xpEarned = alreadyM4 ? 0 : 420;
  db.prepare('UPDATE users SET xp = xp + ?, badges_json = ?, unlocked_items_json = ? WHERE id = ?').run(
    xpEarned,
    JSON.stringify(Array.from(badges)),
    JSON.stringify(Array.from(unlocked)),
    userId
  );

  res.json({
    state: getPlayerState(userId),
    xpEarned,
    message: 'Skrip Mesej Rahsia berjaya dihantar! Operasi 05 kini dibuka.',
  });
});

app.post('/api/submissions/video', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.authUser!.id;
  const tool = String(req.body?.tool ?? 'Canva');
  const videoUrl = String(req.body?.videoUrl ?? '').trim();
  const reflection = String(req.body?.reflection ?? '').trim();

  if (!videoUrl || videoUrl.length < 8) {
    res.status(400).json({ error: 'Sila masukkan pautan video Canva/CapCut atau pautan muat naik awan yang sah.' });
    return;
  }
  if (reflection.length < 15) {
    res.status(400).json({ error: 'Sila lengkapkan refleksi kendiri sekurang-kurangnya 15 aksara.' });
    return;
  }

  const m4 = db
    .prepare('SELECT status FROM mission_progress WHERE user_id = ? AND mission_id = 4')
    .get(userId) as { status: string } | undefined;
  if (!m4 || m4.status !== 'selesai') {
    res.status(403).json({ error: 'Selesaikan Operasi 04 dahulu sebelum menghantar video Operasi 05.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO video_submissions (
      user_id, tool, video_url, reflection, status, updated_at
    ) VALUES (?, ?, ?, ?, 'menunggu_semakan', ?)
    ON CONFLICT(user_id) DO UPDATE SET
      tool = excluded.tool,
      video_url = excluded.video_url,
      reflection = excluded.reflection,
      status = 'menunggu_semakan',
      updated_at = excluded.updated_at`
  ).run(userId, tool, videoUrl, reflection, now);

  const existingM5 = db
    .prepare('SELECT status FROM mission_progress WHERE user_id = ? AND mission_id = 5')
    .get(userId) as { status: string } | undefined;
  const alreadyM5 = existingM5?.status === 'selesai';

  db.prepare(
    `UPDATE mission_progress SET status = 'selesai', score = MAX(score, 95), attempts = attempts + 1, completed_at = COALESCE(completed_at, ?)
     WHERE user_id = ? AND mission_id = 5`
  ).run(now, userId);

  const userRow = db.prepare('SELECT badges_json, unlocked_items_json FROM users WHERE id = ?').get(userId) as {
    badges_json: string;
    unlocked_items_json: string;
  };
  const badges = new Set<string>(JSON.parse(userRow.badges_json || '[]'));
  const unlocked = new Set<string>(JSON.parse(userRow.unlocked_items_json || '[]'));
  badges.add('wira_bahasa');
  unlocked.add('mahkota_duta');

  const xpEarned = alreadyM5 ? 0 : 550;
  db.prepare('UPDATE users SET xp = xp + ?, badges_json = ?, unlocked_items_json = ? WHERE id = ?').run(
    xpEarned,
    JSON.stringify(Array.from(badges)),
    JSON.stringify(Array.from(unlocked)),
    userId
  );

  res.json({
    state: getPlayerState(userId),
    xpEarned,
    message: 'Video mesej digital berjaya dihantar untuk semakan guru!',
  });
});

app.get('/api/community/showcase', requireAuth, (_req: AuthRequest, res: Response) => {
  res.json({ items: getShowcaseItems() });
});

app.post('/api/community/peer-feedback', requireAuth, (req: AuthRequest, res: Response) => {
  const targetUserId = String(req.body?.targetUserId ?? '');
  const comment = String(req.body?.comment ?? '').trim();
  if (!targetUserId || comment.length < 6) {
    res.status(400).json({ error: 'Sila tulis komen membina sekurang-kurangnya 6 aksara.' });
    return;
  }

  const author = req.authUser!;
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO peer_feedback (submission_user_id, author_user_id, author_name, comment, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(targetUserId, author.id, author.name, comment, now);

  const badges = new Set(author.badges);
  let bonusXp = 0;
  if (!badges.has('sahabat_wordopia')) {
    badges.add('sahabat_wordopia');
    bonusXp = 75;
  } else {
    bonusXp = 25;
  }
  db.prepare('UPDATE users SET xp = xp + ?, badges_json = ? WHERE id = ?').run(
    bonusXp,
    JSON.stringify(Array.from(badges)),
    author.id
  );

  res.json({ items: getShowcaseItems(), state: getPlayerState(author.id), bonusXp });
});

// =========================================================================
// GEMINI AI LANGUAGE ASSISTANT ENDPOINTS (Server-Side Only)
// =========================================================================

app.post('/api/ai/review-script', requireAuth, async (req: AuthRequest, res: Response) => {
  const scriptText = String(req.body?.scriptText ?? '').trim();
  const activeSentences = Array.isArray(req.body?.activeSentences)
    ? req.body.activeSentences.map((s: unknown) => String(s))
    : [];
  const passiveSentences = Array.isArray(req.body?.passiveSentences)
    ? req.body.passiveSentences.map((s: unknown) => String(s))
    : [];
  const issue = String(req.body?.issue ?? '');
  const audience = String(req.body?.audience ?? '');

  if (scriptText.length < 15) {
    res.status(400).json({ error: 'Sila tulis draf skrip terlebih dahulu sebelum menyemak dengan AI ROBO.' });
    return;
  }

  const ai = createGeminiClient();
  if (!ai) {
    // Graceful educational heuristic fallback if GEMINI_API_KEY is not configured
    const hasDi = passiveSentences.some((s: string) => /\bdi\w+/i.test(s)) || /\b(saya|kami|kita|awak|kamu)\s+\w+/i.test(passiveSentences.join(' '));
    const hasMen = activeSentences.some((s: string) => /\bme(m|n|ng|ny)?\w+/i.test(s));
    const ready = activeSentences.length >= 2 && passiveSentences.length >= 2 && scriptText.length >= 40;
    res.json({
      source: 'local-heuristic',
      summary: ready
        ? 'ROBO telah menyemak skrip kamu! Struktur ayat aktif dan pasif kelihatan baik dan jelas untuk khalayak sasaran.'
        : 'ROBO mengesan kamu perlu menambah atau memurnikan ayat aktif (imbuhan meN-) dan ayat pasif (di-... oleh atau kata ganti diri pertama/kedua).',
      tips: [
        hasMen
          ? 'Bagus! Ayat aktif kamu menggunakan kata kerja transitif yang jelas.'
          : 'Petunjuk: Pastikan sekurang-kurangnya dua ayat aktif menggunakan kata kerja meN- (contoh: menjaga, menulis, membantu).',
        hasDi
          ? 'Syabas! Ayat pasif kamu menunjukkan tumpuan kepada objek dengan betul.'
          : 'Petunjuk: Untuk ayat pasif diri pertama ("saya/kami/kita"), guna struktur seperti "Buku itu saya baca", bukannya "dibaca oleh saya".',
      ],
      activeCountEstimate: activeSentences.length,
      passiveCountEstimate: passiveSentences.length,
      isReady: ready,
    });
    return;
  }

  try {
    const prompt = `Kamu ialah ROBO, rakan robot penyayang untuk murid Tahun 6 (umur 12 tahun) dalam permainan pembelajaran Bahasa Melayu WORDOPIA (SP 5.3.3: Memahami dan membina ayat aktif dan ayat pasif mengikut konteks).
Tugas kamu ialah MEMBIMBING murid menyemak skrip mereka, BUKAN menulis keseluruhan skrip gantian.
Isu: ${issue}
Sasaran khalayak: ${audience}
Skrip penuh murid:
"""
${scriptText}
"""
Senarai Ayat Aktif yang ditanda murid: ${JSON.stringify(activeSentences)}
Senarai Ayat Pasif yang ditanda murid: ${JSON.stringify(passiveSentences)}

Berikan maklum balas dalam Bahasa Melayu Tahun 6 yang mesra, mudah difahami, dan membina:
1. Semak sama ada ayat yang ditanda benar-benar ayat aktif dan ayat pasif yang gramatis (perhatikan hukum pasif kata ganti nama diri pertama/kedua seperti "saya tulis", "kita jaga" berbanding pasif diri ketiga "dijaga oleh").
2. Beri 2-3 cadangan pembaikan tatabahasa atau kejelasan mesej tanpa menulis karangan baharu untuk murid.
3. Nyatakan sama ada skrip sudah bersedia untuk dihantar.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'Ringkasan maklum balas mesra ROBO dalam Bahasa Melayu.' },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 hingga 3 petunjuk pembaikan tatabahasa atau kejelasan mesej.',
            },
            activeCountEstimate: { type: Type.INTEGER },
            passiveCountEstimate: { type: Type.INTEGER },
            isReady: { type: Type.BOOLEAN },
          },
          required: ['summary', 'tips', 'activeCountEstimate', 'passiveCountEstimate', 'isReady'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ source: 'gemini', ...parsed });
  } catch (err) {
    console.error('Gemini review error:', err);
    res.status(500).json({ error: 'Ralat semasa menghubungi AI ROBO. Sila cuba sebentar lagi.' });
  }
});

// =========================================================================
// TEACHER & ADMIN ENDPOINTS (Strict Role Enforcement)
// =========================================================================

app.get('/api/teacher/students', requireAuth, requireRole(['guru', 'pentadbir']), (_req: AuthRequest, res: Response) => {
  const users = db
    .prepare("SELECT * FROM users WHERE role = 'murid' ORDER BY xp DESC, name ASC")
    .all() as Record<string, unknown>[];

  const students = users.map((u) => getPlayerState(String(u.id))).filter(Boolean);
  res.json({ students });
});

app.post('/api/teacher/review-script', requireAuth, requireRole(['guru', 'pentadbir']), (req: AuthRequest, res: Response) => {
  const studentId = String(req.body?.studentId ?? '');
  const status = String(req.body?.status ?? '');
  const teacherFeedback = String(req.body?.teacherFeedback ?? '').trim();

  if (!studentId || !['diluluskan', 'perlu_pembaikan'].includes(status)) {
    res.status(400).json({ error: 'Status semakan skrip tidak sah.' });
    return;
  }

  db.prepare(
    'UPDATE script_submissions SET status = ?, teacher_feedback = ?, updated_at = ? WHERE user_id = ?'
  ).run(status, teacherFeedback, new Date().toISOString(), studentId);

  res.json({ student: getPlayerState(studentId) });
});

app.post('/api/teacher/evaluate-video', requireAuth, requireRole(['guru', 'pentadbir']), (req: AuthRequest, res: Response) => {
  const studentId = String(req.body?.studentId ?? '');
  const kandungan = Math.max(0, Math.min(25, Number(req.body?.rubricKandungan ?? 20)));
  const tatabahasa = Math.max(0, Math.min(25, Number(req.body?.rubricTatabahasa ?? 20)));
  const kreativiti = Math.max(0, Math.min(25, Number(req.body?.rubricKreativiti ?? 20)));
  const penyampaian = Math.max(0, Math.min(25, Number(req.body?.rubricPenyampaian ?? 20)));
  const teacherComment = String(req.body?.teacherComment ?? '').trim();
  const approveDuta = Boolean(req.body?.approveDuta);

  const totalScore = kandungan + tatabahasa + kreativiti + penyampaian;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE video_submissions
     SET rubric_kandungan = ?, rubric_tatabahasa = ?, rubric_kreativiti = ?, rubric_penyampaian = ?,
         teacher_comment = ?, status = ?, updated_at = ?
     WHERE user_id = ?`
  ).run(
    kandungan,
    tatabahasa,
    kreativiti,
    penyampaian,
    teacherComment,
    approveDuta ? 'disahkan' : 'menunggu_semakan',
    now,
    studentId
  );

  if (approveDuta) {
    const userRow = db.prepare('SELECT badges_json, unlocked_items_json, is_duta_bahasa FROM users WHERE id = ?').get(
      studentId
    ) as { badges_json: string; unlocked_items_json: string; is_duta_bahasa: number } | undefined;

    if (userRow) {
      const badges = new Set<string>(JSON.parse(userRow.badges_json || '[]'));
      const unlocked = new Set<string>(JSON.parse(userRow.unlocked_items_json || '[]'));
      badges.add('wira_bahasa');
      unlocked.add('mahkota_duta');
      const bonusXp = userRow.is_duta_bahasa ? 0 : 300;
      db.prepare(
        'UPDATE users SET is_duta_bahasa = 1, xp = xp + ?, badges_json = ?, unlocked_items_json = ? WHERE id = ?'
      ).run(bonusXp, JSON.stringify(Array.from(badges)), JSON.stringify(Array.from(unlocked)), studentId);
    }

    db.prepare(
      `UPDATE mission_progress SET status = 'selesai', score = ?, completed_at = COALESCE(completed_at, ?)
       WHERE user_id = ? AND mission_id = 5`
    ).run(totalScore, now, studentId);
  }

  res.json({ student: getPlayerState(studentId) });
});

// =========================================================================
// ADMIN ENDPOINTS (Pentadbir Only)
// =========================================================================

app.get('/api/admin/overview', requireAuth, requireRole(['pentadbir']), (_req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT * FROM users ORDER BY role ASC, name ASC').all() as Record<string, unknown>[];
  const classes = db.prepare('SELECT * FROM classes ORDER BY name ASC').all();
  const overrides = db.prepare('SELECT * FROM mission_overrides').all();
  const missionStats = db
    .prepare(
      `SELECT mission_id,
              SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as completed_count
       FROM mission_progress
       JOIN users ON users.id = mission_progress.user_id
       WHERE users.role = 'murid'
       GROUP BY mission_id
       ORDER BY mission_id ASC`
    )
    .all();

  const firebaseConfigured = fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'));

  res.json({
    users: users.map(mapUserRowToProfile),
    classes,
    missionOverrides: overrides,
    missionStats,
    systemConfig: {
      databaseEngine: 'SQLite Berterusan (Pelayan Express)',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      firebaseConfigured,
    },
  });
});

app.post('/api/admin/users', requireAuth, requireRole(['pentadbir']), (req: AuthRequest, res: Response) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? 'wordopia123');
  const role = String(req.body?.role ?? 'murid') as UserRole;
  const className = String(req.body?.className ?? '6 Bestari').trim();

  if (!name || !email.includes('@') || !['murid', 'guru', 'pentadbir'].includes(role)) {
    res.status(400).json({ error: 'Maklumat akaun tidak sah.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'E-mel sudah wujud.' });
    return;
  }

  const userId = `usr-${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (
      id, name, email, password_hash, role, class_name, xp, pathway,
      badges_json, unlocked_items_json, is_duta_bahasa, has_seen_intro, character_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 'kendiri', '[]', ?, 0, 1, ?, ?)`
  ).run(
    userId,
    name,
    email,
    hashPassword(password),
    role,
    className,
    JSON.stringify(['kaca_holo', 'pek_jet', 'but_kuantum', 'penjelajah_langit']),
    JSON.stringify(DEFAULT_CHARACTER),
    now
  );
  initializeMissionsForUser(userId);
  res.status(201).json({ ok: true });
});

app.patch('/api/admin/users/:id', requireAuth, requireRole(['pentadbir']), (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id);
  const role = req.body?.role as UserRole | undefined;
  const className = req.body?.className ? String(req.body.className) : undefined;

  if (role && !['murid', 'guru', 'pentadbir'].includes(role)) {
    res.status(400).json({ error: 'Peranan tidak sah.' });
    return;
  }

  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  }
  if (className) {
    db.prepare('UPDATE users SET class_name = ? WHERE id = ?').run(className, targetId);
  }

  res.json({ ok: true });
});

app.post('/api/admin/classes', requireAuth, requireRole(['pentadbir']), (req: AuthRequest, res: Response) => {
  const name = String(req.body?.name ?? '').trim();
  const teacherName = String(req.body?.teacherName ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'Nama kelas diperlukan.' });
    return;
  }
  try {
    db.prepare('INSERT INTO classes (name, teacher_name, created_at) VALUES (?, ?, ?)').run(
      name,
      teacherName,
      new Date().toISOString()
    );
    res.status(201).json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Nama kelas telah wujud.' });
  }
});

app.put('/api/admin/missions/:missionId', requireAuth, requireRole(['pentadbir']), (req: AuthRequest, res: Response) => {
  const missionId = Number(req.params.missionId);
  const customTitle = String(req.body?.customTitle ?? '').trim();
  const customBriefing = String(req.body?.customBriefing ?? '').trim();
  if (!customTitle || !customBriefing) {
    res.status(400).json({ error: 'Tajuk dan taklimat misi diperlukan.' });
    return;
  }

  db.prepare(
    `INSERT INTO mission_overrides (mission_id, custom_title, custom_briefing, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(mission_id) DO UPDATE SET
       custom_title = excluded.custom_title,
       custom_briefing = excluded.custom_briefing,
       updated_at = excluded.updated_at`
  ).run(missionId, customTitle, customBriefing, new Date().toISOString());

  res.json({ ok: true });
});

// =========================================================================
// HEALTH CHECK & VITE DEV / PRODUCTION STATIC SERVING
// =========================================================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vitePromise = import('vite').then(({ createServer }) =>
      createServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
        },
        appType: 'spa',
      })
    );

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WORDOPIA server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

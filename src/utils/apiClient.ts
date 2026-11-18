import type {
  CharacterConfig,
  HeroId,
  LearningPathway,
  PlayerState,
  PlayerWorldPosition,
  ShowcaseItem,
  UserProfile,
} from '../types/game.ts';

const TOKEN_STORAGE_KEY = 'wordopia_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage issues
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ralat pelayan (${res.status})`);
  }
  return data as T;
}

export const api = {
  getClasses: () =>
    requestJson<{ classes: { id: number; name: string; teacher_name: string }[] }>('/api/auth/classes'),

  login: async (email: string, password: string) => {
    const data = await requestJson<{ token: string; state: PlayerState }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data.state;
  },

  register: async (name: string, email: string, password: string, className: string) => {
    const data = await requestJson<{ token: string; state: PlayerState }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, className }),
    });
    setStoredToken(data.token);
    return data.state;
  },

  logout: async () => {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  getMyState: () =>
    requestJson<{
      state: PlayerState;
      missionOverrides: { mission_id: number; custom_title: string; custom_briefing: string }[];
    }>('/api/me/state'),

  markIntroSeen: () =>
    requestJson<{ state: PlayerState }>('/api/me/intro-seen', { method: 'PUT' }),

  updatePathway: (pathway: LearningPathway) =>
    requestJson<{ state: PlayerState }>('/api/me/pathway', {
      method: 'PUT',
      body: JSON.stringify({ pathway }),
    }),

  saveCharacter: (character: CharacterConfig) =>
    requestJson<{ state: PlayerState; bonusXp: number }>('/api/me/character', {
      method: 'PUT',
      body: JSON.stringify({ character }),
    }),

  saveHero: (heroId: HeroId) =>
    requestJson<{ state: PlayerState; bonusXp: number }>('/api/me/hero', {
      method: 'PUT',
      body: JSON.stringify({ heroId }),
    }),

  savePosition: (pos: PlayerWorldPosition) =>
    requestJson<{ ok: boolean }>('/api/me/position', {
      method: 'PUT',
      body: JSON.stringify(pos),
    }),

  completeChallenge: (missionId: number, challengeId: string, isCorrect = true) =>
    requestJson<{
      state: PlayerState;
      solvedChallenges: string[];
      xpEarned: number;
      collectedFragment?: string | null;
    }>(`/api/missions/${missionId}/challenge`, {
      method: 'POST',
      body: JSON.stringify({ challengeId, isCorrect }),
    }),

  completeMission: (missionId: number, score: number, notes: string) =>
    requestJson<{
      state: PlayerState;
      xpEarned: number;
      newlyUnlockedMission: number | null;
      badgeEarned: string;
    }>(`/api/missions/${missionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ score, notes }),
    }),

  submitScript: (payload: {
    issue: string;
    audience: string;
    title: string;
    scriptText: string;
    activeSentences: string[];
    passiveSentences: string[];
    aiFeedback: string;
  }) =>
    requestJson<{ state: PlayerState; xpEarned: number; message: string }>('/api/submissions/script', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reviewScriptWithAi: (payload: {
    issue: string;
    audience: string;
    scriptText: string;
    activeSentences: string[];
    passiveSentences: string[];
  }) =>
    requestJson<{
      source: string;
      summary: string;
      tips: string[];
      activeCountEstimate: number;
      passiveCountEstimate: number;
      isReady: boolean;
    }>('/api/ai/review-script', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitVideo: (payload: { tool: string; videoUrl: string; reflection: string }) =>
    requestJson<{ state: PlayerState; xpEarned: number; message: string }>('/api/submissions/video', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getShowcase: () => requestJson<{ items: ShowcaseItem[] }>('/api/community/showcase'),

  postPeerFeedback: (targetUserId: string, comment: string) =>
    requestJson<{ items: ShowcaseItem[]; state: PlayerState; bonusXp: number }>(
      '/api/community/peer-feedback',
      {
        method: 'POST',
        body: JSON.stringify({ targetUserId, comment }),
      }
    ),

  // Teacher endpoints
  getTeacherStudents: () => requestJson<{ students: PlayerState[] }>('/api/teacher/students'),

  reviewStudentScript: (studentId: string, status: 'diluluskan' | 'perlu_pembaikan', teacherFeedback: string) =>
    requestJson<{ student: PlayerState }>('/api/teacher/review-script', {
      method: 'POST',
      body: JSON.stringify({ studentId, status, teacherFeedback }),
    }),

  evaluateStudentVideo: (payload: {
    studentId: string;
    rubricKandungan: number;
    rubricTatabahasa: number;
    rubricKreativiti: number;
    rubricPenyampaian: number;
    teacherComment: string;
    approveDuta: boolean;
  }) =>
    requestJson<{ student: PlayerState }>('/api/teacher/evaluate-video', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin endpoints
  getAdminOverview: () =>
    requestJson<{
      users: UserProfile[];
      classes: { id: number; name: string; teacher_name: string }[];
      missionOverrides: { mission_id: number; custom_title: string; custom_briefing: string }[];
      missionStats: { mission_id: number; completed_count: number }[];
      systemConfig: {
        databaseEngine: string;
        geminiConfigured: boolean;
        firebaseConfigured: boolean;
      };
    }>('/api/admin/overview'),

  adminCreateUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    className: string;
  }) =>
    requestJson('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateUser: (id: string, payload: { role?: string; className?: string }) =>
    requestJson(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  adminCreateClass: (name: string, teacherName: string) =>
    requestJson('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name, teacherName }),
    }),

  adminUpdateMission: (missionId: number, customTitle: string, customBriefing: string) =>
    requestJson(`/api/admin/missions/${missionId}`, {
      method: 'PUT',
      body: JSON.stringify({ customTitle, customBriefing }),
    }),
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Compass, FastForward, Sparkles, Trophy } from 'lucide-react';
import { CITY_ZONES, DEFAULT_PLAYER_POSITION, MISSIONS_CATALOG } from './data/missions.ts';
import type {
  GameView,
  HeroId,
  LearningPathway,
  MissionWorldId,
  PlayerState,
  PlayerWorldPosition,
  TeleportPhaseId,
  TeleportProgressInfo,
  UserRole,
  WorldInteractable,
} from './types/game.ts';
import { api, getStoredToken, setStoredToken } from './utils/apiClient.ts';
import { soundEngine, type MusicSceneContext } from './utils/soundEngine.ts';
import {
  NexusWorldCanvas,
  type HudWorldSnapshot,
  type MobileControlInput,
  type WorldCanvasMode,
} from './components/NexusWorldCanvas.tsx';
import { OpeningSequence3D } from './components/OpeningSequence3D.tsx';
import { AboutWordopiaModal } from './components/AboutWordopiaModal.tsx';
import { RolePortalsScreen } from './components/RolePortalsScreen.tsx';
import { HeroSelectScreen } from './components/HeroSelectScreen.tsx';
import { GameplayHUD } from './components/GameplayHUD.tsx';
import { ChallengeModal } from './components/ChallengeModal.tsx';
import { DewanWiraView } from './components/DewanWiraModal.tsx';
import { DutaBahasaCeremony } from './components/DutaBahasaCeremony.tsx';
import { TeacherPortal } from './components/TeacherPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { MissionJournalModal } from './components/MissionJournalModal.tsx';
import { PauseMenuModal } from './components/PauseMenuModal.tsx';

function pickInitialWorldId(state: PlayerState): MissionWorldId {
  const active =
    state.missions.find(
      (m) => m.status === 'tersedia' || m.status === 'sedang_dilaksanakan'
    ) ??
    state.missions.find((m) => m.status !== 'selesai') ??
    state.missions[0];
  const id = active?.missionId ?? 1;
  return (id >= 1 && id <= 5 ? id : 1) as MissionWorldId;
}

export default function App() {
  const [view, setView] = useState<GameView>('opening');
  const [openingScene, setOpeningScene] = useState(1);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [missionOverrides, setMissionOverrides] = useState<
    { mission_id: number; custom_title: string; custom_briefing: string }[]
  >([]);

  const [activeWorldId, setActiveWorldId] = useState<MissionWorldId>(1);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [highlightedPortal, setHighlightedPortal] = useState<UserRole | null>(null);

  const [previewHeroId, setPreviewHeroId] = useState<HeroId>('arka');
  const [heroRotOffset, setHeroRotOffset] = useState(0);

  const [activeInteractable, setActiveInteractable] = useState<WorldInteractable | null>(null);
  const [celebrationPulseKey, setCelebrationPulseKey] = useState(0);
  const [zoomDeltaSignal, setZoomDeltaSignal] = useState<{ key: number; delta: number } | null>(
    null
  );
  const [worldIntroBanner, setWorldIntroBanner] = useState<{
    code: string;
    worldName: string;
    subtitle: string;
    storyIntro: string;
    objective: string;
    novaLine: string;
    accentColor: string;
  } | null>(null);

  const [hudSnapshot, setHudSnapshot] = useState<HudWorldSnapshot>({
    x: DEFAULT_PLAYER_POSITION.x,
    z: DEFAULT_PLAYER_POSITION.z,
    yaw: DEFAULT_PLAYER_POSITION.yaw,
    worldId: 1,
    nearestInteractable: null,
    worldInteractables: [],
    worldLoading: false,
    camDistance: 6.2,
  });

  const mobileInputRef = useRef<MobileControlInput>({
    moveX: 0,
    moveY: 0,
    running: false,
    jumpQueued: false,
    interactQueued: false,
    camDeltaX: 0,
    camDeltaY: 0,
  });

  // Audio & Performance settings synchronized with soundEngine localStorage prefs
  const [musicOn, setMusicOn] = useState(() => soundEngine.musicEnabled);
  const [sfxOn, setSfxOn] = useState(() => soundEngine.soundEnabled);
  const [ambientOn, setAmbientOn] = useState(() => soundEngine.ambientEnabled);
  const [muted, setMuted] = useState(() => soundEngine.muted);
  const [musicVolume, setMusicVolume] = useState(() => soundEngine.musicVolume);
  const [sfxVolume, setSfxVolume] = useState(() => soundEngine.sfxVolume);
  const [ambientVolume, setAmbientVolume] = useState(() => soundEngine.ambientVolume);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [simplified3d, setSimplified3d] = useState(false);

  // Quantum Ascension & Grand Victory state
  const [teleportRequest, setTeleportRequest] = useState<{
    key: number;
    targetWorldId: MissionWorldId;
  } | null>(null);
  const [teleportOverlay, setTeleportOverlay] = useState<TeleportProgressInfo | null>(null);
  const [skipTeleportKey, setSkipTeleportKey] = useState(0);
  const [grandVictoryActive, setGrandVictoryActive] = useState(false);

  const [rewardBanner, setRewardBanner] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);

  const [hasSeenIntroLocal, setHasSeenIntroLocal] = useState(() => {
    try {
      return localStorage.getItem('wordopia_intro_seen') === '1';
    } catch {
      return false;
    }
  });

  const worldIntroTimerRef = useRef<number | null>(null);
  const grandVictoryTimerRef = useRef<number | null>(null);

  const showRewardToast = useCallback((title: string, subtitle: string) => {
    setRewardBanner({ title, subtitle });
    window.setTimeout(() => setRewardBanner(null), 5500);
  }, []);

  const triggerWorldIntro = useCallback((worldId: MissionWorldId, viaTeleport = false) => {
    const meta = MISSIONS_CATALOG.find((m) => m.id === worldId);
    if (!meta) return;
    if (worldIntroTimerRef.current) {
      window.clearTimeout(worldIntroTimerRef.current);
    }
    setWorldIntroBanner({
      code: meta.code,
      worldName: meta.worldName,
      subtitle: meta.worldSubtitle,
      storyIntro: meta.storyIntro,
      objective: meta.objective,
      novaLine: viaTeleport
        ? `Isyarat baharu telah dikesan di ${meta.worldName}. Mari kita teruskan misi!`
        : meta.roboBriefing,
      accentColor: meta.accentColor,
    });
    worldIntroTimerRef.current = window.setTimeout(() => {
      setWorldIntroBanner(null);
      worldIntroTimerRef.current = null;
    }, 5200);
  }, []);

  const handleImmediateWorldSet = useCallback(
    (worldId: MissionWorldId) => {
      setActiveWorldId(worldId);
      setActiveInteractable(null);
      const zoneMeta = CITY_ZONES.find((z) => z.missionId === worldId) ?? CITY_ZONES[0];
      setHudSnapshot((prev) => ({
        ...prev,
        worldId,
        x: zoneMeta.spawnPoint.x,
        z: zoneMeta.spawnPoint.z,
        yaw: zoneMeta.spawnPoint.yaw,
        nearestInteractable: null,
      }));
      triggerWorldIntro(worldId, false);
    },
    [triggerWorldIntro]
  );

  const triggerQuantumTeleport = useCallback(
    (worldId: MissionWorldId) => {
      if (teleportOverlay?.active) return;
      setActiveInteractable(null);
      setShowJournal(false);
      setShowPause(false);
      setWorldIntroBanner(null);

      if (worldId === activeWorldId) {
        triggerWorldIntro(worldId, false);
        return;
      }

      soundEngine.unlockAudio();
      setTeleportRequest({ key: Date.now() + Math.random(), targetWorldId: worldId });
    },
    [activeWorldId, teleportOverlay?.active, triggerWorldIntro]
  );

  const handleTeleportProgress = useCallback((info: TeleportProgressInfo) => {
    setTeleportOverlay(info.active ? info : null);
  }, []);

  const handleTeleportComplete = useCallback(
    (worldId: MissionWorldId) => {
      setTeleportOverlay(null);
      setActiveWorldId(worldId);
      triggerWorldIntro(worldId, true);
    },
    [triggerWorldIntro]
  );

  const refreshState = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await api.getMyState();
      setPlayerState(res.state);
      setMissionOverrides(res.missionOverrides);
      if (res.state.user.selectedHero) {
        setPreviewHeroId(res.state.user.selectedHero);
      }
      const nextWorldId = pickInitialWorldId(res.state);
      setActiveWorldId(nextWorldId);
      if (res.state.user.playerPosition) {
        setHudSnapshot((prev) => ({
          ...prev,
          worldId: nextWorldId,
          x: res.state.user.playerPosition.x,
          z: res.state.user.playerPosition.z,
          yaw: res.state.user.playerPosition.yaw,
        }));
      }
    } catch {
      setStoredToken(null);
      setPlayerState(null);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Unlock Web Audio cleanly on first user interaction anywhere in app
  useEffect(() => {
    const unlockOnce = () => {
      soundEngine.unlockAudio();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
      if (grandVictoryTimerRef.current) window.clearTimeout(grandVictoryTimerRef.current);
    };
  }, []);

  // Sync contextual scene music whenever view / activeWorldId / teleport / victory changes
  useEffect(() => {
    let sceneMusic: MusicSceneContext = 'menu';
    if (grandVictoryActive) {
      sceneMusic = 'victory';
    } else if (teleportOverlay?.active) {
      sceneMusic = 'teleport';
    } else if (view === 'opening' || view === 'portals' || view === 'login') {
      sceneMusic = 'menu';
    } else if (view === 'character_select') {
      sceneMusic = 'selection';
    } else if (view === 'ceremony') {
      sceneMusic = 'ceremony';
    } else if (view === 'city_play') {
      sceneMusic = activeInteractable
        ? 'mission'
        : (`mission_${activeWorldId}` as MusicSceneContext);
    } else {
      sceneMusic = 'city';
    }
    soundEngine.setSceneMusic(sceneMusic);
  }, [view, activeWorldId, activeInteractable, teleportOverlay?.active, grandVictoryActive]);

  const handleStartFromMenu = async () => {
    try {
      localStorage.setItem('wordopia_intro_seen', '1');
    } catch {
      // Ignore
    }
    setHasSeenIntroLocal(true);

    if (playerState) {
      if (!playerState.user.hasSeenIntro) {
        await api.markIntroSeen().catch(() => {});
      }
      if (playerState.user.role === 'pentadbir') {
        setView('admin_portal');
      } else if (playerState.user.role === 'guru') {
        setView('teacher_portal');
      } else if (!playerState.user.selectedHero) {
        setView('character_select');
      } else {
        const startWorld = pickInitialWorldId(playerState);
        handleImmediateWorldSet(startWorld);
        setView('city_play');
      }
    } else {
      setView('portals');
    }
  };

  const handleAuthSuccess = async (state: PlayerState) => {
    setPlayerState(state);
    if (state.user.selectedHero) {
      setPreviewHeroId(state.user.selectedHero);
    } else {
      setPreviewHeroId('arka');
    }
    try {
      const res = await api.getMyState();
      setMissionOverrides(res.missionOverrides);
    } catch {
      // Ignore
    }

    if (state.user.role === 'pentadbir') {
      setView('admin_portal');
    } else if (state.user.role === 'guru') {
      setView('teacher_portal');
    } else if (!state.user.selectedHero) {
      setView('character_select');
    } else {
      const startWorld = pickInitialWorldId(state);
      handleImmediateWorldSet(startWorld);
      setView('city_play');
    }
  };

  const handleConfirmHero = async (heroId: HeroId) => {
    const res = await api.saveHero(heroId);
    setPlayerState(res.state);
    setPreviewHeroId(heroId);
    if (res.bonusXp > 0) {
      showRewardToast('Lencana Ejen Rasmi!', `+${res.bonusXp} XP · Selamat datang ke Kota NEXUS!`);
    }
    const startWorld = pickInitialWorldId(res.state);
    handleImmediateWorldSet(startWorld);
    setView('city_play');
  };

  const handleChallengeSolved = async (
    missionId: number,
    challengeId: string,
    notes: string
  ): Promise<{ missionCompleted: boolean; nextWorldId: MissionWorldId | null }> => {
    setCelebrationPulseKey((k) => k + 1);
    const res = await api.completeChallenge(missionId, challengeId, true);
    setPlayerState(res.state);

    const meta = MISSIONS_CATALOG.find((m) => m.id === missionId);
    const solvedCount = res.solvedChallenges.length;
    const needed = meta?.maxChallenges ?? 3;
    const currentStatus = res.state.missions.find((m) => m.missionId === missionId)?.status;
    const nextWorldId = missionId < 5 ? ((missionId + 1) as MissionWorldId) : null;

    if (solvedCount >= needed && currentStatus !== 'selesai') {
      const compRes = await api.completeMission(missionId, 100, notes);
      setPlayerState(compRes.state);
      soundEngine.playAchievement();
      const nextMsg = compRes.newlyUnlockedMission
        ? `Misi 0${compRes.newlyUnlockedMission} kini sedia diterokai! (+${compRes.xpEarned} XP)`
        : `Syabas! +${compRes.xpEarned} XP diperoleh!`;
      showRewardToast(`${compRes.badgeEarned} Diperoleh!`, nextMsg);
      return { missionCompleted: true, nextWorldId };
    }

    if (res.xpEarned > 0 || res.collectedFragment) {
      showRewardToast(
        res.collectedFragment
          ? `Serpihan Pulih: ${res.collectedFragment}`
          : `Isyarat Terpulih (${solvedCount}/${needed})`,
        `+${res.xpEarned} XP · Teruskan pengembaraan di ${meta?.worldName ?? 'WORDOPIA'}!`
      );
    }
    return {
      missionCompleted: solvedCount >= needed,
      nextWorldId: solvedCount >= needed ? nextWorldId : null,
    };
  };

  const handleScriptSubmitted = async (xpEarned: number, message: string) => {
    setCelebrationPulseKey((k) => k + 1);
    await refreshState();
    soundEngine.playAchievement();
    showRewardToast(
      xpEarned > 0 ? `Lencana Pencipta Mesej (+${xpEarned} XP)` : 'Skrip Mesej Dikemas Kini!',
      message
    );
    setActiveInteractable(null);
    // Initiate cinematic Quantum Ascension directly to Final World (Menara Langit)
    window.setTimeout(() => {
      triggerQuantumTeleport(5);
    }, 650);
  };

  const handleVideoSubmitted = async (xpEarned: number, message: string) => {
    setCelebrationPulseKey((k) => k + 1);
    await refreshState();
    soundEngine.playVictory();
    showRewardToast(
      xpEarned > 0 ? `Lencana Wira Bahasa (+${xpEarned} XP)` : 'Video Mesej Dikemas Kini!',
      message
    );
    setActiveInteractable(null);

    // Trigger Grand Finale 3D Celebration -> Auto-transition to Final Score Dashboard
    setGrandVictoryActive(true);
    if (grandVictoryTimerRef.current) {
      window.clearTimeout(grandVictoryTimerRef.current);
    }
    grandVictoryTimerRef.current = window.setTimeout(() => {
      setGrandVictoryActive(false);
      setView('ceremony');
      grandVictoryTimerRef.current = null;
    }, 5600);
  };

  const handleSavePosition = useCallback((pos: PlayerWorldPosition) => {
    api.savePosition(pos).catch(() => {});
  }, []);

  const handleChangePathway = async (pathway: LearningPathway) => {
    const res = await api.updatePathway(pathway);
    setPlayerState(res.state);
  };

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await api.logout();
    if (grandVictoryTimerRef.current) {
      window.clearTimeout(grandVictoryTimerRef.current);
      grandVictoryTimerRef.current = null;
    }
    setGrandVictoryActive(false);
    setTeleportOverlay(null);
    setPlayerState(null);
    setActiveInteractable(null);
    setShowJournal(false);
    setShowPause(false);
    setOpeningScene(4);
    setView('opening');
  };

  const handleTogglePause = useCallback(() => {
    if (activeInteractable) {
      setActiveInteractable(null);
      return;
    }
    if (showJournal) {
      setShowJournal(false);
      return;
    }
    if (showSettings) {
      setShowSettings(false);
      return;
    }
    setShowPause((p) => !p);
  }, [activeInteractable, showJournal, showSettings]);

  const handleZoomCamera = useCallback((delta: number) => {
    setZoomDeltaSignal((prev) => ({ key: (prev?.key ?? 0) + 1, delta }));
  }, []);

  // Map GameView to 3D Canvas mode
  const canvasMode: WorldCanvasMode =
    view === 'opening'
      ? 'opening'
      : view === 'portals' || view === 'login'
      ? 'portals'
      : view === 'character_select'
      ? 'character_select'
      : view === 'ceremony'
      ? 'ceremony'
      : 'city_play';

  const activeHeroId: HeroId =
    view === 'character_select'
      ? previewHeroId
      : playerState?.user.selectedHero ?? previewHeroId ?? 'arka';

  const controlsPaused =
    view !== 'city_play' ||
    Boolean(activeInteractable) ||
    Boolean(teleportOverlay?.active) ||
    grandVictoryActive ||
    showSettings ||
    showAbout ||
    showJournal ||
    showPause;

  const PHASE_LABELS: Record<TeleportPhaseId, string> = {
    idle: '',
    activate: 'FASA 1/6 · PENGAKTIFAN PORTAL KUANTUM',
    eruption: 'FASA 2/6 · LETUSAN TENAGA ANTARA DUNIA',
    ascend: 'FASA 3/6 · KENAIKAN WIRA WORDOPIA',
    transform: 'FASA 4/6 · TRANSFORMASI CAHAYA KUANTUM',
    tunnel: 'FASA 5/6 · TEROWONG DIMENSI BAHASA',
    arrive: 'FASA 6/6 · KETIBAAN DI DUNIA BAHARU',
  };

  const targetWorldMeta = teleportOverlay
    ? MISSIONS_CATALOG.find((m) => m.id === teleportOverlay.targetWorldId)
    : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#101C35] text-[#F4F8FF]">
      {/* Persistent 3D World Viewport */}
      <NexusWorldCanvas
        mode={canvasMode}
        openingScene={openingScene}
        heroId={activeHeroId}
        activeWorldId={activeWorldId}
        previewRotationOffset={heroRotOffset}
        highlightedPortal={highlightedPortal}
        initialPosition={playerState?.user.playerPosition}
        missions={playerState?.missions}
        completedChallenges={playerState?.user.completedChallenges}
        isDutaBahasa={Boolean(playerState?.user.isDutaBahasa)}
        controlsPaused={controlsPaused}
        reducedMotion={reducedMotion}
        simplified3d={simplified3d}
        celebrationPulseKey={celebrationPulseKey}
        zoomDeltaSignal={zoomDeltaSignal}
        teleportRequest={teleportRequest}
        skipTeleportKey={skipTeleportKey}
        grandVictoryActive={grandVictoryActive}
        mobileInputRef={mobileInputRef}
        onHudUpdate={setHudSnapshot}
        onTriggerInteractable={(item) => setActiveInteractable(item)}
        onSwitchWorld={triggerQuantumTeleport}
        onTeleportProgress={handleTeleportProgress}
        onTeleportComplete={handleTeleportComplete}
        onTogglePause={handleTogglePause}
        onSavePosition={handleSavePosition}
      />

      {/* QUANTUM ASCENSION OVERLAY (Phases 1-6 + Controlled Flash + Optional Skip) */}
      {view === 'city_play' && teleportOverlay?.active && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between p-5">
          {/* Controlled Bright White-Cyan Transition Flash (Phase 4) */}
          {teleportOverlay.flashOpacity > 0 && (
            <div
              className="pointer-events-none fixed inset-0 bg-[#E6FBFF]"
              style={{ opacity: Math.min(0.86, teleportOverlay.flashOpacity) }}
            />
          )}

          {/* Top Phase Indicator Banner */}
          <div className="relative z-10 mt-2 flex flex-col items-center gap-2">
            <div className="holo-panel rounded-2xl border-[#00C8F0]/60 bg-[#060E1F]/85 px-6 py-3 text-center shadow-[0_0_35px_rgba(0,200,240,0.4)]">
              <p className="font-mono-tabular text-[11px] font-extrabold tracking-widest text-[#00C8F0]">
                {PHASE_LABELS[teleportOverlay.phase]}
              </p>
              <p className="mt-1 font-display text-base font-extrabold text-[#F4F8FF]">
                {targetWorldMeta
                  ? `Menuju ke ${targetWorldMeta.code} · ${targetWorldMeta.worldName}`
                  : 'Memulakan Perjalanan Antara Dimensi'}
              </p>
            </div>
          </div>

          {/* Optional Skip Button (appears safely after Phase 1.6s) */}
          <div className="relative z-10 mb-6 flex justify-center">
            {teleportOverlay.canSkip && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSkipTeleportKey((k) => k + 1);
                }}
                className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#00C8F0]/55 bg-[#0A1428]/90 px-4 py-2 text-xs font-extrabold text-[#00C8F0] shadow-lg backdrop-blur hover:bg-[#00C8F0] hover:text-[#101C35]"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>Langkau Animasi</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRAND FINALE OVERLAY AFTER COMPLETING MISSION 5 */}
      {view === 'city_play' && grandVictoryActive && playerState && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-[#060E1F]/80 via-transparent to-transparent p-6 pb-10">
          <div className="holo-panel w-full max-w-2xl rounded-3xl border-2 border-[#FFB547] bg-[#0A1428]/92 p-6 text-center shadow-[0_0_60px_rgba(255,181,71,0.45)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFB547]/20 text-[#FFB547]">
              <Trophy className="h-6 w-6" />
            </div>
            <p className="mt-3 font-mono-tabular text-xs font-extrabold tracking-widest text-[#A5F05A]">
              MENARA LANGIT NEXUS DIPULIHKAN · RIBUT KATA TAMAT
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-[#FFB547] md:text-3xl">
              TAHNIAH, DUTA BAHASA WORDOPIA!
            </h2>
            <p className="mt-2 text-sm font-medium text-[#F4F8FF]/90">
              NOVA: Anda telah berjaya memulihkan seluruh rangkaian komunikasi WORDOPIA!
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              <span className="rounded-xl border border-[#00C8F0]/40 bg-[#101C35] px-3.5 py-1.5 text-[#00C8F0]">
                Ejen: {playerState.user.name}
              </span>
              <span className="rounded-xl border border-[#A5F05A]/40 bg-[#101C35] px-3.5 py-1.5 text-[#A5F05A]">
                {playerState.user.xp} XP Terkumpul
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  if (grandVictoryTimerRef.current) {
                    window.clearTimeout(grandVictoryTimerRef.current);
                    grandVictoryTimerRef.current = null;
                  }
                  setGrandVictoryActive(false);
                  setView('ceremony');
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFB547] to-[#A5F05A] px-4 py-1.5 font-extrabold text-[#101C35]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Lihat Papan Skor Akhir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 7: World Intro Banner on entering a mission world */}
      {view === 'city_play' &&
        worldIntroBanner &&
        !activeInteractable &&
        !teleportOverlay?.active &&
        !grandVictoryActive && (
          <div className="pointer-events-none fixed left-1/2 top-24 z-20 w-[92%] max-w-xl -translate-x-1/2">
            <div
              className="holo-panel rounded-2xl px-5 py-4 shadow-2xl"
              style={{ borderColor: worldIntroBanner.accentColor }}
            >
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4" style={{ color: worldIntroBanner.accentColor }} />
                <span
                  className="font-mono-tabular text-[11px] font-bold tracking-widest"
                  style={{ color: worldIntroBanner.accentColor }}
                >
                  {worldIntroBanner.code} · {worldIntroBanner.subtitle.toUpperCase()}
                </span>
              </div>
              <h3 className="mt-1 font-display text-lg font-extrabold text-[#F4F8FF]">
                SELAMAT DATANG KE {worldIntroBanner.worldName.toUpperCase()}
              </h3>
              <p className="mt-1 text-xs font-semibold text-[#A5F05A]">
                NOVA: “{worldIntroBanner.novaLine}”
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#F4F8FF]/80">
                Objektif Misi: {worldIntroBanner.objective}
              </p>
            </div>
          </div>
        )}

      {/* Reward / Unlock Toast Banner */}
      {rewardBanner && (
        <div className="pointer-events-none fixed left-1/2 top-5 z-50 w-[92%] max-w-md -translate-x-1/2">
          <div className="holo-panel flex items-center gap-3 rounded-2xl border-[#A5F05A] px-4 py-3 shadow-2xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A5F05A]/20 text-[#A5F05A]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[#A5F05A]">{rewardBanner.title}</p>
              <p className="text-xs text-[#F4F8FF]/90">{rewardBanner.subtitle}</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: OPENING & MAIN MENU */}
      {view === 'opening' && (
        <OpeningSequence3D
          sceneStep={openingScene}
          setSceneStep={setOpeningScene}
          canSkip={hasSeenIntroLocal || Boolean(playerState?.user.hasSeenIntro)}
          onStartGame={handleStartFromMenu}
          onOpenAbout={() => setShowAbout(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* VIEW: 3 ROLE PORTALS & LOGIN */}
      {(view === 'portals' || view === 'login') && (
        <RolePortalsScreen
          highlightedPortal={highlightedPortal}
          onHighlightPortal={setHighlightedPortal}
          onBackToMenu={() => {
            setOpeningScene(4);
            setView('opening');
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* VIEW: 3D CHARACTER SELECTION ROOM */}
      {view === 'character_select' && playerState && (
        <HeroSelectScreen
          playerName={playerState.user.name}
          selectedHero={previewHeroId}
          rotationOffset={heroRotOffset}
          onSelectHero={setPreviewHeroId}
          onRotate={(delta) => setHeroRotOffset((r) => r + delta)}
          onResetRotation={(yaw) => setHeroRotOffset(yaw)}
          onConfirmHero={handleConfirmHero}
        />
      )}

      {/* VIEW: PLAYABLE 3D MISSION WORLDS GAMEPLAY */}
      {view === 'city_play' && playerState && (
        <GameplayHUD
          state={playerState}
          activeWorldId={activeWorldId}
          hudSnapshot={hudSnapshot}
          missionOverrides={missionOverrides}
          mobileInputRef={mobileInputRef}
          muted={muted}
          cinematicActive={Boolean(teleportOverlay?.active) || grandVictoryActive}
          onToggleMute={handleToggleMute}
          onTriggerInteract={(item) => setActiveInteractable(item)}
          onSwitchWorld={triggerQuantumTeleport}
          onZoomCamera={handleZoomCamera}
          onOpenJournal={() => setShowJournal(true)}
          onOpenPause={() => setShowPause(true)}
          onChangeHero={() => {
            setPreviewHeroId(playerState.user.selectedHero ?? 'arka');
            setView('character_select');
          }}
          onOpenDewanWira={() => setView('dewan_wira')}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCeremony={() => setView('ceremony')}
          onOpenTeacherPortal={() => setView('teacher_portal')}
          onOpenAdminPortal={() => setView('admin_portal')}
          onLogout={handleLogout}
        />
      )}

      {/* IN-WORLD INTERACTION MODAL */}
      {view === 'city_play' && playerState && activeInteractable && (
        <ChallengeModal
          interactable={activeInteractable}
          playerState={playerState}
          onChallengeSolved={handleChallengeSolved}
          onAttemptLogged={(updated) => setPlayerState(updated)}
          onSwitchWorld={triggerQuantumTeleport}
          onActivateTeleport={triggerQuantumTeleport}
          onScriptSubmitted={handleScriptSubmitted}
          onVideoSubmitted={handleVideoSubmitted}
          onOpenCeremony={() => {
            setActiveInteractable(null);
            setView('ceremony');
          }}
          onClose={() => setActiveInteractable(null)}
        />
      )}

      {/* MISSION JOURNAL MODAL */}
      {view === 'city_play' && playerState && showJournal && (
        <MissionJournalModal
          state={playerState}
          activeWorldId={activeWorldId}
          onSwitchWorld={triggerQuantumTeleport}
          onClose={() => setShowJournal(false)}
        />
      )}

      {/* PAUSE MENU MODAL */}
      {view === 'city_play' && playerState && showPause && (
        <PauseMenuModal
          activeWorldId={activeWorldId}
          onResume={() => setShowPause(false)}
          onOpenJournal={() => setShowJournal(true)}
          onSwitchWorld={triggerQuantumTeleport}
          onOpenDewanWira={() => setView('dewan_wira')}
          onOpenSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
        />
      )}

      {/* VIEW: DEWAN WIRA */}
      {view === 'dewan_wira' && playerState && (
        <div className="relative z-20 h-full w-full bg-[#081226]/85">
          <DewanWiraView
            state={playerState}
            onOpenCeremony={() => setView('ceremony')}
            onBack={() => setView('city_play')}
          />
        </div>
      )}

      {/* VIEW: DUTA BAHASA CEREMONY & FINAL SCORE DASHBOARD */}
      {view === 'ceremony' && playerState && (
        <DutaBahasaCeremony state={playerState} onBack={() => setView('city_play')} />
      )}

      {/* VIEW: TEACHER PORTAL */}
      {view === 'teacher_portal' && playerState && (
        <div className="relative z-20 h-full w-full bg-[#081226]/88">
          <TeacherPortal onBack={() => setView('city_play')} />
        </div>
      )}

      {/* VIEW: ADMIN PORTAL */}
      {view === 'admin_portal' && playerState && (
        <div className="relative z-20 h-full w-full bg-[#081226]/88">
          <AdminPortal onBack={() => setView('city_play')} onRefreshState={refreshState} />
        </div>
      )}

      {/* ABOUT WORDOPIA MODAL */}
      {showAbout && <AboutWordopiaModal onClose={() => setShowAbout(false)} />}

      {/* SETTINGS & AUDIO MODAL */}
      {showSettings && (
        <SettingsModal
          pathway={playerState?.user.pathway}
          musicOn={musicOn}
          sfxOn={sfxOn}
          ambientOn={ambientOn}
          muted={muted}
          musicVolume={musicVolume}
          sfxVolume={sfxVolume}
          ambientVolume={ambientVolume}
          reducedMotion={reducedMotion}
          simplified3d={simplified3d}
          onChangePathway={playerState ? handleChangePathway : undefined}
          onToggleMusic={() => {
            const next = !musicOn;
            setMusicOn(next);
            soundEngine.setMusicEnabled(next);
          }}
          onToggleSfx={() => {
            const next = !sfxOn;
            setSfxOn(next);
            soundEngine.setSfxEnabled(next);
          }}
          onToggleAmbient={() => {
            const next = !ambientOn;
            setAmbientOn(next);
            soundEngine.setAmbientEnabled(next);
          }}
          onToggleMute={handleToggleMute}
          onChangeMusicVolume={(v) => {
            setMusicVolume(v);
            soundEngine.setMusicVolume(v);
          }}
          onChangeSfxVolume={(v) => {
            setSfxVolume(v);
            soundEngine.setSfxVolume(v);
          }}
          onChangeAmbientVolume={(v) => {
            setAmbientVolume(v);
            soundEngine.setAmbientVolume(v);
          }}
          onToggleReducedMotion={() => setReducedMotion((r) => !r)}
          onToggleSimplified3d={() => setSimplified3d((s) => !s)}
          onReplayIntro={() => {
            setOpeningScene(1);
            setView('opening');
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

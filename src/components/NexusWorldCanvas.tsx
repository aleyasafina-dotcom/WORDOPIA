import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { HERO_ROSTER, MISSIONS_CATALOG } from '../data/missions.ts';
import type {
  HeroId,
  MissionProgressItem,
  MissionWorldId,
  PlayerAnimationState,
  PlayerWorldPosition,
  RoboMood,
  TeleportPhaseId,
  TeleportProgressInfo,
  WorldInteractable,
} from '../types/game.ts';
import {
  buildProceduralHeroRig,
  loadPlayableHeroRig,
  updateHeroAnimation,
  type PlayableHeroRig,
} from '../three/humanCharacterBuilder.ts';
import { buildNexusCity } from '../three/nexusCityBuilder.ts';
import { animateRoboRig, buildRoboCompanion } from '../three/roboBuilder.ts';
import {
  TUNNEL_ORIGIN_X,
  createQuantumTeleportVfx,
  type QuantumTeleportController,
} from '../three/quantumTeleportVfx.ts';
import { createHoloPlatformTexture, createRadialShadowTexture } from '../three/textures.ts';
import { loadMissionWorld } from '../three/worlds/loadMissionWorld.ts';
import {
  disposeObject3D,
  type MissionWorldInstance,
  type WorldCollider,
} from '../three/worlds/worldCommon.ts';
import { soundEngine } from '../utils/soundEngine.ts';

export type WorldCanvasMode =
  | 'opening'
  | 'portals'
  | 'character_select'
  | 'city_play'
  | 'ceremony';

export interface MobileControlInput {
  moveX: number; // -1..1
  moveY: number; // -1..1
  running: boolean;
  jumpQueued: boolean;
  interactQueued: boolean;
  camDeltaX: number;
  camDeltaY: number;
}

export interface HudWorldSnapshot {
  x: number;
  z: number;
  yaw: number;
  worldId: MissionWorldId;
  nearestInteractable: WorldInteractable | null;
  worldInteractables: WorldInteractable[];
  worldLoading: boolean;
  camDistance: number;
}

interface NexusWorldCanvasProps {
  mode: WorldCanvasMode;
  openingScene: number;
  heroId: HeroId;
  activeWorldId: MissionWorldId;
  previewRotationOffset?: number;
  highlightedPortal?: 'pentadbir' | 'guru' | 'murid' | null;
  initialPosition?: PlayerWorldPosition;
  missions?: MissionProgressItem[];
  completedChallenges?: Record<string, string[]>;
  isDutaBahasa?: boolean;
  controlsPaused?: boolean;
  reducedMotion?: boolean;
  simplified3d?: boolean;
  celebrationPulseKey?: number;
  zoomDeltaSignal?: { key: number; delta: number } | null;
  teleportRequest?: { key: number; targetWorldId: MissionWorldId } | null;
  skipTeleportKey?: number;
  grandVictoryActive?: boolean;
  mobileInputRef: React.MutableRefObject<MobileControlInput>;
  onHudUpdate?: (snapshot: HudWorldSnapshot) => void;
  onTriggerInteractable?: (item: WorldInteractable) => void;
  onSwitchWorld?: (worldId: MissionWorldId) => void;
  onTeleportProgress?: (info: TeleportProgressInfo) => void;
  onTeleportComplete?: (worldId: MissionWorldId) => void;
  onTogglePause?: () => void;
  onSavePosition?: (pos: PlayerWorldPosition) => void;
}

function detectSoftwareGl(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const r = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase();
      if (r.includes('swiftshader') || r.includes('llvmpipe') || r.includes('software')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export const NexusWorldCanvas: React.FC<NexusWorldCanvasProps> = ({
  mode,
  openingScene,
  heroId,
  activeWorldId,
  previewRotationOffset = 0,
  highlightedPortal = null,
  missions,
  completedChallenges,
  isDutaBahasa = false,
  controlsPaused = false,
  reducedMotion = false,
  simplified3d = false,
  celebrationPulseKey = 0,
  zoomDeltaSignal = null,
  teleportRequest = null,
  skipTeleportKey = 0,
  grandVictoryActive = false,
  mobileInputRef,
  onHudUpdate,
  onTriggerInteractable,
  onSwitchWorld,
  onTeleportProgress,
  onTeleportComplete,
  onTogglePause,
  onSavePosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({
    mode,
    openingScene,
    heroId,
    activeWorldId,
    previewRotationOffset,
    highlightedPortal,
    missions,
    completedChallenges,
    isDutaBahasa,
    controlsPaused,
    reducedMotion,
    grandVictoryActive,
    onHudUpdate,
    onTriggerInteractable,
    onSwitchWorld,
    onTeleportProgress,
    onTeleportComplete,
    onTogglePause,
    onSavePosition,
  });
  propsRef.current = {
    mode,
    openingScene,
    heroId,
    activeWorldId,
    previewRotationOffset,
    highlightedPortal,
    missions,
    completedChallenges,
    isDutaBahasa,
    controlsPaused,
    reducedMotion,
    grandVictoryActive,
    onHudUpdate,
    onTriggerInteractable,
    onSwitchWorld,
    onTeleportProgress,
    onTeleportComplete,
    onTogglePause,
    onSavePosition,
  };

  const playerKinematicsRef = useRef({
    x: 0,
    y: 0,
    z: 16,
    vx: 0,
    vz: 0,
    vy: 0,
    grounded: true,
    landingTimer: 0,
    yaw: 0,
    camYaw: 0,
    camPitch: 0.34,
    camDistance: 6.4,
    interactTimer: 0,
    lastSavedTime: 0,
    lastHudTime: 0,
    lastInteractId: '' as string,
  });

  // Apply external HUD zoom button adjustments
  useEffect(() => {
    if (!zoomDeltaSignal) return;
    playerKinematicsRef.current.camDistance = THREE.MathUtils.clamp(
      playerKinematicsRef.current.camDistance + zoomDeltaSignal.delta,
      3.8,
      10.5
    );
  }, [zoomDeltaSignal]);

  // Active hero rig holder so heroId swaps seamlessly
  const activeHeroRef = useRef<PlayableHeroRig | null>(null);
  const heroGroupHolderRef = useRef<THREE.Group | null>(null);
  const loadedHeroIdRef = useRef<HeroId | null>(null);
  const selectReactTimerRef = useRef(0);

  useEffect(() => {
    selectReactTimerRef.current = 0.65;
    const holder = heroGroupHolderRef.current;
    if (!holder || loadedHeroIdRef.current === heroId) return;
    loadedHeroIdRef.current = heroId;
    let cancelled = false;
    loadPlayableHeroRig(heroId).then((rig) => {
      if (cancelled) return;
      holder.clear();
      holder.add(rig.root);
      activeHeroRef.current = rig;
    });
    return () => {
      cancelled = true;
    };
  }, [heroId]);

  // Lazy-loaded active Mission World ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const hemiRef = useRef<THREE.HemisphereLight | null>(null);
  const activeMissionWorldRef = useRef<MissionWorldInstance | null>(null);
  const loadedWorldIdRef = useRef<MissionWorldId | null>(null);
  const worldLoadingRef = useRef(false);

  // Quantum Ascension Teleportation State Machine
  const teleportRef = useRef<{
    active: boolean;
    targetWorldId: MissionWorldId;
    elapsed: number;
    lastPhase: TeleportPhaseId;
    swappedWorld: boolean;
    loadingStarted: boolean;
    landedPlayed: boolean;
    pendingWorld: MissionWorldInstance | null;
    skipRequested: boolean;
    orbitAngle: number;
    originX: number;
    originZ: number;
  }>({
    active: false,
    targetWorldId: 1,
    elapsed: 0,
    lastPhase: 'idle',
    swappedWorld: false,
    loadingStarted: false,
    landedPlayed: false,
    pendingWorld: null,
    skipRequested: false,
    orbitAngle: 0,
    originX: 0,
    originZ: 14,
  });
  const lastTeleportKeyRef = useRef(0);
  const lastSkipKeyRef = useRef(0);

  // Trigger 3D celebration burst when celebrationPulseKey increments
  const burstTriggerRef = useRef(0);
  useEffect(() => {
    if (celebrationPulseKey > 0) {
      burstTriggerRef.current = 1;
    }
  }, [celebrationPulseKey]);

  // Initiate Quantum Ascension when teleportRequest increments
  useEffect(() => {
    if (!teleportRequest || teleportRequest.key === lastTeleportKeyRef.current) return;
    lastTeleportKeyRef.current = teleportRequest.key;
    const pk = playerKinematicsRef.current;
    const tp = teleportRef.current;
    if (tp.pendingWorld) {
      disposeObject3D(tp.pendingWorld.root);
      tp.pendingWorld = null;
    }
    tp.active = true;
    tp.targetWorldId = teleportRequest.targetWorldId;
    tp.elapsed = 0;
    tp.lastPhase = 'idle';
    tp.swappedWorld = false;
    tp.loadingStarted = false;
    tp.landedPlayed = false;
    tp.skipRequested = false;
    tp.orbitAngle = pk.camYaw;
    tp.originX = pk.x;
    tp.originZ = pk.z;
    pk.vx = 0;
    pk.vz = 0;
    pk.vy = 0;
    pk.grounded = true;
  }, [teleportRequest]);

  // Trigger immediate skip if skipTeleportKey increments
  useEffect(() => {
    if (!skipTeleportKey || skipTeleportKey === lastSkipKeyRef.current) return;
    lastSkipKeyRef.current = skipTeleportKey;
    if (teleportRef.current.active) {
      teleportRef.current.skipRequested = true;
    }
  }, [skipTeleportKey]);

  // Dynamically load ONLY the active Mission World when activeWorldId changes outside teleport
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (loadedWorldIdRef.current === activeWorldId && activeMissionWorldRef.current) return;
    let cancelled = false;
    worldLoadingRef.current = true;

    loadMissionWorld(activeWorldId, simplified3d).then((nextWorld) => {
      if (cancelled) {
        disposeObject3D(nextWorld.root);
        return;
      }

      if (activeMissionWorldRef.current) {
        scene.remove(activeMissionWorldRef.current.root);
        disposeObject3D(activeMissionWorldRef.current.root);
      }

      activeMissionWorldRef.current = nextWorld;
      loadedWorldIdRef.current = activeWorldId;
      scene.add(nextWorld.root);

      const pk = playerKinematicsRef.current;
      pk.x = nextWorld.spawnPoint.x;
      pk.z = nextWorld.spawnPoint.z;
      pk.y = 0;
      pk.vx = 0;
      pk.vz = 0;
      pk.vy = 0;
      pk.grounded = true;
      pk.yaw = nextWorld.spawnPoint.yaw;
      pk.camYaw = nextWorld.spawnPoint.yaw;

      worldLoadingRef.current = false;

      propsRef.current.onHudUpdate?.({
        x: pk.x,
        z: pk.z,
        yaw: pk.yaw,
        worldId: activeWorldId,
        nearestInteractable: null,
        worldInteractables: nextWorld.interactables,
        worldLoading: false,
        camDistance: pk.camDistance,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeWorldId, simplified3d]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: !simplified3d,
      powerPreference: 'high-performance',
    });
    const isSoftwareGl = detectSoftwareGl(renderer);
    renderer.setPixelRatio(
      isSoftwareGl || simplified3d ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = !isSoftwareGl && !simplified3d;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#13315C');
    scene.fog = new THREE.FogExp2('#163B70', 0.01);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.52;

    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.2,
      260
    );

    // Calibrated Balanced Studio Lighting (prevents highlight blowout on bright scenes/NOVA)
    const hemi = new THREE.HemisphereLight('#BAE6FD', '#1E3A5F', 0.78);
    scene.add(hemi);
    hemiRef.current = hemi;

    const dirLight = new THREE.DirectionalLight('#F8FAFC', 1.15);
    dirLight.position.set(24, 42, 26);
    if (!isSoftwareGl && !simplified3d) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 4;
      dirLight.shadow.camera.far = 140;
      dirLight.shadow.bias = -0.0004;
      dirLight.shadow.normalBias = 0.025;
      const d = 48;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
    }
    scene.add(dirLight);

    const fillRimLight = new THREE.PointLight('#38BDF8', 0.75, 28);
    fillRimLight.position.set(0, 7, 16);
    scene.add(fillRimLight);

    // Selective HDR Bloom Post-Processing (threshold 1.18 keeps ordinary lit surfaces crisp & bloom-free)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl && !simplified3d) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.22,
        0.28,
        1.18
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // Quantum Ascension VFX Controller
    const quantumVfx: QuantumTeleportController = createQuantumTeleportVfx(scene);

    // 1. Existing NEXUS Opening & Ceremony City Backdrop (hidden during city_play so only active world renders)
    const openingCityData = buildNexusCity(simplified3d || isSoftwareGl);
    scene.add(openingCityData.cityGroup);

    // 2. Load initial active mission world immediately
    loadMissionWorld(propsRef.current.activeWorldId, simplified3d || isSoftwareGl).then((w) => {
      if (!alive) {
        disposeObject3D(w.root);
        return;
      }
      if (activeMissionWorldRef.current) {
        scene.remove(activeMissionWorldRef.current.root);
        disposeObject3D(activeMissionWorldRef.current.root);
      }
      activeMissionWorldRef.current = w;
      loadedWorldIdRef.current = w.worldId;
      scene.add(w.root);
    });

    // 3. Playable Hero Holder + Ground Shadow + ROBO companion
    const heroHolder = new THREE.Group();
    heroGroupHolderRef.current = heroHolder;
    scene.add(heroHolder);

    const initialRig = buildProceduralHeroRig(propsRef.current.heroId);
    heroHolder.add(initialRig.root);
    activeHeroRef.current = initialRig;
    loadedHeroIdRef.current = propsRef.current.heroId;

    const shadowTex = createRadialShadowTexture();
    const playerShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 1.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.52, depthWrite: false })
    );
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.position.y = 0.03;
    heroHolder.add(playerShadow);

    const robo = buildRoboCompanion();
    scene.add(robo.root);

    // 4. Celebration 3D Particle Burst + Glow Ring System
    const burstGroup = new THREE.Group();
    burstGroup.visible = false;
    scene.add(burstGroup);

    const burstRingMat = new THREE.MeshBasicMaterial({
      color: '#A5F05A',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const burstRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.95, 32), burstRingMat);
    burstRing.rotation.x = -Math.PI / 2;
    burstRing.position.y = 0.08;
    burstGroup.add(burstRing);

    interface SparkParticle {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
    }
    const sparks: SparkParticle[] = [];
    const sparkColors = ['#00C8F0', '#A5F05A', '#FFB547', '#F8FAFC'];
    const sparkGeo = new THREE.OctahedronGeometry(0.09, 0);
    for (let i = 0; i < 24; i++) {
      const sp = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: sparkColors[i % sparkColors.length] })
      );
      burstGroup.add(sp);
      sparks.push({ mesh: sp, vx: 0, vy: 0, vz: 0 });
    }
    let burstAge = -1;

    // 5. Futuristic 3-Portal Command Hub (Mode: 'portals')
    const portalsGroup = new THREE.Group();
    portalsGroup.position.set(200, 0, 0);
    scene.add(portalsGroup);

    const hubFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 26),
      new THREE.MeshStandardMaterial({ color: '#14274E', roughness: 0.28, metalness: 0.35 })
    );
    hubFloor.rotation.x = -Math.PI / 2;
    portalsGroup.add(hubFloor);

    const hubBackWall = new THREE.Mesh(
      new THREE.BoxGeometry(28, 11, 1),
      new THREE.MeshStandardMaterial({ color: '#1A3466', roughness: 0.4, metalness: 0.3 })
    );
    hubBackWall.position.set(0, 5.5, -6);
    portalsGroup.add(hubBackWall);

    const portalDefs: { id: 'pentadbir' | 'guru' | 'murid'; x: number; color: string }[] = [
      { id: 'pentadbir', x: -5.5, color: '#7B61FF' },
      { id: 'guru', x: 0, color: '#FFB547' },
      { id: 'murid', x: 5.5, color: '#00C8F0' },
    ];
    const portalRings: Record<string, THREE.Mesh> = {};
    portalDefs.forEach((pd) => {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.15, 0.2, 12, 32, Math.PI),
        new THREE.MeshStandardMaterial({
          color: pd.color,
          emissive: pd.color,
          emissiveIntensity: 0.95,
          roughness: 0.22,
        })
      );
      arch.position.set(pd.x, 2.3, -5.2);
      portalsGroup.add(arch);
      portalRings[pd.id] = arch;

      const core = new THREE.Mesh(
        new THREE.CircleGeometry(2.0, 28),
        new THREE.MeshBasicMaterial({
          color: pd.color,
          transparent: true,
          opacity: 0.35,
        })
      );
      core.position.set(pd.x, 2.3, -5.25);
      portalsGroup.add(core);
    });

    // 6. Bright 4-Hero Character Selection Hall (Mode: 'character_select')
    const selectRoomGroup = new THREE.Group();
    selectRoomGroup.position.set(-200, 0, 0);
    scene.add(selectRoomGroup);

    const selectFloor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshStandardMaterial({ color: '#152B56', roughness: 0.28, metalness: 0.3 })
    );
    selectFloor.rotation.x = -Math.PI / 2;
    selectFloor.receiveShadow = true;
    selectRoomGroup.add(selectFloor);

    const selectBackArc = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 7, 24, 1, true, Math.PI * 0.72, Math.PI * 0.56),
      new THREE.MeshStandardMaterial({
        color: '#1D3C74',
        roughness: 0.35,
        metalness: 0.25,
        side: THREE.DoubleSide,
      })
    );
    selectBackArc.position.set(0, 3.5, 0);
    selectRoomGroup.add(selectBackArc);

    const selectSpotLight = new THREE.PointLight('#FFFFFF', 1.85, 14);
    selectSpotLight.position.set(-200, 4.2, 2.5);
    scene.add(selectSpotLight);

    // Build all 4 full-body 3D characters together on illuminated pedestals
    interface HeroSelectSlot {
      id: HeroId;
      rig: PlayableHeroRig;
      pedestal: THREE.Mesh;
      ring: THREE.Mesh;
      baseX: number;
    }
    const holoTex = createHoloPlatformTexture('#00C8F0');
    const selectSlots: HeroSelectSlot[] = [];
    const slotXs = [-2.85, -0.95, 0.95, 2.85];

    HERO_ROSTER.forEach((heroMeta, idx) => {
      const bx = slotXs[idx];
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.78, 0.9, 0.22, 28),
        new THREE.MeshStandardMaterial({ map: holoTex, roughness: 0.36, metalness: 0.45 })
      );
      pedestal.position.set(bx, 0.11, 0);
      pedestal.receiveShadow = true;
      selectRoomGroup.add(pedestal);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.84, 0.96, 32),
        new THREE.MeshStandardMaterial({
          color: heroMeta.secondaryColor,
          emissive: heroMeta.secondaryColor,
          emissiveIntensity: 0.25,
          roughness: 0.4,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bx, 0.23, 0);
      selectRoomGroup.add(ring);

      const rig = buildProceduralHeroRig(heroMeta.id);
      rig.root.position.set(bx, 0.22, 0);
      selectRoomGroup.add(rig.root);

      selectSlots.push({
        id: heroMeta.id,
        rig,
        pedestal,
        ring,
        baseX: bx,
      });
    });

    // Keyboard, Mouse Wheel & Pointer controls
    const keys: Record<string, boolean> = {};
    let dragActive = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let dragRotateChar = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && propsRef.current.mode === 'city_play') {
        e.preventDefault();
        propsRef.current.onTogglePause?.();
        return;
      }
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      const code = e.code;
      keys[code] = true;
      if (propsRef.current.mode === 'city_play' && !propsRef.current.controlsPaused) {
        if (code === 'Space' && playerKinematicsRef.current.grounded) {
          playerKinematicsRef.current.vy = 8.4;
          playerKinematicsRef.current.grounded = false;
          soundEngine.playJump();
        }
        if (code === 'KeyE') {
          mobileInputRef.current.interactQueued = true;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const dom = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlockAudio();
      dragActive = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragActive) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (propsRef.current.mode === 'city_play' && !propsRef.current.controlsPaused) {
        playerKinematicsRef.current.camYaw -= dx * 0.0055;
        playerKinematicsRef.current.camPitch = THREE.MathUtils.clamp(
          playerKinematicsRef.current.camPitch + dy * 0.004,
          0.12,
          0.88
        );
      } else if (propsRef.current.mode === 'character_select') {
        dragRotateChar += dx * 0.01;
      }
    };
    const onPointerUp = () => {
      dragActive = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (propsRef.current.mode !== 'city_play' || propsRef.current.controlsPaused) return;
      playerKinematicsRef.current.camDistance = THREE.MathUtils.clamp(
        playerKinematicsRef.current.camDistance + e.deltaY * 0.004,
        3.8,
        10.5
      );
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-allocated math temporaries outside tick()
    const tmpCamTarget = new THREE.Vector3();
    const tmpLookTarget = new THREE.Vector3();
    const clock = new THREE.Clock();
    let rafId = 0;
    let alive = true;

    const hitsCollider = (px: number, pz: number, radius: number, cols: WorldCollider[], boundsRadius: number): boolean => {
      if (Math.hypot(px, pz) > boundsRadius) return true;
      for (const c of cols) {
        if (
          px + radius > c.minX &&
          px - radius < c.maxX &&
          pz + radius > c.minZ &&
          pz - radius < c.maxZ
        ) {
          return true;
        }
      }
      return false;
    };

    const tick = () => {
      if (!alive) return;
      const rawDelta = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const p = propsRef.current;

      const isCityPlay = p.mode === 'city_play';
      openingCityData.cityGroup.visible = p.mode === 'opening' || p.mode === 'ceremony';
      if (activeMissionWorldRef.current) {
        activeMissionWorldRef.current.root.visible = isCityPlay;
      }
      portalsGroup.visible = p.mode === 'portals';
      selectRoomGroup.visible = p.mode === 'character_select';

      if (openingCityData.cityGroup.visible) {
        openingCityData.animateCity(elapsed, rawDelta, p.missions, p.completedChallenges, p.isDutaBahasa);
      }

      let animState: PlayerAnimationState = 'idle';
      let roboMood: RoboMood = 'mesra';

      if (p.mode === 'opening') {
        heroHolder.visible = false;
        robo.root.visible = p.openingScene === 2;
        scene.background = new THREE.Color('#102348');
        renderer.toneMappingExposure = 0.96;
        dirLight.intensity = 1.15;
        if (bloomPass) {
          bloomPass.threshold = 1.18;
          bloomPass.strength = 0.22;
        }
        if (p.openingScene === 1) {
          const angle = elapsed * 0.22;
          tmpCamTarget.set(Math.sin(angle) * 34, 17, 28 + Math.cos(angle) * 14);
          tmpLookTarget.set(0, 6, -12);
          scene.fog = new THREE.FogExp2('#102348', 0.009);
          hemi.intensity = 0.78;
        } else if (p.openingScene === 2) {
          roboMood = 'amaran';
          const shake = p.reducedMotion ? 0 : Math.sin(elapsed * 26) * 0.16;
          tmpCamTarget.set(4 + shake, 8.5, 16);
          tmpLookTarget.set(0, 12, -40);
          robo.root.position.set(2.2, 8.2, 11.5);
          robo.root.lookAt(tmpCamTarget);
          scene.fog = new THREE.FogExp2('#1C1430', 0.014);
          hemi.intensity = 0.62;
        } else {
          const drift = p.reducedMotion ? 0 : Math.sin(elapsed * 0.25) * 3.5;
          tmpCamTarget.set(drift, 11.5, 52);
          tmpLookTarget.set(0, 12, -32);
          scene.fog = new THREE.FogExp2('#102348', 0.0095);
          hemi.intensity = 0.78;
        }
        camera.position.lerp(tmpCamTarget, 0.06);
        camera.lookAt(tmpLookTarget);
      } else if (p.mode === 'portals') {
        heroHolder.visible = true;
        robo.root.visible = true;
        scene.background = new THREE.Color('#12264E');
        scene.fog = new THREE.FogExp2('#12264E', 0.01);
        renderer.toneMappingExposure = 0.96;
        hemi.intensity = 0.82;
        dirLight.intensity = 1.15;
        if (bloomPass) {
          bloomPass.threshold = 1.18;
          bloomPass.strength = 0.24;
        }

        heroHolder.position.set(200, 0, 2.2);
        heroHolder.rotation.y = Math.PI;
        robo.root.position.set(201.3, 1.35, 1.4);
        robo.root.rotation.y = Math.PI * 0.85;

        portalDefs.forEach((pd) => {
          const ring = portalRings[pd.id];
          if (!ring) return;
          const mat = ring.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = p.highlightedPortal === pd.id ? 1.25 : 0.55;
        });

        tmpCamTarget.set(200, 2.4, 7.6);
        tmpLookTarget.set(200, 2.0, -4.5);
        camera.position.lerp(tmpCamTarget, 0.08);
        camera.lookAt(tmpLookTarget);
      } else if (p.mode === 'character_select') {
        // Show ALL 4 full-body characters standing together!
        heroHolder.visible = false;
        robo.root.visible = true;
        scene.background = new THREE.Color('#152E60');
        scene.fog = new THREE.FogExp2('#152E60', 0.012);
        renderer.toneMappingExposure = 0.96;
        hemi.intensity = 0.85;
        dirLight.intensity = 1.15;
        if (bloomPass) {
          bloomPass.threshold = 1.18;
          bloomPass.strength = 0.22;
        }

        if (selectReactTimerRef.current > 0) {
          selectReactTimerRef.current = Math.max(0, selectReactTimerRef.current - rawDelta);
        }

        let focusedX = 0;
        selectSlots.forEach((slot) => {
          const isSelected = slot.id === p.heroId;
          const targetZ = isSelected ? 0.85 : -0.25;
          const targetY = isSelected ? 0.34 : 0.22;
          slot.rig.root.position.z = THREE.MathUtils.damp(slot.rig.root.position.z, targetZ, 8, rawDelta);
          slot.rig.root.position.y = THREE.MathUtils.damp(slot.rig.root.position.y, targetY, 8, rawDelta);
          slot.pedestal.position.z = slot.rig.root.position.z;
          slot.ring.position.z = slot.rig.root.position.z;
          slot.ring.scale.setScalar(isSelected ? 1.18 : 0.92);
          const ringMat = slot.ring.material as THREE.MeshStandardMaterial;
          ringMat.opacity = isSelected ? 0.95 : 0.4;
          ringMat.emissiveIntensity = isSelected ? 0.4 : 0.12;

          const targetRot = isSelected ? p.previewRotationOffset + dragRotateChar : 0;
          slot.rig.root.rotation.y = THREE.MathUtils.damp(slot.rig.root.rotation.y, targetRot, 10, rawDelta);

          const slotAnim: PlayerAnimationState =
            isSelected && selectReactTimerRef.current > 0 ? 'interact' : 'idle';
          updateHeroAnimation(slot.rig, slotAnim, elapsed + slot.baseX * 0.4, rawDelta);
          if (isSelected) focusedX = slot.baseX;
        });

        selectSpotLight.position.set(-200 + focusedX, 4.2, 2.8);
        robo.root.position.set(-200 + focusedX + 0.95, 1.65, 0.9);
        robo.root.rotation.y = -0.35;

        // Smooth camera framing all 4 heroes while subtly leaning toward selected hero
        tmpCamTarget.set(-200 + focusedX * 0.48, 1.75, 5.4);
        tmpLookTarget.set(-200 + focusedX * 0.55, 1.05, 0.2);
        camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 6));
        camera.lookAt(tmpLookTarget);
      } else if (p.mode === 'ceremony') {
        heroHolder.visible = true;
        robo.root.visible = true;
        animState = 'victory';
        roboMood = 'bangga';
        scene.background = new THREE.Color('#132E5E');
        scene.fog = new THREE.FogExp2('#132E5E', 0.0085);
        renderer.toneMappingExposure = 0.98;
        hemi.intensity = 0.85;
        dirLight.intensity = 1.2;
        if (bloomPass) {
          bloomPass.threshold = 1.08;
          bloomPass.strength = 0.3;
        }

        heroHolder.position.set(0, 0, -34);
        heroHolder.rotation.y = 0;
        robo.root.position.set(1.5, 1.6, -34.4);
        robo.root.rotation.y = -0.4;
        const orbA = elapsed * 0.35;
        tmpCamTarget.set(Math.sin(orbA) * 5.2, 2.8, -28 + Math.cos(orbA) * 1.4);
        tmpLookTarget.set(0, 2.0, -36);
        camera.position.lerp(tmpCamTarget, 0.08);
        camera.lookAt(tmpLookTarget);
      } else if (isCityPlay) {
        const tp = teleportRef.current;
        const pk = playerKinematicsRef.current;
        let world = activeMissionWorldRef.current;

        // ===================================================================
        // QUANTUM ASCENSION — 7-PHASE CINEMATIC TELEPORTATION SEQUENCE
        // ===================================================================
        if (tp.active) {
          tp.elapsed += rawDelta;

          // Phase timing boundaries (total ~10.6s, snappy AAA pacing)
          const T_ACT = 1.3;
          const T_ERUPT = 2.7;
          const T_ASCEND = 5.1;
          const T_TRANS = 6.4;
          const T_TUNNEL = 8.6;
          const T_ARRIVE = 10.7;

          // Preload destination world cleanly in background during Transform/Tunnel
          if (!tp.loadingStarted) {
            tp.loadingStarted = true;
            const targetId = tp.targetWorldId;
            loadMissionWorld(targetId, simplified3d || isSoftwareGl).then((nextW) => {
              if (!alive || !tp.active || tp.targetWorldId !== targetId) {
                disposeObject3D(nextW.root);
                return;
              }
              tp.pendingWorld = nextW;
            });
          }

          // Helper to finish teleport cleanly (used by natural end AND Skip button)
          const finalizeTeleport = () => {
            if (!tp.swappedWorld && tp.pendingWorld) {
              if (activeMissionWorldRef.current) {
                scene.remove(activeMissionWorldRef.current.root);
                disposeObject3D(activeMissionWorldRef.current.root);
              }
              activeMissionWorldRef.current = tp.pendingWorld;
              loadedWorldIdRef.current = tp.targetWorldId;
              scene.add(tp.pendingWorld.root);
              world = tp.pendingWorld;
              tp.pendingWorld = null;
              tp.swappedWorld = true;
            }
            if (world) {
              world.root.visible = true;
              pk.x = world.spawnPoint.x;
              pk.z = world.spawnPoint.z;
              pk.yaw = world.spawnPoint.yaw;
              pk.camYaw = world.spawnPoint.yaw;
            }
            pk.y = 0;
            pk.vx = 0;
            pk.vz = 0;
            pk.vy = 0;
            pk.grounded = true;
            heroHolder.visible = true;
            heroHolder.scale.set(1, 1, 1);
            heroHolder.position.set(pk.x, 0, pk.z);
            heroHolder.rotation.y = pk.yaw;
            robo.root.visible = true;
            camera.fov = 52;
            camera.rotation.z = 0;
            camera.updateProjectionMatrix();
            renderer.toneMappingExposure = world?.exposure ?? 0.96;
            if (bloomPass) {
              bloomPass.threshold = 1.18;
              bloomPass.strength = 0.22;
            }
            quantumVfx.hideAll();
            tp.active = false;
            tp.lastPhase = 'idle';
            tp.skipRequested = false;

            p.onTeleportProgress?.({
              active: false,
              phase: 'idle',
              phaseNumber: 0,
              targetWorldId: tp.targetWorldId,
              flashOpacity: 0,
              canSkip: false,
            });
            if (world) {
              p.onHudUpdate?.({
                x: pk.x,
                z: pk.z,
                yaw: pk.yaw,
                worldId: tp.targetWorldId,
                nearestInteractable: null,
                worldInteractables: world.interactables,
                worldLoading: false,
                camDistance: pk.camDistance,
              });
            }
            p.onTeleportComplete?.(tp.targetWorldId);
          };

          if (tp.skipRequested) {
            if (tp.pendingWorld || tp.swappedWorld) {
              finalizeTeleport();
            }
            // If pendingWorld is still loading (~50ms), wait cleanly next frame with skipRequested=true
          } else {
            let phase: TeleportPhaseId = 'activate';
            let phaseNum = 1;
            let phaseT = 0;
            let flashOpacity = 0;

            if (tp.elapsed < T_ACT) {
              phase = 'activate';
              phaseNum = 1;
              phaseT = tp.elapsed / T_ACT;
            } else if (tp.elapsed < T_ERUPT) {
              phase = 'eruption';
              phaseNum = 2;
              phaseT = (tp.elapsed - T_ACT) / (T_ERUPT - T_ACT);
            } else if (tp.elapsed < T_ASCEND) {
              phase = 'ascend';
              phaseNum = 3;
              phaseT = (tp.elapsed - T_ERUPT) / (T_ASCEND - T_ERUPT);
            } else if (tp.elapsed < T_TRANS) {
              phase = 'transform';
              phaseNum = 4;
              phaseT = (tp.elapsed - T_ASCEND) / (T_TRANS - T_ASCEND);
            } else if (tp.elapsed < T_TUNNEL) {
              phase = 'tunnel';
              phaseNum = 5;
              phaseT = (tp.elapsed - T_TRANS) / (T_TUNNEL - T_TRANS);
            } else if (tp.elapsed < T_ARRIVE) {
              phase = 'arrive';
              phaseNum = 6;
              phaseT = (tp.elapsed - T_TUNNEL) / (T_ARRIVE - T_TUNNEL);
            } else {
              finalizeTeleport();
            }

            if (tp.active) {
              if (phase !== tp.lastPhase) {
                tp.lastPhase = phase;
                soundEngine.playTeleportPhase(phase);
                if (phase === 'arrive') {
                  if (!tp.swappedWorld && tp.pendingWorld) {
                    if (activeMissionWorldRef.current) {
                      scene.remove(activeMissionWorldRef.current.root);
                      disposeObject3D(activeMissionWorldRef.current.root);
                    }
                    activeMissionWorldRef.current = tp.pendingWorld;
                    loadedWorldIdRef.current = tp.targetWorldId;
                    scene.add(tp.pendingWorld.root);
                    world = tp.pendingWorld;
                    tp.pendingWorld = null;
                    tp.swappedWorld = true;
                  }
                  if (world) {
                    pk.x = world.spawnPoint.x;
                    pk.z = world.spawnPoint.z;
                    pk.yaw = world.spawnPoint.yaw;
                    pk.camYaw = world.spawnPoint.yaw;
                  }
                  heroHolder.scale.set(1, 1, 1);
                  quantumVfx.resetArrivalBurst(pk.x, 3.8, pk.z);
                }
              }

              // Keep destination sky & lighting vivid during Quantum Ascension phases
              if (bloomPass) bloomPass.threshold = 0.9;
              if (world && phase !== 'tunnel') {
                world.root.visible = true;
                scene.background = new THREE.Color(world.skyColor);
                scene.fog = new THREE.FogExp2(world.fogColor, world.fogDensity);
                hemi.color.set(world.hemiSky);
                hemi.groundColor.set(world.hemiGround);
                hemi.intensity =
                  phase === 'eruption' || phase === 'ascend'
                    ? world.hemiIntensity + 0.3
                    : world.hemiIntensity;
                dirLight.intensity = world.dirIntensity ?? 1.15;
                renderer.toneMappingExposure = world.exposure ?? 0.96;
                world.animateWorld(elapsed, rawDelta, p.missions, p.completedChallenges, p.isDutaBahasa);
              }

              tp.orbitAngle += rawDelta * (phase === 'ascend' ? 0.52 : 0.28);

              if (phase === 'activate') {
                heroHolder.visible = true;
                heroHolder.scale.set(1, 1, 1);
                pk.y = 0;
                animState = 'idle';
                roboMood = 'berfikir';
                if (bloomPass) bloomPass.strength = 0.42 + phaseT * 0.18;

                tmpCamTarget.set(
                  pk.x + Math.sin(tp.orbitAngle) * 4.8,
                  1.55,
                  pk.z + Math.cos(tp.orbitAngle) * 4.8
                );
                tmpLookTarget.set(pk.x, 1.25, pk.z);
                camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 6));
                camera.lookAt(tmpLookTarget);
                quantumVfx.tunnelGroup.visible = false;
                quantumVfx.updateAura(phase, phaseT, elapsed, rawDelta, pk.x, pk.y, pk.z);
              } else if (phase === 'eruption') {
                heroHolder.visible = true;
                pk.y = THREE.MathUtils.smoothstep(phaseT, 0.55, 1) * 0.25;
                animState = 'ascend';
                roboMood = 'teruja';
                if (bloomPass) bloomPass.strength = 0.6 + phaseT * 0.28;

                tmpCamTarget.set(
                  pk.x + Math.sin(tp.orbitAngle) * 5.4,
                  1.22,
                  pk.z + Math.cos(tp.orbitAngle) * 5.4
                );
                tmpLookTarget.set(pk.x, 1.55, pk.z);
                camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 6));
                camera.lookAt(tmpLookTarget);
                quantumVfx.tunnelGroup.visible = false;
                quantumVfx.updateAura(phase, phaseT, elapsed, rawDelta, pk.x, pk.y, pk.z);
              } else if (phase === 'ascend') {
                heroHolder.visible = true;
                // Smooth cubic levitation from 0.25m up to 4.25m above ground
                const liftEase = phaseT * phaseT * (3 - 2 * phaseT);
                pk.y = 0.25 + liftEase * 4.0;
                animState = 'ascend';
                roboMood = 'teruja';
                if (bloomPass) bloomPass.strength = 0.78 + liftEase * 0.16;

                // Cinematic low-angle hero view looking upward
                tmpCamTarget.set(
                  pk.x + Math.sin(tp.orbitAngle) * (5.2 - liftEase * 0.5),
                  1.15 + pk.y * 0.42,
                  pk.z + Math.cos(tp.orbitAngle) * (5.2 - liftEase * 0.5)
                );
                tmpLookTarget.set(pk.x, pk.y + 1.05, pk.z);
                camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 7));
                camera.lookAt(tmpLookTarget);
                quantumVfx.tunnelGroup.visible = false;
                quantumVfx.updateAura(phase, phaseT, elapsed, rawDelta, pk.x, pk.y, pk.z);
              } else if (phase === 'transform') {
                pk.y = 4.25 + phaseT * 1.4;
                animState = 'ascend';
                roboMood = 'teruja';
                // Character elongates smoothly into radiant stream of light before tunnel entry
                const stretch = Math.pow(phaseT, 1.6);
                heroHolder.visible = phaseT < 0.85;
                heroHolder.scale.set(
                  Math.max(0.22, 1 - stretch * 0.72),
                  1 + stretch * 1.35,
                  Math.max(0.22, 1 - stretch * 0.72)
                );
                flashOpacity = Math.pow(THREE.MathUtils.clamp((phaseT - 0.55) / 0.45, 0, 1), 1.4) * 0.68;
                camera.fov = THREE.MathUtils.lerp(52, 66, phaseT);
                camera.updateProjectionMatrix();
                if (bloomPass) bloomPass.strength = 0.92 + phaseT * 0.22;

                tmpCamTarget.set(
                  pk.x + Math.sin(tp.orbitAngle) * 4.4,
                  pk.y - 0.4,
                  pk.z + Math.cos(tp.orbitAngle) * 4.4
                );
                tmpLookTarget.set(pk.x, pk.y + 1.1, pk.z);
                camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 8));
                camera.lookAt(tmpLookTarget);
                quantumVfx.tunnelGroup.visible = false;
                quantumVfx.updateAura(phase, phaseT, elapsed, rawDelta, pk.x, pk.y, pk.z);
              } else if (phase === 'tunnel') {
                // Ensure world swaps cleanly behind the scenes while flying through tunnel
                if (!tp.swappedWorld && tp.pendingWorld) {
                  if (activeMissionWorldRef.current) {
                    scene.remove(activeMissionWorldRef.current.root);
                    disposeObject3D(activeMissionWorldRef.current.root);
                  }
                  activeMissionWorldRef.current = tp.pendingWorld;
                  loadedWorldIdRef.current = tp.targetWorldId;
                  scene.add(tp.pendingWorld.root);
                  world = tp.pendingWorld;
                  tp.pendingWorld = null;
                  tp.swappedWorld = true;
                }
                if (world) world.root.visible = false;
                heroHolder.visible = false;
                robo.root.visible = false;
                scene.background = new THREE.Color('#06122B');
                scene.fog = new THREE.FogExp2('#071738', 0.012);

                flashOpacity = Math.max(0, (1 - phaseT * 3.5) * 0.65);
                camera.fov = 68 + Math.sin(phaseT * Math.PI) * 5;
                camera.updateProjectionMatrix();
                if (bloomPass) bloomPass.strength = 0.85;

                camera.position.set(
                  TUNNEL_ORIGIN_X + Math.sin(elapsed * 3.2) * 0.35,
                  Math.cos(elapsed * 2.6) * 0.28,
                  2.0
                );
                camera.lookAt(
                  TUNNEL_ORIGIN_X + Math.sin(elapsed * 1.8) * 0.6,
                  Math.cos(elapsed * 1.5) * 0.4,
                  -46
                );
                camera.rotation.z = Math.sin(elapsed * 2.4) * 0.045;
                quantumVfx.auraGroup.visible = false;
                quantumVfx.updateTunnel(elapsed, rawDelta, phaseT);
              } else if (phase === 'arrive') {
                quantumVfx.tunnelGroup.visible = false;
                camera.rotation.z = 0;
                heroHolder.visible = true;
                heroHolder.scale.set(1, 1, 1);
                robo.root.visible = true;

                // Gentle cushioned descent from 3.8m -> 0m (touchdown at ~45% of arrive)
                const descendT = THREE.MathUtils.clamp(phaseT / 0.48, 0, 1);
                const easeOut = 1 - Math.pow(1 - descendT, 3);
                pk.y = (1 - easeOut) * 3.8;

                if (descendT < 0.96) {
                  animState = 'ascend';
                } else {
                  if (!tp.landedPlayed) {
                    tp.landedPlayed = true;
                    soundEngine.playLand();
                  }
                  animState = phaseT < 0.72 ? 'landing' : 'idle';
                }

                camera.fov = THREE.MathUtils.lerp(66, 52, THREE.MathUtils.smoothstep(phaseT, 0, 0.85));
                camera.updateProjectionMatrix();
                if (bloomPass) bloomPass.strength = 0.68 - phaseT * 0.34;

                const camDistArrive = THREE.MathUtils.lerp(5.2, pk.camDistance, phaseT);
                const camYawArrive = pk.camYaw + (1 - phaseT) * 0.95;
                tmpCamTarget.set(
                  pk.x + Math.sin(camYawArrive) * Math.cos(pk.camPitch) * camDistArrive,
                  Math.max(1.25, pk.y + 1.65 + Math.sin(pk.camPitch) * camDistArrive),
                  pk.z + Math.cos(camYawArrive) * Math.cos(pk.camPitch) * camDistArrive
                );
                tmpLookTarget.set(pk.x, pk.y + 1.32, pk.z);
                camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 6));
                camera.lookAt(tmpLookTarget);

                quantumVfx.updateAura(phase, phaseT, elapsed, rawDelta, pk.x, pk.y, pk.z);
              }

              // Sync hero & ROBO positions during airborne teleport phases
              if (heroHolder.visible) {
                heroHolder.position.set(pk.x, pk.y, pk.z);
                heroHolder.rotation.y = pk.yaw;
                playerShadow.position.y = 0.03 - pk.y;
                playerShadow.scale.setScalar(Math.max(0.35, 1 - pk.y * 0.14));
              }
              if (robo.root.visible) {
                const roboTargetX = pk.x + Math.cos(pk.yaw) * 1.15 - Math.sin(pk.yaw) * 0.45;
                const roboTargetZ = pk.z - Math.sin(pk.yaw) * 1.15 - Math.cos(pk.yaw) * 0.45;
                robo.root.position.set(roboTargetX, pk.y + 1.62, roboTargetZ);
                robo.root.rotation.y = pk.yaw;
              }

              p.onTeleportProgress?.({
                active: true,
                phase,
                phaseNumber: phaseNum,
                targetWorldId: tp.targetWorldId,
                flashOpacity,
                canSkip: tp.elapsed >= 1.6,
              });
            }
          }
        } else {
          // ===================================================================
          // STANDARD THIRD-PERSON EXPLORATION + GRAND VICTORY LIGHTING/FIREWORKS
          // ===================================================================
          quantumVfx.hideAll();
          if (Math.abs(camera.fov - 52) > 0.05) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, 52, Math.min(1, rawDelta * 8));
            camera.updateProjectionMatrix();
          }
          camera.rotation.z = 0;

          heroHolder.visible = true;
          heroHolder.scale.set(1, 1, 1);
          robo.root.visible = true;

          if (world) {
            if (p.grandVictoryActive) {
              // Illuminate city & brighten sky smoothly for Mission 5 Grand Victory!
              scene.background = new THREE.Color('#1D4ED8');
              scene.fog = new THREE.FogExp2('#2563EB', 0.0055);
              hemi.color.set('#E0F7FF');
              hemi.groundColor.set('#38BDF8');
              hemi.intensity = 1.4;
              dirLight.intensity = 1.75;
              renderer.toneMappingExposure = 1.04;
              if (bloomPass) {
                bloomPass.threshold = 0.95;
                bloomPass.strength = 0.52;
              }
              if (burstAge < 0) {
                burstTriggerRef.current = 1;
              }
            } else {
              scene.background = new THREE.Color(world.skyColor);
              scene.fog = new THREE.FogExp2(world.fogColor, world.fogDensity);
              hemi.color.set(world.hemiSky);
              hemi.groundColor.set(world.hemiGround);
              hemi.intensity = world.hemiIntensity;
              dirLight.intensity = world.dirIntensity ?? 1.15;
              renderer.toneMappingExposure = world.exposure ?? 0.96;
              if (bloomPass) {
                bloomPass.threshold = 1.18;
                bloomPass.strength = 0.22;
              }
            }
            world.animateWorld(elapsed, rawDelta, p.missions, p.completedChallenges, p.isDutaBahasa);
          }

          const mob = mobileInputRef.current;

          // Touch camera rotation
          if (Math.abs(mob.camDeltaX) > 0.0001 || Math.abs(mob.camDeltaY) > 0.0001) {
            pk.camYaw -= mob.camDeltaX * 0.006;
            pk.camPitch = THREE.MathUtils.clamp(pk.camPitch + mob.camDeltaY * 0.004, 0.12, 0.88);
            mob.camDeltaX = 0;
            mob.camDeltaY = 0;
          }

          if (mob.jumpQueued && pk.grounded && !p.controlsPaused && !p.grandVictoryActive) {
            pk.vy = 8.4;
            pk.grounded = false;
            soundEngine.playJump();
          }
          mob.jumpQueued = false;

          let moveForward = 0;
          let moveRight = 0;
          let running = mob.running;

          if (!p.controlsPaused && !p.grandVictoryActive) {
            if (keys['KeyW'] || keys['ArrowUp']) moveForward += 1;
            if (keys['KeyS'] || keys['ArrowDown']) moveForward -= 1;
            if (keys['KeyA'] || keys['ArrowLeft']) moveRight -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) moveRight += 1;
            if (keys['ShiftLeft'] || keys['ShiftRight']) running = true;

            if (Math.abs(mob.moveX) > 0.08 || Math.abs(mob.moveY) > 0.08) {
              moveRight += mob.moveX;
              moveForward += mob.moveY;
            }
          }

          const mag = Math.hypot(moveForward, moveRight);
          let targetVx = 0;
          let targetVz = 0;

          if (mag > 0.05) {
            const nf = moveForward / Math.max(1, mag);
            const nr = moveRight / Math.max(1, mag);
            const maxSpeed = running ? 11.4 : 6.4;
            const sinY = Math.sin(pk.camYaw);
            const cosY = Math.cos(pk.camYaw);
            targetVx = (-sinY * nf + cosY * nr) * maxSpeed;
            targetVz = (-cosY * nf - sinY * nr) * maxSpeed;
          }

          // Smooth acceleration & deceleration
          const accelLambda = mag > 0.05 ? 14 : 11;
          pk.vx = THREE.MathUtils.damp(pk.vx, targetVx, accelLambda, rawDelta);
          pk.vz = THREE.MathUtils.damp(pk.vz, targetVz, accelLambda, rawDelta);

          const moveSpeed = Math.hypot(pk.vx, pk.vz);
          if (moveSpeed > 0.15) {
            const dx = pk.vx * rawDelta;
            const dz = pk.vz * rawDelta;
            const cols = world?.colliders ?? [];
            const boundsR = world?.boundsRadius ?? 24;
            const playerRadius = 0.55;

            if (!hitsCollider(pk.x + dx, pk.z, playerRadius, cols, boundsR)) {
              pk.x += dx;
            } else {
              pk.vx = 0;
            }
            if (!hitsCollider(pk.x, pk.z + dz, playerRadius, cols, boundsR)) {
              pk.z += dz;
            } else {
              pk.vz = 0;
            }

            if (mag > 0.05) {
              const targetYaw = Math.atan2(targetVx, targetVz);
              let diff = targetYaw - pk.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              pk.yaw += diff * Math.min(1, rawDelta * 12);
            }

            if (pk.grounded && moveSpeed > 0.8) {
              animState = moveSpeed > 8.2 ? 'run' : 'walk';
              soundEngine.playFootstep(moveSpeed > 8.2);
            }
          }

          // Vertical jump + explicit landing recovery
          if (!pk.grounded || pk.vy !== 0) {
            pk.vy -= 22.0 * rawDelta;
            pk.y += pk.vy * rawDelta;
            if (pk.y <= 0) {
              pk.y = 0;
              pk.vy = 0;
              pk.grounded = true;
              pk.landingTimer = 0.18;
              soundEngine.playLand();
            } else {
              animState = 'jump';
            }
          } else if (pk.landingTimer > 0) {
            pk.landingTimer = Math.max(0, pk.landingTimer - rawDelta);
            animState = 'landing';
          }

          if (pk.interactTimer > 0) {
            pk.interactTimer = Math.max(0, pk.interactTimer - rawDelta);
            animState = 'interact';
          }

          if (p.grandVictoryActive) {
            animState = 'victory';
            roboMood = 'teruja';
          }

          heroHolder.position.set(pk.x, pk.y, pk.z);
          heroHolder.rotation.y = pk.yaw;
          playerShadow.position.y = 0.03 - pk.y;
          playerShadow.scale.setScalar(Math.max(0.55, 1 - pk.y * 0.15));

          // ROBO floats gently beside player's right shoulder
          const roboTargetX = pk.x + Math.cos(pk.yaw) * 1.05 - Math.sin(pk.yaw) * 0.45;
          const roboTargetZ = pk.z - Math.sin(pk.yaw) * 1.05 - Math.cos(pk.yaw) * 0.45;
          robo.root.position.x = THREE.MathUtils.lerp(robo.root.position.x, roboTargetX, 0.1);
          robo.root.position.z = THREE.MathUtils.lerp(robo.root.position.z, roboTargetZ, 0.1);
          robo.root.position.y = pk.y + 1.54;
          robo.root.rotation.y = pk.yaw;

          // 3D Particle Burst Celebration Animation
          if (burstTriggerRef.current > 0) {
            burstTriggerRef.current = 0;
            burstAge = 0;
            burstGroup.visible = true;
            burstGroup.position.set(pk.x, pk.y, pk.z);
            sparks.forEach((sp, idx) => {
              const ang = (idx / sparks.length) * Math.PI * 2 + Math.random() * 0.4;
              const spd = 1.6 + Math.random() * 2.2;
              sp.vx = Math.cos(ang) * spd;
              sp.vz = Math.sin(ang) * spd;
              sp.vy = 2.4 + Math.random() * 2.4;
              sp.mesh.position.set(0, 0.8, 0);
              sp.mesh.scale.setScalar(1);
            });
          }
          if (burstAge >= 0) {
            burstAge += rawDelta;
            const t = burstAge / 1.15;
            if (t >= 1) {
              burstAge = -1;
              burstGroup.visible = false;
            } else {
              burstRing.scale.setScalar(1 + t * 4.2);
              burstRingMat.opacity = (1 - t) * 0.85;
              sparks.forEach((sp) => {
                sp.vy -= 4.5 * rawDelta;
                sp.mesh.position.x += sp.vx * rawDelta;
                sp.mesh.position.y += sp.vy * rawDelta;
                sp.mesh.position.z += sp.vz * rawDelta;
                sp.mesh.rotation.y += rawDelta * 6;
                sp.mesh.scale.setScalar(Math.max(0.01, 1 - t));
              });
            }
          }

          // Third-person camera orbit (or panoramic orbit during Grand Victory)
          if (p.grandVictoryActive) {
            const gvYaw = elapsed * 0.45;
            tmpCamTarget.set(
              pk.x + Math.sin(gvYaw) * 6.8,
              3.1 + Math.sin(elapsed * 0.7) * 0.5,
              pk.z + Math.cos(gvYaw) * 6.8
            );
            tmpLookTarget.set(pk.x, 1.8, pk.z - 2.0);
          } else {
            const camDist = pk.camDistance;
            const horizDist = Math.cos(pk.camPitch) * camDist;
            const vertHeight = 1.65 + Math.sin(pk.camPitch) * camDist;
            let idealCamX = pk.x + Math.sin(pk.camYaw) * horizDist;
            let idealCamZ = pk.z + Math.cos(pk.camYaw) * horizDist;
            const boundsClamp = (world?.boundsRadius ?? 22) + 2.5;
            const camR = Math.hypot(idealCamX, idealCamZ);
            if (camR > boundsClamp) {
              const factor = boundsClamp / camR;
              idealCamX *= factor;
              idealCamZ *= factor;
            }
            if (world && hitsCollider(idealCamX, idealCamZ, 0.45, world.colliders, boundsClamp)) {
              idealCamX = THREE.MathUtils.lerp(pk.x, idealCamX, 0.55);
              idealCamZ = THREE.MathUtils.lerp(pk.z, idealCamZ, 0.55);
            }

            tmpCamTarget.set(idealCamX, Math.max(1.15, pk.y + vertHeight), idealCamZ);
            tmpLookTarget.set(pk.x, pk.y + 1.38, pk.z);
          }

          camera.position.lerp(tmpCamTarget, Math.min(1, rawDelta * 10));
          camera.lookAt(tmpLookTarget);

          // Find nearest interactable (challenges OR world travel portals — zero padlocks!)
          let nearest: WorldInteractable | null = null;
          let nearestDist = 3.8;
          const list = world?.interactables ?? [];
          for (const item of list) {
            const dist = Math.hypot(pk.x - item.position.x, pk.z - item.position.z);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = item;
            }
          }

          if (mob.interactQueued) {
            mob.interactQueued = false;
            if (nearest && !p.controlsPaused && !p.grandVictoryActive) {
              pk.interactTimer = 0.55;
              if (nearest.kind === 'world_portal' && nearest.targetWorldId) {
                soundEngine.playPortalWhoosh();
                p.onSwitchWorld?.(nearest.targetWorldId);
              } else {
                soundEngine.playInteract();
                p.onTriggerInteractable?.(nearest);
              }
            }
          }

          // Throttled HUD & position save
          if (elapsed - pk.lastHudTime > 0.1 || (nearest?.id ?? '') !== pk.lastInteractId) {
            pk.lastHudTime = elapsed;
            pk.lastInteractId = nearest?.id ?? '';
            p.onHudUpdate?.({
              x: pk.x,
              z: pk.z,
              yaw: pk.yaw,
              worldId: p.activeWorldId,
              nearestInteractable: nearest,
              worldInteractables: list,
              worldLoading: worldLoadingRef.current,
              camDistance: pk.camDistance,
            });
          }

          if (elapsed - pk.lastSavedTime > 5 && moveSpeed > 0.2) {
            pk.lastSavedTime = elapsed;
            const worldMeta = MISSIONS_CATALOG.find((m) => m.id === p.activeWorldId);
            p.onSavePosition?.({
              zone: worldMeta?.zoneId ?? 'zon_bandar',
              x: pk.x,
              y: 0,
              z: pk.z,
              yaw: pk.yaw,
            });
          }
        }
      }

      if (activeHeroRef.current && heroHolder.visible) {
        updateHeroAnimation(activeHeroRef.current, animState, elapsed, rawDelta);
      }
      if (robo.root.visible) {
        robo.setMood(roboMood);
        animateRoboRig(robo, elapsed);
      }

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        window.setTimeout(() => {
          if (alive) rafId = window.requestAnimationFrame(tick);
        }, 16);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      alive = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (teleportRef.current.pendingWorld) {
        disposeObject3D(teleportRef.current.pendingWorld.root);
        teleportRef.current.pendingWorld = null;
      }
      if (activeMissionWorldRef.current) {
        disposeObject3D(activeMissionWorldRef.current.root);
        activeMissionWorldRef.current = null;
      }
      quantumVfx.dispose();
      disposeObject3D(openingCityData.cityGroup);
      composer?.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [simplified3d, mobileInputRef]);

  return (
    <div
      ref={containerRef}
      aria-label="Dunia 3D WORDOPIA: THE LOST SIGNAL"
      className="fixed inset-0 z-0 h-full w-full touch-none select-none"
    />
  );
};

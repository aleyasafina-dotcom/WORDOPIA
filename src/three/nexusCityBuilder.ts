import * as THREE from 'three';
import {
  CITY_ZONES,
  MISSION_1_CLUES,
  MISSION_2_TASKS,
  MISSION_3_SCENARIOS,
} from '../data/missions.ts';
import type { CityZoneId, MissionProgressItem, WorldInteractable } from '../types/game.ts';
import { buildProceduralHeroRig } from './humanCharacterBuilder.ts';

export interface CityCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  requiredMissionId?: number;
}

export interface NexusCitySceneData {
  cityGroup: THREE.Group;
  colliders: CityCollider[];
  interactables: WorldInteractable[];
  animateCity: (
    elapsed: number,
    delta: number,
    missions: MissionProgressItem[] | undefined,
    completedChallenges: Record<string, string[]> | undefined,
    isDutaBahasa: boolean
  ) => void;
}

function createBillboardTexture(title: string, subtitle: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#091429';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 236);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(244,248,255,0.04)';
  for (let y = 18; y < 240; y += 12) {
    ctx.fillRect(16, y, 480, 3);
  }

  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 108);

  ctx.fillStyle = '#F4F8FF';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 256, 162);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121C33';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.14)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Glowing cyan lane grid
  ctx.strokeStyle = 'rgba(0, 200, 240, 0.16)';
  ctx.lineWidth = 2;
  for (let g = 0; g <= 512; g += 64) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(512, g);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWindowFacadeTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14203B';
  ctx.fillRect(0, 0, 256, 512);

  for (let y = 16; y < 496; y += 26) {
    for (let x = 14; x < 242; x += 28) {
      const lit = (x * 7 + y * 13) % 5 !== 0;
      ctx.fillStyle = lit ? accentHex : '#0D172D';
      ctx.globalAlpha = lit ? 0.55 + ((x + y) % 3) * 0.12 : 0.85;
      ctx.fillRect(x, y, 16, 14);
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function getZoneAtPosition(x: number, z: number): CityZoneId {
  let closestZone: CityZoneId = 'zon_bandar';
  let minDist = Infinity;
  for (const zone of CITY_ZONES) {
    const dx = x - zone.center.x;
    const dz = z - zone.center.z;
    const d = Math.hypot(dx, dz);
    if (d < zone.radius) return zone.id;
    if (d < minDist) {
      minDist = d;
      closestZone = zone.id;
    }
  }
  return closestZone;
}

export function buildNexusCity(simplified3d = false): NexusCitySceneData {
  const cityGroup = new THREE.Group();
  const colliders: CityCollider[] = [];
  const interactables: WorldInteractable[] = [];

  const roadTex = createRoadTexture();
  const groundMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.42,
    metalness: 0.25,
  });

  // Main continuous city floor (140 x 140)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(148, 148), groundMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  cityGroup.add(floor);

  // Outer perimeter containment walls so player stays inside playable NEXUS CITY
  const halfBound = 62;
  colliders.push(
    { id: 'bound-north', minX: -70, maxX: 70, minZ: -70, maxZ: -halfBound },
    { id: 'bound-south', minX: -70, maxX: 70, minZ: halfBound, maxZ: 70 },
    { id: 'bound-west', minX: -70, maxX: -halfBound, minZ: -70, maxZ: 70 },
    { id: 'bound-east', minX: halfBound, maxX: 70, minZ: -70, maxZ: 70 }
  );

  // Illuminated Avenue Strips connecting all 5 zones
  const roadGlowMat = new THREE.MeshStandardMaterial({
    color: '#0B162C',
    roughness: 0.35,
    metalness: 0.3,
  });
  const laneCyanMat = new THREE.MeshStandardMaterial({
    color: '#0284C7',
    emissive: '#00C8F0',
    emissiveIntensity: 0.18,
    roughness: 0.45,
  });

  // North-South Central Spine Road (Zon Bandar <-> Menara Utama)
  const nsRoad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 92), roadGlowMat);
  nsRoad.position.set(0, 0.025, -4);
  nsRoad.receiveShadow = true;
  cityGroup.add(nsRoad);

  const nsLineL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 90), laneCyanMat);
  nsLineL.position.set(-4.6, 0.03, -4);
  cityGroup.add(nsLineL);
  const nsLineR = nsLineL.clone();
  nsLineR.position.x = 4.6;
  cityGroup.add(nsLineR);

  // East-West Cross Avenue (Pusat Data <-> Stesen Komunikasi)
  const ewRoad = new THREE.Mesh(new THREE.BoxGeometry(92, 0.05, 10), roadGlowMat);
  ewRoad.position.set(0, 0.025, 4);
  ewRoad.receiveShadow = true;
  cityGroup.add(ewRoad);

  const ewLineN = new THREE.Mesh(new THREE.BoxGeometry(90, 0.06, 0.18), laneCyanMat);
  ewLineN.position.set(0, 0.03, -0.6);
  cityGroup.add(ewLineN);
  const ewLineS = ewLineN.clone();
  ewLineS.position.z = 8.6;
  cityGroup.add(ewLineS);

  // North-West Connector (Pusat Data / Spine -> Pusat Media)
  const nwRoad = new THREE.Mesh(new THREE.BoxGeometry(40, 0.05, 8), roadGlowMat);
  nwRoad.position.set(-18, 0.025, -36);
  nwRoad.receiveShadow = true;
  cityGroup.add(nwRoad);

  // Zone Plaza Pads
  CITY_ZONES.forEach((z) => {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14.5, 0.08, 32),
      new THREE.MeshStandardMaterial({
        color: '#132140',
        roughness: 0.4,
        metalness: 0.3,
      })
    );
    pad.position.set(z.center.x, 0.04, z.center.z);
    pad.receiveShadow = true;
    cityGroup.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(13.2, 13.8, 40),
      new THREE.MeshStandardMaterial({
        color: z.accentColor,
        emissive: z.accentColor,
        emissiveIntensity: 0.16,
        roughness: 0.45,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(z.center.x, 0.09, z.center.z);
    cityGroup.add(ring);
  });

  // Helper to place solid skyscraper buildings with AABB collision
  const facadeTexCyan = createWindowFacadeTexture('#00C8F0');
  const facadeTexPurple = createWindowFacadeTexture('#7B61FF');
  const facadeTexAmber = createWindowFacadeTexture('#FFB547');

  const addBuilding = (
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    accent: string,
    tex: THREE.CanvasTexture,
    hasCollider = true
  ) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      metalness: 0.35,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = !simplified3d;
    body.receiveShadow = true;
    bGroup.add(body);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.3,
        roughness: 0.38,
      })
    );
    trim.position.y = h - 0.5;
    bGroup.add(trim);

    cityGroup.add(bGroup);

    if (hasCollider) {
      colliders.push({
        id,
        minX: x - w / 2 - 0.5,
        maxX: x + w / 2 + 0.5,
        minZ: z - d / 2 - 0.5,
        maxZ: z + d / 2 + 0.5,
      });
    }
  };

  // Urban Skyscrapers around Zon Bandar & City Blocks
  addBuilding('bld-1', -18, 22, 8, 22, 8, '#00C8F0', facadeTexCyan);
  addBuilding('bld-2', 18, 22, 8, 26, 8, '#7B61FF', facadeTexPurple);
  addBuilding('bld-3', -20, 44, 9, 18, 9, '#00C8F0', facadeTexCyan);
  addBuilding('bld-4', 20, 44, 9, 20, 9, '#FFB547', facadeTexAmber);
  addBuilding('bld-5', -18, -12, 8, 24, 8, '#A5F05A', facadeTexCyan);
  addBuilding('bld-6', 18, -12, 8, 24, 8, '#FFB547', facadeTexAmber);
  addBuilding('bld-7', 34, -30, 11, 28, 11, '#7B61FF', facadeTexPurple);
  addBuilding('bld-8', 48, -18, 10, 22, 10, '#00C8F0', facadeTexCyan);
  addBuilding('bld-9', -52, 24, 9, 25, 10, '#7B61FF', facadeTexPurple);
  addBuilding('bld-10', 52, 24, 9, 25, 10, '#FFB547', facadeTexAmber);
  addBuilding('bld-11', -52, -16, 10, 21, 10, '#A5F05A', facadeTexCyan);

  // Outer skyline backdrop buildings (outside collision perimeter for rich AAA horizon)
  const skylineSpecs = [
    [-75, -75, 16, 48, 16, '#00C8F0'],
    [75, -75, 16, 52, 16, '#7B61FF'],
    [-75, 75, 16, 40, 16, '#7B61FF'],
    [75, 75, 16, 42, 16, '#FFB547'],
    [-76, 0, 14, 38, 20, '#A5F05A'],
    [76, 0, 14, 38, 20, '#FFB547'],
    [0, -82, 24, 44, 14, '#00C8F0'],
  ] as const;
  skylineSpecs.forEach(([x, z, w, h, d, col], idx) => {
    addBuilding(`sky-${idx}`, x, z, w, h, d, col, facadeTexPurple, false);
  });

  // Illuminated Billboards in Zon Bandar
  const billboardScreens: THREE.Mesh[] = [];
  const addBillboard = (x: number, y: number, z: number, rotY: number, title: string, sub: string, accent: string) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, y, 8),
      new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.7, roughness: 0.3 })
    );
    pole.position.y = -y / 2;
    group.add(pole);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 3.8, 0.3),
      new THREE.MeshStandardMaterial({ color: '#0F172A', metalness: 0.6, roughness: 0.4 })
    );
    group.add(frame);

    const tex = createBillboardTexture(title, sub, accent);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 3.4),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    screen.position.z = 0.17;
    group.add(screen);
    billboardScreens.push(screen);
    cityGroup.add(group);
  };

  addBillboard(-10, 6.2, 19, 0.35, 'AMARAN ISYARAT', 'Jejak Petunjuk di Zon Bandar', '#00C8F0');
  addBillboard(10, 6.2, 19, -0.35, 'WORDOPIA NEXUS', 'Pulihkan Ayat Aktif & Pasif', '#FFB547');
  addBillboard(-14, 6.5, -26, 0.45, 'PUSAT MEDIA', 'Bina Skrip Duta Bahasa', '#7B61FF');

  // Zone-specific architectural landmarks
  // 1. Pusat Data Server Racks (visual glow columns around (-38, 4))
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rx = -38 + Math.cos(angle) * 10;
    const rz = 4 + Math.sin(angle) * 10;
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 5.4, 1.2),
      new THREE.MeshStandardMaterial({ color: '#0F172A', metalness: 0.7, roughness: 0.25 })
    );
    rack.position.set(rx, 2.7, rz);
    rack.castShadow = true;
    cityGroup.add(rack);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 4.6, 1.26),
      new THREE.MeshStandardMaterial({
        color: '#A5F05A',
        emissive: '#A5F05A',
        emissiveIntensity: 0.32,
        roughness: 0.35,
      })
    );
    led.position.set(rx, 2.7, rz);
    cityGroup.add(led);
  }

  // 2. Stesen Komunikasi Parabolic Dish Arrays at (38, 4)
  for (let i = 0; i < 2; i++) {
    const dx = i === 0 ? 45 : 31;
    const dz = i === 0 ? -5 : -6;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.4, 7, 10),
      new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.3 })
    );
    mast.position.set(dx, 3.5, dz);
    cityGroup.add(mast);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({
        color: '#94A3B8',
        metalness: 0.5,
        roughness: 0.38,
        side: THREE.DoubleSide,
      })
    );
    dish.position.set(dx, 7.2, dz);
    dish.rotation.x = Math.PI * 0.7;
    cityGroup.add(dish);
  }

  // 3. Menara Utama NEXUS Spire at (0, -48)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(0, 0, -48);
  cityGroup.add(towerGroup);

  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 5.8, 6, 8),
    new THREE.MeshStandardMaterial({ color: '#14203B', metalness: 0.65, roughness: 0.35 })
  );
  towerBase.position.y = 3;
  towerBase.castShadow = true;
  towerGroup.add(towerBase);

  const towerShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 3.6, 30, 8),
    new THREE.MeshStandardMaterial({ color: '#0F1A32', metalness: 0.72, roughness: 0.28 })
  );
  towerShaft.position.y = 20;
  towerShaft.castShadow = true;
  towerGroup.add(towerShaft);

  const towerCoreMat = new THREE.MeshStandardMaterial({
    color: '#FFB547',
    emissive: '#FFB547',
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const towerCoreRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.25, 10, 32), towerCoreMat);
  towerCoreRing.rotation.x = Math.PI / 2;
  towerCoreRing.position.y = 14;
  towerGroup.add(towerCoreRing);

  const towerBeamMat = new THREE.MeshBasicMaterial({
    color: '#00C8F0',
    transparent: true,
    opacity: 0.15,
  });
  const towerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.8, 45, 14), towerBeamMat);
  towerBeam.position.y = 44;
  towerGroup.add(towerBeam);

  colliders.push({
    id: 'tower-base',
    minX: -5.2,
    maxX: 5.2,
    minZ: -53.2,
    maxZ: -42.8,
  });

  // Zone Energy Gates (block locked missions until previous mission is solved!)
  interface GateEntry {
    missionId: number;
    mat: THREE.MeshBasicMaterial;
    group: THREE.Group;
  }
  const gates: GateEntry[] = [];
  const createGate = (
    missionId: number,
    x: number,
    z: number,
    rotY: number,
    w: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const pillarGeo = new THREE.BoxGeometry(0.65, 5.5, 0.65);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.7, roughness: 0.3 });
    const leftP = new THREE.Mesh(pillarGeo, pillarMat);
    leftP.position.set(-w / 2, 2.75, 0);
    const rightP = leftP.clone();
    rightP.position.x = w / 2;
    group.add(leftP, rightP);

    const mat = new THREE.MeshBasicMaterial({
      color: '#FFB547',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    const shield = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, 5.0), mat);
    shield.position.y = 2.6;
    group.add(shield);

    cityGroup.add(group);
    gates.push({ missionId, mat, group });
    colliders.push({
      id: `gate-m${missionId}`,
      minX,
      maxX,
      minZ,
      maxZ,
      requiredMissionId: missionId,
    });
  };

  // Gate 2 blocks West Avenue into Pusat Data at x = -22
  createGate(2, -22, 4, Math.PI / 2, 10, -22.8, -21.2, -1, 9);
  // Gate 3 blocks East Avenue into Stesen Komunikasi at x = 22
  createGate(3, 22, 4, Math.PI / 2, 10, 21.2, 22.8, -1, 9);
  // Gate 4 blocks NW path into Pusat Media at x = -18, z = -36
  createGate(4, -18, -36, Math.PI / 2, 9, -18.8, -17.2, -41, -31);
  // Gate 5 blocks North Avenue into Menara Utama at z = -22
  createGate(5, 0, -22, 0, 10, -5, 5, -22.8, -21.2);

  // Build Interactive World Terminals & NPCs (Strictly max 3 challenges for M1, M2, M3)
  interface NodeVisual {
    interactable: WorldInteractable;
    orb: THREE.Mesh;
    ring: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
  }
  const nodeVisuals: NodeVisual[] = [];

  const addTerminalNode = (item: WorldInteractable, accentHex: string) => {
    interactables.push(item);
    const g = new THREE.Group();
    g.position.set(item.position.x, 0, item.position.z);

    if (item.kind === 'npc') {
      const npcHeroId = item.id === 'm3-1' ? 'nara' : item.id === 'm3-2' ? 'zayan' : 'mika';
      const npcRig = buildProceduralHeroRig(npcHeroId);
      npcRig.root.position.set(0, 0, -0.5);
      g.add(npcRig.root);
    } else {
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.85, 1.35, 10),
        new THREE.MeshStandardMaterial({ color: '#132140', metalness: 0.65, roughness: 0.3 })
      );
      pedestal.position.y = 0.675;
      pedestal.castShadow = true;
      g.add(pedestal);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat);
    orb.position.y = item.kind === 'npc' ? 2.45 : 2.05;
    g.add(orb);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.32, 24),
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.2,
        roughness: 0.45,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);

    cityGroup.add(g);
    nodeVisuals.push({ interactable: item, orb, ring, mat });
  };

  // Mission 01: 3 Clue Terminals in Zon Bandar
  const m1Coords = [
    { x: -7, z: 36 },
    { x: 9, z: 31 },
    { x: -1, z: 22 },
  ];
  MISSION_1_CLUES.slice(0, 3).forEach((clue, idx) => {
    addTerminalNode(
      {
        id: clue.id,
        missionId: 1,
        zoneId: 'zon_bandar',
        kind: 'clue',
        label: clue.zoneLabel,
        subtitle: `Petunjuk Misi 01 (${idx + 1}/3)`,
        position: { x: m1Coords[idx].x, y: 0, z: m1Coords[idx].z },
        challengeId: clue.id,
      },
      '#00C8F0'
    );
  });

  // Mission 02: 3 Repair Terminals in Pusat Data
  const m2Coords = [
    { x: -34, z: 10 },
    { x: -44, z: 4 },
    { x: -34, z: -4 },
  ];
  MISSION_2_TASKS.slice(0, 3).forEach((task, idx) => {
    addTerminalNode(
      {
        id: task.id,
        missionId: 2,
        zoneId: 'pusat_data',
        kind: 'terminal',
        label: task.terminalName,
        subtitle: `Pembaikan Sistem Misi 02 (${idx + 1}/3)`,
        position: { x: m2Coords[idx].x, y: 0, z: m2Coords[idx].z },
        challengeId: task.id,
      },
      '#A5F05A'
    );
  });

  // Mission 03: 3 NPCs in Stesen Komunikasi
  const m3Coords = [
    { x: 34, z: 10 },
    { x: 44, z: 4 },
    { x: 35, z: -4 },
  ];
  MISSION_3_SCENARIOS.slice(0, 3).forEach((sc) => {
    addTerminalNode(
      {
        id: sc.id,
        missionId: 3,
        zoneId: 'stesen_komunikasi',
        kind: 'npc',
        label: `${sc.characterName} · ${sc.stationName}`,
        subtitle: sc.characterRole,
        position: { x: m3Coords[MISSION_3_SCENARIOS.indexOf(sc)].x, y: 0, z: m3Coords[MISSION_3_SCENARIOS.indexOf(sc)].z },
        challengeId: sc.id,
      },
      '#FFB547'
    );
  });

  // Mission 04: Script Terminal in Pusat Media
  addTerminalNode(
    {
      id: 'm4-terminal',
      missionId: 4,
      zoneId: 'pusat_media',
      kind: 'studio_terminal',
      label: 'Konsol Penulisan Mesej Rahsia',
      subtitle: 'Operasi 04 · Pusat Media Digital',
      position: { x: -34, y: 0, z: -36 },
      challengeId: 'm4-terminal',
    },
    '#7B61FF'
  );

  // Mission 05: Tower Core in Menara Utama
  addTerminalNode(
    {
      id: 'm5-core',
      missionId: 5,
      zoneId: 'menara_utama',
      kind: 'tower_core',
      label: 'Teras Pemulihan Menara Utama',
      subtitle: 'Operasi 05 · Pancar Video Duta Bahasa',
      position: { x: 0, y: 0, z: -39 },
      challengeId: 'm5-core',
    },
    '#FFB547'
  );

  // Cruising futuristic sky-transports above NEXUS CITY
  const drones: { mesh: THREE.Group; radius: number; speed: number; y: number; offset: number }[] = [];
  if (!simplified3d) {
    for (let i = 0; i < 6; i++) {
      const dg = new THREE.Group();
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.7, 1.1),
        new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.8, roughness: 0.2 })
      );
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.25, 1.25),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#00C8F0' : '#FFB547' })
      );
      dg.add(hull, glow);
      cityGroup.add(dg);
      drones.push({
        mesh: dg,
        radius: 26 + i * 7,
        speed: 0.16 + (i % 3) * 0.06,
        y: 16 + (i % 3) * 5,
        offset: i * 1.1,
      });
    }
  }

  // Atmospheric floating data/rain particles
  let particlePoints: THREE.Points | null = null;
  if (!simplified3d) {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlePoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: '#00C8F0',
        size: 0.22,
        transparent: true,
        opacity: 0.45,
      })
    );
    cityGroup.add(particlePoints);
  }

  const animateCity = (
    elapsed: number,
    _delta: number,
    missions: MissionProgressItem[] | undefined,
    completedChallenges: Record<string, string[]> | undefined,
    isDutaBahasa: boolean
  ) => {
    const statusMap = new Map((missions ?? []).map((m) => [m.missionId, m.status]));

    // Update sky drones
    for (const d of drones) {
      const a = elapsed * d.speed + d.offset;
      d.mesh.position.set(Math.cos(a) * d.radius, d.y + Math.sin(elapsed * 2 + d.offset) * 0.5, Math.sin(a) * d.radius);
      d.mesh.rotation.y = -a;
    }

    // Update particles gently falling
    if (particlePoints) {
      particlePoints.rotation.y = elapsed * 0.015;
    }

    // Update zone energy gates
    for (const gate of gates) {
      const st = statusMap.get(gate.missionId) ?? 'belum_dibuka';
      const unlocked = st !== 'belum_dibuka';
      gate.group.children[2].visible = !unlocked;
      gate.mat.opacity = unlocked ? 0 : 0.36 + Math.sin(elapsed * 4) * 0.1;
    }

    // Update interactable node orbs
    for (const nv of nodeVisuals) {
      const mKey = String(nv.interactable.missionId);
      const solvedList = completedChallenges?.[mKey] ?? [];
      const missionDone = statusMap.get(nv.interactable.missionId) === 'selesai';
      const isSolved =
        missionDone ||
        (nv.interactable.challengeId ? solvedList.includes(nv.interactable.challengeId) : false);

      nv.orb.rotation.y = elapsed * 1.8;
      nv.orb.position.y = (nv.interactable.kind === 'npc' ? 2.45 : 2.05) + Math.sin(elapsed * 3) * 0.12;
      if (isSolved) {
        nv.mat.color.set('#A5F05A');
        nv.mat.emissive.set('#A5F05A');
        const ringMat = nv.ring.material as THREE.MeshStandardMaterial;
        ringMat.color.set('#A5F05A');
        ringMat.emissive.set('#A5F05A');
      }
    }

    // Update Menara Utama core beacon
    const m5Done = statusMap.get(5) === 'selesai';
    if (isDutaBahasa || m5Done) {
      towerCoreMat.color.set('#00C8F0');
      towerCoreMat.emissive.set('#00C8F0');
      towerBeamMat.color.set('#A5F05A');
      towerBeamMat.opacity = 0.35 + Math.sin(elapsed * 3) * 0.1;
    } else {
      const flicker = Math.sin(elapsed * 9) > 0.2 ? 0.9 : 0.35;
      towerCoreMat.color.set('#FFB547');
      towerCoreMat.emissive.set('#FFB547');
      towerCoreMat.emissiveIntensity = flicker;
      towerBeamMat.color.set('#FFB547');
      towerBeamMat.opacity = 0.08;
    }
    towerCoreRing.rotation.z = elapsed * 0.8;
  };

  return { cityGroup, colliders, interactables, animateCity };
}

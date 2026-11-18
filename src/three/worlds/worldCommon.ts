import * as THREE from 'three';
import type {
  MissionProgressItem,
  MissionWorldId,
  WorldInteractable,
} from '../../types/game.ts';
import { buildProceduralHeroRig } from '../humanCharacterBuilder.ts';

export interface WorldCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MissionWorldInstance {
  worldId: MissionWorldId;
  root: THREE.Group;
  colliders: WorldCollider[];
  interactables: WorldInteractable[];
  boundsRadius: number;
  spawnPoint: { x: number; z: number; yaw: number };
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  dirIntensity?: number;
  exposure?: number;
  animateWorld: (
    elapsed: number,
    delta: number,
    missions: MissionProgressItem[] | undefined,
    completedChallenges: Record<string, string[]> | undefined,
    isDutaBahasa: boolean
  ) => void;
}

export interface NodeVisualEntry {
  interactable: WorldInteractable;
  orb: THREE.Mesh;
  ring: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => disposeMaterial(m));
    } else if (mat) {
      disposeMaterial(mat);
    }
  });
}

function disposeMaterial(mat: THREE.Material): void {
  const std = mat as THREE.MeshStandardMaterial;
  std.map?.dispose();
  std.emissiveMap?.dispose();
  std.roughnessMap?.dispose();
  std.normalMap?.dispose();
  mat.dispose();
}

export function createBrightGridFloorTexture(
  baseColor: string,
  gridColor: string,
  repeat = 14
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = gridColor;
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

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  for (let g = 32; g < 512; g += 64) {
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
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHoloSignTexture(
  title: string,
  subtitle: string,
  accent: string,
  bg = '#0E2144'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 488, 232);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 24; y < 235; y += 16) {
    ctx.fillRect(20, y, 472, 3);
  }

  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 108);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 256, 162);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWindowFacadeTexture(
  wallColor: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, 256, 512);

  for (let y = 16; y < 496; y += 26) {
    for (let x = 14; x < 242; x += 28) {
      const lit = (x * 7 + y * 13) % 5 !== 0;
      ctx.fillStyle = lit ? accentHex : '#1A2D54';
      ctx.globalAlpha = lit ? 0.72 + ((x + y) % 3) * 0.1 : 0.85;
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

export function addInteractableNode(
  root: THREE.Group,
  interactables: WorldInteractable[],
  nodeVisuals: NodeVisualEntry[],
  item: WorldInteractable,
  accentHex: string
): THREE.Group {
  interactables.push(item);
  const g = new THREE.Group();
  g.position.set(item.position.x, 0, item.position.z);

  if (item.kind === 'npc') {
    const npcHeroId = item.id === 'm3-1' ? 'nara' : item.id === 'm3-2' ? 'zayan' : 'mika';
    const npcRig = buildProceduralHeroRig(npcHeroId);
    npcRig.root.position.set(0, 0, -0.45);
    g.add(npcRig.root);
  } else {
    const baseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.15, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.5, roughness: 0.3 })
    );
    baseRing.position.y = 0.07;
    baseRing.receiveShadow = true;
    g.add(baseRing);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.78, 1.35, 12),
      new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.42, roughness: 0.42 })
    );
    pedestal.position.y = 0.75;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    g.add(pedestal);

    const screenCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.14, 14),
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.35,
        roughness: 0.35,
      })
    );
    screenCollar.position.y = 1.38;
    g.add(screenCollar);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), mat);
  orb.position.y = item.kind === 'npc' ? 2.45 : 2.12;
  g.add(orb);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.12, 1.34, 28),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.22,
      roughness: 0.45,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(ring);

  root.add(g);
  nodeVisuals.push({ interactable: item, orb, ring, mat });
  return g;
}

/**
 * Adds a bright holographic World Travel Portal gate (no padlocks) so players
 * can travel between the 5 mission worlds directly inside the 3D scene too.
 */
export function addWorldTravelPortal(
  root: THREE.Group,
  interactables: WorldInteractable[],
  x: number,
  z: number,
  targetWorldId: MissionWorldId,
  targetWorldName: string,
  accentHex: string
): THREE.Mesh {
  const portalGroup = new THREE.Group();
  portalGroup.position.set(x, 0, z);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.4, 0.22, 24),
    new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.5, roughness: 0.35 })
  );
  plinth.position.y = 0.11;
  plinth.receiveShadow = true;
  portalGroup.add(plinth);

  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.16, 12, 32, Math.PI),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.55,
      roughness: 0.28,
    })
  );
  arch.position.y = 1.9;
  portalGroup.add(arch);

  const veil = new THREE.Mesh(
    new THREE.CircleGeometry(1.62, 28),
    new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    })
  );
  veil.position.y = 1.9;
  portalGroup.add(veil);

  const signTex = createHoloSignTexture(`PORTAL MISI 0${targetWorldId}`, targetWorldName, accentHex, '#0F254A');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 1.05),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 4.15, 0);
  portalGroup.add(sign);

  root.add(portalGroup);

  interactables.push({
    id: `portal-world-${targetWorldId}`,
    missionId: targetWorldId,
    zoneId: 'zon_bandar',
    kind: 'world_portal',
    label: `Portal ke ${targetWorldName}`,
    subtitle: `Terokai Dunia Misi 0${targetWorldId}`,
    position: { x, y: 0, z },
    targetWorldId,
  });

  return veil;
}

export function animateNodeVisuals(
  nodeVisuals: NodeVisualEntry[],
  elapsed: number,
  missions: MissionProgressItem[] | undefined,
  completedChallenges: Record<string, string[]> | undefined
): void {
  const statusMap = new Map((missions ?? []).map((m) => [m.missionId, m.status]));
  for (const nv of nodeVisuals) {
    const mKey = String(nv.interactable.missionId);
    const solvedList = completedChallenges?.[mKey] ?? [];
    const missionDone = statusMap.get(nv.interactable.missionId) === 'selesai';
    const isSolved =
      missionDone ||
      (nv.interactable.challengeId ? solvedList.includes(nv.interactable.challengeId) : false);

    nv.orb.rotation.y = elapsed * 1.9;
    nv.orb.position.y = (nv.interactable.kind === 'npc' ? 2.45 : 2.12) + Math.sin(elapsed * 3) * 0.12;
    if (isSolved) {
      nv.mat.color.set('#A5F05A');
      nv.mat.emissive.set('#A5F05A');
      const ringMat = nv.ring.material as THREE.MeshStandardMaterial;
      ringMat.color.set('#A5F05A');
      ringMat.emissive.set('#A5F05A');
    }
  }
}

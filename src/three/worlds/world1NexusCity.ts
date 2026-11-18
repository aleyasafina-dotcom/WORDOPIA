import * as THREE from 'three';
import { MISSION_1_CLUES } from '../../data/missions.ts';
import type { MissionProgressItem, WorldInteractable } from '../../types/game.ts';
import {
  addInteractableNode,
  addWorldTravelPortal,
  animateNodeVisuals,
  createBrightGridFloorTexture,
  createHoloSignTexture,
  createWindowFacadeTexture,
  type MissionWorldInstance,
  type NodeVisualEntry,
  type WorldCollider,
} from './worldCommon.ts';

/**
 * MISSION 01 WORLD: KOTA NEXUS (Detektif Ayat)
 * Bright futuristic metropolitan skyline with damaged digital billboards,
 * holographic street ads, sky vehicles, and 3 corrupted signal devices.
 */
export function buildWorld1NexusCity(simplified3d = false): MissionWorldInstance {
  const root = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const interactables: WorldInteractable[] = [];
  const nodeVisuals: NodeVisualEntry[] = [];

  // Bright futuristic cyan-blue floor grid
  const floorTex = createBrightGridFloorTexture('#17325C', 'rgba(0, 215, 255, 0.28)', 14);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(86, 86),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.2 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Illuminated boulevard avenues
  const roadMat = new THREE.MeshStandardMaterial({ color: '#0F2547', roughness: 0.3, metalness: 0.35 });
  const nsBoulevard = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 58), roadMat);
  nsBoulevard.position.set(0, 0.025, 0);
  nsBoulevard.receiveShadow = true;
  root.add(nsBoulevard);

  const ewBoulevard = new THREE.Mesh(new THREE.BoxGeometry(58, 0.05, 9), roadMat);
  ewBoulevard.position.set(0, 0.025, 0);
  ewBoulevard.receiveShadow = true;
  root.add(ewBoulevard);

  const trimCyan = new THREE.MeshStandardMaterial({
    color: '#0284C7',
    emissive: '#00C8F0',
    emissiveIntensity: 0.18,
    roughness: 0.45,
  });
  [-4.4, 4.4].forEach((offset) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 56), trimCyan);
    strip.position.set(offset, 0.03, 0);
    root.add(strip);
  });

  // Central shaded emblem plaza ring (no unlit neon glare)
  const plazaRing = new THREE.Mesh(
    new THREE.RingGeometry(6.8, 7.25, 48),
    new THREE.MeshStandardMaterial({
      color: '#0284C7',
      emissive: '#00C8F0',
      emissiveIntensity: 0.16,
      roughness: 0.45,
      side: THREE.DoubleSide,
    })
  );
  plazaRing.rotation.x = -Math.PI / 2;
  plazaRing.position.y = 0.06;
  root.add(plazaRing);

  // Skyscrapers surrounding the walkable plaza
  const texCyan = createWindowFacadeTexture('#1A3563', '#38BDF8');
  const texViolet = createWindowFacadeTexture('#1E2F5E', '#A78BFA');
  const texGold = createWindowFacadeTexture('#1B3766', '#FBBF24');

  const buildings: [number, number, number, number, number, string, THREE.CanvasTexture][] = [
    [-19, -18, 8, 22, 8, '#38BDF8', texCyan],
    [19, -18, 8, 25, 8, '#A78BFA', texViolet],
    [-21, 18, 8, 19, 8, '#FBBF24', texGold],
    [21, 18, 8, 21, 8, '#38BDF8', texCyan],
    [-28, 0, 7, 26, 12, '#A78BFA', texViolet],
    [28, 0, 7, 26, 12, '#38BDF8', texCyan],
    [0, -29, 14, 30, 8, '#38BDF8', texCyan],
  ];

  buildings.forEach(([x, z, w, h, d, accent, tex], idx) => {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.28 })
    );
    body.position.set(x, h / 2, z);
    body.castShadow = !simplified3d;
    body.receiveShadow = true;
    root.add(body);

    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.35, 0.4, d + 0.35),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.32, roughness: 0.38 })
    );
    crown.position.set(x, h - 0.3, z);
    root.add(crown);

    colliders.push({
      id: `w1-bld-${idx}`,
      minX: x - w / 2 - 0.5,
      maxX: x + w / 2 + 0.5,
      minZ: z - d / 2 - 0.5,
      maxZ: z + d / 2 + 0.5,
    });
  });

  // Damaged / flickering digital billboards tied to the 3 clues
  const billboardMats: THREE.MeshBasicMaterial[] = [];
  const billboardSpecs = [
    { x: -11, z: 7, rotY: 0.45, title: 'ISYARAT ROSAK 01', sub: 'Ayat Bercelaru di Dataran' },
    { x: 11, z: 3, rotY: -0.45, title: 'PAPAN IKLAN 02', sub: 'Semak Struktur Pasif' },
    { x: 0, z: -16, rotY: 0, title: 'ARKIB ISYARAT 03', sub: 'Pulihkan Komunikasi Kota' },
  ];

  billboardSpecs.forEach((b) => {
    const bg = new THREE.Group();
    bg.position.set(b.x, 5.4, b.z);
    bg.rotation.y = b.rotY;

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, 5.4, 10),
      new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.7, roughness: 0.25 })
    );
    mast.position.y = -2.7;
    bg.add(mast);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 3.2, 0.28),
      new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.6, roughness: 0.3 })
    );
    bg.add(frame);

    const tex = createHoloSignTexture(b.title, b.sub, '#FFB547', '#13244A');
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.8), mat);
    screen.position.z = 0.16;
    bg.add(screen);
    billboardMats.push(mat);
    root.add(bg);
  });

  // 3 Corrupted Communication Devices (Challenges 1..3)
  const clueCoords = [
    { x: -8.5, z: 8.5 },
    { x: 9.5, z: 4.5 },
    { x: 0, z: -11 },
  ];
  MISSION_1_CLUES.slice(0, 3).forEach((clue, idx) => {
    addInteractableNode(
      root,
      interactables,
      nodeVisuals,
      {
        id: clue.id,
        missionId: 1,
        zoneId: 'zon_bandar',
        kind: 'clue',
        label: clue.zoneLabel,
        subtitle: `Peranti Isyarat Misi 01 (${idx + 1}/3)`,
        position: { x: clueCoords[idx].x, y: 0, z: clueCoords[idx].z },
        challengeId: clue.id,
      },
      '#00C8F0'
    );
  });

  // World Portal leading straight to Mission 02 (Makmal Neural) — NO PADLOCK
  const portalVeil = addWorldTravelPortal(root, interactables, 14, -14, 2, 'Makmal Neural', '#A5F05A');

  // Floating futuristic sky cars
  const skyCars: { mesh: THREE.Group; radius: number; speed: number; y: number; offset: number }[] = [];
  if (!simplified3d) {
    for (let i = 0; i < 6; i++) {
      const car = new THREE.Group();
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.65, 1.15),
        new THREE.MeshStandardMaterial({ color: '#CBD5E1', metalness: 0.6, roughness: 0.32 })
      );
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.35, 1.0),
        new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#00C8F0', emissiveIntensity: 0.25 })
      );
      canopy.position.y = 0.38;
      car.add(chassis, canopy);
      root.add(car);
      skyCars.push({
        mesh: car,
        radius: 18 + (i % 3) * 7,
        speed: 0.22 + (i % 2) * 0.12,
        y: 13 + (i % 3) * 3.5,
        offset: i * 1.05,
      });
    }
  }

  return {
    worldId: 1,
    root,
    colliders,
    interactables,
    boundsRadius: 27,
    spawnPoint: { x: 0, z: 16, yaw: 0 },
    skyColor: '#13315C',
    fogColor: '#163B70',
    fogDensity: 0.011,
    hemiSky: '#BAE6FD',
    hemiGround: '#1E3A5F',
    hemiIntensity: 0.80,
    dirIntensity: 1.15,
    exposure: 0.96,
    animateWorld: (elapsed, _delta, missions, completedChallenges) => {
      animateNodeVisuals(nodeVisuals, elapsed, missions, completedChallenges);
      const solved = completedChallenges?.['1'] ?? [];
      billboardMats.forEach((mat, i) => {
        const clueId = MISSION_1_CLUES[i]?.id;
        const ok = clueId && solved.includes(clueId);
        if (ok) {
          mat.color.set('#A5F05A');
        } else {
          const pulse = Math.sin(elapsed * 8 + i) > 0.15 ? 1 : 0.6;
          mat.color.setRGB(pulse, pulse * 0.9, 0.75);
        }
      });
      portalVeil.rotation.z = elapsed * 0.6;
      for (const c of skyCars) {
        const a = elapsed * c.speed + c.offset;
        c.mesh.position.set(Math.cos(a) * c.radius, c.y + Math.sin(elapsed * 2 + c.offset) * 0.4, Math.sin(a) * c.radius);
        c.mesh.rotation.y = -a;
      }
    },
  };
}

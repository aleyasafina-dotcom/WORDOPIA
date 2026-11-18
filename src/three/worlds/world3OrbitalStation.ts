import * as THREE from 'three';
import { MISSION_3_SCENARIOS } from '../../data/missions.ts';
import type { WorldInteractable } from '../../types/game.ts';
import {
  addInteractableNode,
  addWorldTravelPortal,
  animateNodeVisuals,
  createBrightGridFloorTexture,
  createHoloSignTexture,
  type MissionWorldInstance,
  type NodeVisualEntry,
  type WorldCollider,
} from './worldCommon.ts';

/**
 * MISSION 03 WORLD: STESEN ORBITAL (Hakim Bahasa)
 * Futuristic orbital space station deck with panoramic space & planet viewport,
 * central rotating hologram star-map, comms desks, and 3 interactive NPCs.
 */
export function buildWorld3OrbitalStation(simplified3d = false): MissionWorldInstance {
  const root = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const interactables: WorldInteractable[] = [];
  const nodeVisuals: NodeVisualEntry[] = [];

  // Balanced orbital command deck floor
  const floorTex = createBrightGridFloorTexture('#1C2D4F', 'rgba(255, 181, 71, 0.16)', 12);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(26, 48),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.36, metalness: 0.35 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Outer perimeter observation deck railing
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(22.5, 0.35, 10, 48),
    new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.65, roughness: 0.32 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 1.1;
  root.add(rail);

  // Panoramic curved space window struts
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 10.5, 0.9),
      new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.52, roughness: 0.4 })
    );
    strut.position.set(Math.cos(a) * 23, 5.2, Math.sin(a) * 23);
    strut.rotation.y = -a;
    root.add(strut);
  }

  // Illuminated Blue-Cyan Planet outside the north panoramic viewport
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(18, 32, 24),
    new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.2,
      roughness: 0.5,
    })
  );
  planet.position.set(0, 6, -54);
  root.add(planet);

  const planetRing = new THREE.Mesh(
    new THREE.RingGeometry(23, 27, 48),
    new THREE.MeshStandardMaterial({
      color: '#7DD3FC',
      emissive: '#38BDF8',
      emissiveIntensity: 0.12,
      roughness: 0.55,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
  );
  planetRing.position.set(0, 6, -54);
  planetRing.rotation.x = Math.PI * 0.38;
  planetRing.rotation.y = 0.22;
  root.add(planetRing);

  // Starfield outside station
  if (!simplified3d) {
    const starCount = 260;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = 36 + Math.random() * 40;
      pos[i * 3] = Math.cos(a) * dist;
      pos[i * 3 + 1] = 2 + Math.random() * 28;
      pos[i * 3 + 2] = Math.sin(a) * dist;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    root.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: '#F8FAFC', size: 0.32, transparent: true, opacity: 0.85 })
      )
    );
  }

  // Central Holographic Orbital Map Table
  const mapBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.6, 0.95, 24),
    new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.6, roughness: 0.28 })
  );
  mapBase.position.y = 0.475;
  mapBase.receiveShadow = true;
  root.add(mapBase);
  colliders.push({ id: 'orbital-table', minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 });

  const holoGlobe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    new THREE.MeshStandardMaterial({
      color: '#FFB547',
      emissive: '#F59E0B',
      emissiveIntensity: 0.4,
      wireframe: true,
    })
  );
  holoGlobe.position.y = 2.6;
  root.add(holoGlobe);

  const orbitalSignTex = createHoloSignTexture('STESEN ORBITAL', 'Pusat Penilaian Komunikasi', '#FFB547', '#102247');
  const orbitalSign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 2.5),
    new THREE.MeshBasicMaterial({ map: orbitalSignTex, side: THREE.DoubleSide })
  );
  orbitalSign.position.set(0, 8.2, -16);
  root.add(orbitalSign);

  // 3 NPCs around the orbital control deck (Mission 3 Scenarios)
  const npcCoords = [
    { x: -8.5, z: 3 },
    { x: 0, z: -8.5 },
    { x: 8.5, z: 3 },
  ];
  MISSION_3_SCENARIOS.slice(0, 3).forEach((sc, idx) => {
    addInteractableNode(
      root,
      interactables,
      nodeVisuals,
      {
        id: sc.id,
        missionId: 3,
        zoneId: 'stesen_komunikasi',
        kind: 'npc',
        label: `${sc.characterName} · ${sc.stationName}`,
        subtitle: sc.characterRole,
        position: { x: npcCoords[idx].x, y: 0, z: npcCoords[idx].z },
        challengeId: sc.id,
      },
      '#FFB547'
    );
  });

  const portalPrev = addWorldTravelPortal(root, interactables, -12, 14, 2, 'Makmal Neural', '#A5F05A');
  const portalNext = addWorldTravelPortal(root, interactables, 12, -14, 4, 'Bandar Media Digital', '#7B61FF');

  return {
    worldId: 3,
    root,
    colliders,
    interactables,
    boundsRadius: 21,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
    skyColor: '#0E1F42',
    fogColor: '#122650',
    fogDensity: 0.007,
    hemiSky: '#BAE6FD',
    hemiGround: '#1E293B',
    hemiIntensity: 0.78,
    dirIntensity: 1.15,
    exposure: 0.96,
    animateWorld: (elapsed, _delta, missions, completedChallenges) => {
      animateNodeVisuals(nodeVisuals, elapsed, missions, completedChallenges);
      holoGlobe.rotation.y = elapsed * 0.45;
      planet.rotation.y = elapsed * 0.04;
      portalPrev.rotation.z = elapsed * 0.5;
      portalNext.rotation.z = -elapsed * 0.5;
    },
  };
}

import * as THREE from 'three';
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
 * MISSION 04 WORLD: BANDAR MEDIA DIGITAL (Studio Kreatif)
 * Bright futuristic broadcast studio with luminous recording stage,
 * holographic editing screens, orbiting camera drones, and Script Terminal.
 */
export function buildWorld4MediaCity(simplified3d = false): MissionWorldInstance {
  const root = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const interactables: WorldInteractable[] = [];
  const nodeVisuals: NodeVisualEntry[] = [];

  // Balanced studio floor
  const floorTex = createBrightGridFloorTexture('#1D2856', 'rgba(139, 92, 246, 0.2)', 12);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(66, 66),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.38, metalness: 0.28 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Elevated Circular Broadcast Stage
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 8.2, 0.35, 36),
    new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.5, roughness: 0.32 })
  );
  stage.position.set(0, 0.175, -3);
  stage.receiveShadow = true;
  root.add(stage);

  const stageRing = new THREE.Mesh(
    new THREE.RingGeometry(7.2, 7.6, 40),
    new THREE.MeshStandardMaterial({
      color: '#7C3AED',
      emissive: '#7B61FF',
      emissiveIntensity: 0.18,
      roughness: 0.45,
      side: THREE.DoubleSide,
    })
  );
  stageRing.rotation.x = -Math.PI / 2;
  stageRing.position.set(0, 0.36, -3);
  root.add(stageRing);

  // Holographic Editing & Teleprompter Screens around the stage
  const screenSpecs = [
    { x: -10, z: -6, rotY: 0.55, title: 'SUNTINGAN SKRIP', sub: 'Ayat Aktif & Pasif', col: '#00C8F0' },
    { x: 0, z: -13, rotY: 0, title: 'STUDIO KREATIF', sub: 'Rakam Mesej Duta Bahasa', col: '#A78BFA' },
    { x: 10, z: -6, rotY: -0.55, title: 'SEMAKAN AI ROBO', sub: 'Tatabahasa SP 5.3.3', col: '#A5F05A' },
  ];
  screenSpecs.forEach((sc, idx) => {
    const tex = createHoloSignTexture(sc.title, sc.sub, sc.col, '#16204A');
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
    panel.position.set(sc.x, 4.3, sc.z);
    panel.rotation.y = sc.rotY;
    root.add(panel);

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.1, 1.2),
      new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.38, roughness: 0.42 })
    );
    desk.position.set(sc.x, 0.55, sc.z + 1.2);
    desk.rotation.y = sc.rotY;
    desk.castShadow = !simplified3d;
    desk.receiveShadow = true;
    root.add(desk);
    colliders.push({
      id: `media-desk-${idx}`,
      minX: sc.x - 1.8,
      maxX: sc.x + 1.8,
      minZ: sc.z - 0.5,
      maxZ: sc.z + 2.2,
    });
  });

  // Acoustic structural pillars around studio perimeter (dark charcoal + subtle trim)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * 19;
    const pz = Math.sin(a) * 19;
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 8.5, 1.1),
      new THREE.MeshStandardMaterial({
        color: '#283553',
        emissive: i % 2 === 0 ? '#0284C7' : '#6D28D9',
        emissiveIntensity: 0.12,
        roughness: 0.46,
        metalness: 0.35,
      })
    );
    col.position.set(px, 4.25, pz);
    root.add(col);
  }

  // Orbiting Floating Camera Drones
  const camDrones: { group: THREE.Group; radius: number; offset: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const dg = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#CBD5E1', metalness: 0.55, roughness: 0.32 })
    );
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.32, 10),
      new THREE.MeshStandardMaterial({ color: '#00C8F0', emissive: '#00C8F0', emissiveIntensity: 0.45 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.42;
    dg.add(body, lens);
    root.add(dg);
    camDrones.push({ group: dg, radius: 6.2 + i * 1.4, offset: i * 1.6, y: 3.4 + (i % 2) * 0.9 });
  }

  // Script Creation Terminal (Mission 04)
  addInteractableNode(
    root,
    interactables,
    nodeVisuals,
    {
      id: 'm4-terminal',
      missionId: 4,
      zoneId: 'pusat_media',
      kind: 'studio_terminal',
      label: 'Konsol Penulisan Mesej Rahsia',
      subtitle: 'Misi 04 · Studio Kreatif',
      position: { x: 0, y: 0, z: -3 },
      challengeId: 'm4-terminal',
    },
    '#7B61FF'
  );

  const portalPrev = addWorldTravelPortal(root, interactables, -12, 13, 3, 'Stesen Orbital', '#FFB547');
  const portalNext = addWorldTravelPortal(root, interactables, 12, -13, 5, 'Menara Langit', '#FFB547');

  return {
    worldId: 4,
    root,
    colliders,
    interactables,
    boundsRadius: 21,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
    skyColor: '#1C2254',
    fogColor: '#222A66',
    fogDensity: 0.0085,
    hemiSky: '#DDD6FE',
    hemiGround: '#1E293B',
    hemiIntensity: 0.80,
    dirIntensity: 1.15,
    exposure: 0.96,
    animateWorld: (elapsed, _delta, missions, completedChallenges) => {
      animateNodeVisuals(nodeVisuals, elapsed, missions, completedChallenges);
      for (const cd of camDrones) {
        const a = elapsed * 0.65 + cd.offset;
        cd.group.position.set(
          Math.cos(a) * cd.radius,
          cd.y + Math.sin(elapsed * 2.5 + cd.offset) * 0.25,
          -3 + Math.sin(a) * cd.radius
        );
        cd.group.lookAt(0, 2.2, -3);
      }
      portalPrev.rotation.z = elapsed * 0.5;
      portalNext.rotation.z = -elapsed * 0.5;
    },
  };
}

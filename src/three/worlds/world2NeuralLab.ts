import * as THREE from 'three';
import { MISSION_2_TASKS } from '../../data/missions.ts';
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
 * MISSION 02 WORLD: MAKMAL NEURAL (Makmal Ayat)
 * Bright futuristic laboratory with clean white/cyan floor, curved research arches,
 * rotating neural core chamber, glowing containment tubes, and 3 repair workstations.
 */
export function buildWorld2NeuralLab(simplified3d = false): MissionWorldInstance {
  const root = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const interactables: WorldInteractable[] = [];
  const nodeVisuals: NodeVisualEntry[] = [];

  // Balanced metallic futuristic laboratory floor (crisp slate-blue steel with restrained grid)
  const floorTex = createBrightGridFloorTexture('#1E2F4D', 'rgba(56, 189, 248, 0.22)', 12);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.44, metalness: 0.36 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Outer perimeter ring dome (brushed titanium alloy ribs + dark slate plinth panels)
  const wallMat = new THREE.MeshStandardMaterial({ color: '#7C8EA6', roughness: 0.44, metalness: 0.42 });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: '#273959', roughness: 0.5, metalness: 0.38 });
  const ribGlowMat = new THREE.MeshStandardMaterial({
    color: '#0EA5E9',
    emissive: '#00C8F0',
    emissiveIntensity: 0.42,
    roughness: 0.32,
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 24;
    const z = Math.sin(a) * 24;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 1.4), wallMat);
    pillar.position.set(x, 5.5, z);
    pillar.rotation.y = -a + Math.PI / 2;
    pillar.castShadow = !simplified3d;
    pillar.receiveShadow = true;
    root.add(pillar);

    const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.4, 1.6), darkTrimMat);
    pillarBase.position.set(x, 0.7, z);
    pillarBase.rotation.y = -a + Math.PI / 2;
    pillarBase.receiveShadow = true;
    root.add(pillarBase);

    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 8.6, 1.46), ribGlowMat);
    lightBar.position.set(x, 5.7, z);
    lightBar.rotation.y = -a + Math.PI / 2;
    root.add(lightBar);

    // Overhead structural alloy arch rib
    const arch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 24), wallMat);
    arch.position.set(Math.cos(a) * 12, 11.2, Math.sin(a) * 12);
    arch.rotation.y = -a + Math.PI / 2;
    root.add(arch);
  }

  // Central Rotating Neural Energy Chamber
  const coreBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.8, 0.9, 24),
    new THREE.MeshStandardMaterial({ color: '#1B3158', metalness: 0.58, roughness: 0.36 })
  );
  coreBase.position.y = 0.45;
  coreBase.castShadow = !simplified3d;
  coreBase.receiveShadow = true;
  root.add(coreBase);
  colliders.push({ id: 'lab-core', minX: -3.6, maxX: 3.6, minZ: -3.6, maxZ: 3.6 });

  const glassTube = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 6.2, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#7DD3FC',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      roughness: 0.18,
      metalness: 0.25,
    })
  );
  glassTube.position.y = 4.0;
  root.add(glassTube);

  const innerCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.25, 0),
    new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#00C8F0',
      emissiveIntensity: 1.25,
      roughness: 0.2,
    })
  );
  innerCrystal.position.y = 4.1;
  root.add(innerCrystal);

  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.12, 10, 32),
    new THREE.MeshStandardMaterial({ color: '#84CC16', emissive: '#A5F05A', emissiveIntensity: 0.42, roughness: 0.35 })
  );
  ringA.position.y = 4.1;
  root.add(ringA);

  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(3.15, 0.1, 10, 32),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#00C8F0', emissiveIntensity: 0.42, roughness: 0.35 })
  );
  ringB.position.y = 4.1;
  root.add(ringB);

  // Holographic Lab Signboard
  const labSignTex = createHoloSignTexture('MAKMAL NEURAL', 'Pembaikan Struktur Ayat', '#A5F05A', '#0F254A');
  const labSign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 2.6),
    new THREE.MeshBasicMaterial({ map: labSignTex, side: THREE.DoubleSide })
  );
  labSign.position.set(0, 8.8, -14);
  root.add(labSign);

  // Containment Specimen Cylinders on sidelines
  [-13, 13].forEach((sx) => {
    [-7, 7].forEach((sz) => {
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 4.2, 16),
        new THREE.MeshStandardMaterial({
          color: '#38BDF8',
          transparent: true,
          opacity: 0.22,
          roughness: 0.2,
          metalness: 0.2,
        })
      );
      pod.position.set(sx, 2.1, sz);
      root.add(pod);
      const podCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 2.8, 12),
        new THREE.MeshStandardMaterial({
          color: '#0EA5E9',
          emissive: '#0284C7',
          emissiveIntensity: 0.38,
          roughness: 0.3,
        })
      );
      podCore.position.set(sx, 2.1, sz);
      root.add(podCore);
      const podCap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.58, roughness: 0.34 })
      );
      podCap.position.set(sx, 0.18, sz);
      podCap.receiveShadow = true;
      root.add(podCap);
      colliders.push({
        id: `pod-${sx}-${sz}`,
        minX: sx - 1.3,
        maxX: sx + 1.3,
        minZ: sz - 1.3,
        maxZ: sz + 1.3,
      });
    });
  });

  // 3 Holographic Research Workstations (Mission 2 Tasks)
  const taskCoords = [
    { x: -8.5, z: 3 },
    { x: 0, z: -8.5 },
    { x: 8.5, z: 3 },
  ];
  MISSION_2_TASKS.slice(0, 3).forEach((task, idx) => {
    addInteractableNode(
      root,
      interactables,
      nodeVisuals,
      {
        id: task.id,
        missionId: 2,
        zoneId: 'pusat_data',
        kind: 'terminal',
        label: task.terminalName,
        subtitle: `Terminal Makmal Misi 02 (${idx + 1}/3)`,
        position: { x: taskCoords[idx].x, y: 0, z: taskCoords[idx].z },
        challengeId: task.id,
      },
      '#A5F05A'
    );
  });

  // Return & Forward World Portals
  const portalPrev = addWorldTravelPortal(root, interactables, -12, 14, 1, 'Kota NEXUS', '#00C8F0');
  const portalNext = addWorldTravelPortal(root, interactables, 12, -14, 3, 'Stesen Orbital', '#FFB547');

  return {
    worldId: 2,
    root,
    colliders,
    interactables,
    boundsRadius: 21,
    spawnPoint: { x: 0, z: 14, yaw: 0 },
    skyColor: '#0E1F3D',
    fogColor: '#12264B',
    fogDensity: 0.011,
    hemiSky: '#93C5FD',
    hemiGround: '#1E293B',
    hemiIntensity: 0.72,
    dirIntensity: 1.12,
    exposure: 0.94,
    animateWorld: (elapsed, _delta, missions, completedChallenges) => {
      animateNodeVisuals(nodeVisuals, elapsed, missions, completedChallenges);
      innerCrystal.rotation.y = elapsed * 0.9;
      innerCrystal.position.y = 4.1 + Math.sin(elapsed * 2.2) * 0.2;
      ringA.rotation.x = elapsed * 0.7;
      ringA.rotation.y = elapsed * 0.5;
      ringB.rotation.z = -elapsed * 0.6;
      ringB.rotation.x = Math.PI / 3;
      portalPrev.rotation.z = elapsed * 0.5;
      portalNext.rotation.z = -elapsed * 0.5;
    },
  };
}

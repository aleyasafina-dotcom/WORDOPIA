import * as THREE from 'three';
import type { WorldInteractable } from '../../types/game.ts';
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
 * MISSION 05 WORLD: MENARA LANGIT (Misi Akhir: Sampaikan Mesej Anda!)
 * High-altitude skyscraper pinnacle overlooking the glowing WORDOPIA city skyline below,
 * with panoramic glass parapet, central Signal Restoration Spire, and Tower Core terminal.
 */
export function buildWorld5SkylineTower(simplified3d = false): MissionWorldInstance {
  const root = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const interactables: WorldInteractable[] = [];
  const nodeVisuals: NodeVisualEntry[] = [];

  // Elevated Sky-Deck Platform
  const floorTex = createBrightGridFloorTexture('#1C3566', 'rgba(255, 200, 80, 0.2)', 10);
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(23, 22, 0.8, 48),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.36, metalness: 0.32 })
  );
  deck.position.y = -0.4;
  deck.receiveShadow = true;
  root.add(deck);

  // Panoramic Transparent Glass Safety Parapet
  const glassParapet = new THREE.Mesh(
    new THREE.CylinderGeometry(22.4, 22.4, 1.35, 48, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#7DD3FC',
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  glassParapet.position.y = 0.68;
  root.add(glassParapet);

  const parapetCap = new THREE.Mesh(
    new THREE.TorusGeometry(22.4, 0.14, 8, 48),
    new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.6, roughness: 0.36 })
  );
  parapetCap.rotation.x = Math.PI / 2;
  parapetCap.position.y = 1.36;
  root.add(parapetCap);

  // Miniature Glowing City Skyline far below the Sky-Deck (-18m Y)
  const cityTex = createWindowFacadeTexture('#14284E', '#38BDF8');
  const cityMat = new THREE.MeshStandardMaterial({ map: cityTex, roughness: 0.4, metalness: 0.3 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#38BDF8' });
  const skylineRingCount = simplified3d ? 16 : 28;
  for (let i = 0; i < skylineRingCount; i++) {
    const a = (i / skylineRingCount) * Math.PI * 2;
    const dist = 36 + (i % 3) * 12;
    const h = 14 + (i % 5) * 4;
    const b = new THREE.Mesh(new THREE.BoxGeometry(5.5, h, 5.5), cityMat);
    b.position.set(Math.cos(a) * dist, -22 + h / 2, Math.sin(a) * dist);
    root.add(b);
  }
  const lowerGlowSea = new THREE.Mesh(
    new THREE.RingGeometry(24, 95, 40),
    new THREE.MeshBasicMaterial({ color: '#0D1B38', side: THREE.DoubleSide })
  );
  lowerGlowSea.rotation.x = -Math.PI / 2;
  lowerGlowSea.position.y = -22;
  root.add(lowerGlowSea);

  // Central Menara Langit Restoration Spire (at z = -7)
  const spireBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.2, 2.2, 12),
    new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.48, roughness: 0.4 })
  );
  spireBase.position.set(0, 1.1, -7);
  spireBase.castShadow = !simplified3d;
  spireBase.receiveShadow = true;
  root.add(spireBase);
  colliders.push({ id: 'sky-spire', minX: -3.6, maxX: 3.6, minZ: -10.6, maxZ: -3.4 });

  const spireMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 2.1, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#1E3A6E', metalness: 0.6, roughness: 0.32 })
  );
  spireMast.position.set(0, 9.5, -7);
  root.add(spireMast);

  const spireRingMat = new THREE.MeshStandardMaterial({
    color: '#FFB547',
    emissive: '#FFB547',
    emissiveIntensity: 0.48,
    roughness: 0.3,
  });
  const spireRing = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.22, 12, 32), spireRingMat);
  spireRing.position.set(0, 9.5, -7);
  spireRing.rotation.x = Math.PI / 2;
  root.add(spireRing);

  const beamMat = new THREE.MeshBasicMaterial({
    color: '#38BDF8',
    transparent: true,
    opacity: 0.22,
  });
  const skyBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 42, 16), beamMat);
  skyBeam.position.set(0, 26, -7);
  root.add(skyBeam);

  // Sign Banner
  const signTex = createHoloSignTexture('MENARA LANGIT WORDOPIA', 'Pancar Video Duta Bahasa', '#FFB547', '#10244A');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 2.5),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 12.2, -7);
  root.add(sign);

  // Mission 05 Tower Core Interactable
  addInteractableNode(
    root,
    interactables,
    nodeVisuals,
    {
      id: 'm5-core',
      missionId: 5,
      zoneId: 'menara_utama',
      kind: 'tower_core',
      label: 'Teras Pemulihan Menara Langit',
      subtitle: 'Misi 05 · Sampaikan Mesej Anda!',
      position: { x: 0, y: 0, z: -1.5 },
      challengeId: 'm5-core',
    },
    '#FFB547'
  );

  // Return portal to Mission 1 or Mission 4
  const portalPrev = addWorldTravelPortal(root, interactables, -12, 11, 4, 'Bandar Media Digital', '#7B61FF');
  const portalHome = addWorldTravelPortal(root, interactables, 12, 11, 1, 'Kota NEXUS', '#00C8F0');

  return {
    worldId: 5,
    root,
    colliders,
    interactables,
    boundsRadius: 20,
    spawnPoint: { x: 0, z: 13, yaw: 0 },
    skyColor: '#193C72',
    fogColor: '#1D4682',
    fogDensity: 0.0065,
    hemiSky: '#FDE68A',
    hemiGround: '#1E3A8A',
    hemiIntensity: 0.82,
    dirIntensity: 1.18,
    exposure: 0.96,
    animateWorld: (elapsed, _delta, missions, completedChallenges, isDutaBahasa) => {
      animateNodeVisuals(nodeVisuals, elapsed, missions, completedChallenges);
      const m5Done = missions?.find((m) => m.missionId === 5)?.status === 'selesai';
      if (m5Done || isDutaBahasa) {
        spireRingMat.color.set('#00E5FF');
        spireRingMat.emissive.set('#00E5FF');
        beamMat.color.set('#A5F05A');
        beamMat.opacity = 0.36 + Math.sin(elapsed * 3) * 0.08;
        beaconMat.color.set('#A5F05A');
      } else {
        spireRingMat.color.set('#FFB547');
        spireRingMat.emissive.set('#FFB547');
        beamMat.color.set('#38BDF8');
        beamMat.opacity = 0.14 + Math.sin(elapsed * 4) * 0.05;
      }
      spireRing.rotation.z = elapsed * 0.7;
      portalPrev.rotation.z = elapsed * 0.5;
      portalHome.rotation.z = -elapsed * 0.5;
    },
  };
}

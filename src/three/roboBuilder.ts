import * as THREE from 'three';
import type { RoboMood } from '../types/game.ts';
import { drawRoboFaceCanvas } from './textures.ts';

export interface RoboRig {
  root: THREE.Group;
  body: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  ring: THREE.Mesh;
  beacon: THREE.Mesh;
  faceCanvas: HTMLCanvasElement;
  faceTexture: THREE.CanvasTexture;
  setMood: (mood: RoboMood) => void;
}

export function buildRoboCompanion(): RoboRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const whiteShellMat = new THREE.MeshPhysicalMaterial({
    color: 0xd1dbe8,
    roughness: 0.44,
    metalness: 0.16,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
  });

  const cyanTrimMat = new THREE.MeshStandardMaterial({
    color: 0x00c8f0,
    emissive: 0x00c8f0,
    emissiveIntensity: 0.42,
    roughness: 0.28,
    metalness: 0.48,
  });

  const turquoiseMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    roughness: 0.38,
    metalness: 0.42,
  });

  const slateBezelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.55,
  });

  // Main cute capsule-oval body
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 20), whiteShellMat);
  torso.scale.set(1.06, 0.95, 0.95);
  torso.castShadow = true;
  torso.receiveShadow = true;
  body.add(torso);

  // Subtle recessed mid-chassis seam ring for spherical silhouette contrast
  const chassisSeam = new THREE.Mesh(new THREE.TorusGeometry(0.278, 0.011, 8, 28), slateBezelMat);
  chassisSeam.rotation.x = Math.PI / 2;
  chassisSeam.position.y = -0.02;
  body.add(chassisSeam);

  // Turquoise waist collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.032, 10, 24), turquoiseMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.14;
  body.add(collar);

  // Digital visor screen
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 256;
  faceCanvas.height = 160;
  drawRoboFaceCanvas(faceCanvas, 'mesra');
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;

  const visorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.22, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.32, metalness: 0.65 })
  );
  visorFrame.position.set(0, 0.02, 0.23);
  body.add(visorFrame);

  const visorScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.185),
    new THREE.MeshBasicMaterial({ map: faceTexture, color: 0xdbeafe, toneMapped: true })
  );
  visorScreen.position.set(0, 0.02, 0.273);
  body.add(visorScreen);

  // Side floating ear-thruster wings
  const wingGeo = new THREE.CapsuleGeometry(0.055, 0.16, 6, 10);
  const leftWing = new THREE.Mesh(wingGeo, turquoiseMat);
  leftWing.position.set(-0.34, 0, 0);
  leftWing.rotation.z = 0.25;
  body.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, turquoiseMat);
  rightWing.position.set(0.34, 0, 0);
  rightWing.rotation.z = -0.25;
  body.add(rightWing);

  // Antenna + glowing beacon
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.16, 8), turquoiseMat);
  stalk.position.set(0, 0.31, 0);
  body.add(stalk);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), cyanTrimMat);
  beacon.position.set(0, 0.4, 0);
  body.add(beacon);

  // Hovering energy ring below ROBO
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 8, 24), cyanTrimMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.34;
  body.add(ring);

  let currentMood: RoboMood = 'mesra';
  const setMood = (mood: RoboMood) => {
    if (mood === currentMood) return;
    currentMood = mood;
    drawRoboFaceCanvas(faceCanvas, mood);
    faceTexture.needsUpdate = true;
    const hex =
      mood === 'amaran' ? 0xffb547 : mood === 'bangga' || mood === 'teruja' ? 0xa5f05a : 0x00c8f0;
    cyanTrimMat.color.setHex(hex);
    cyanTrimMat.emissive.setHex(hex);
  };

  return {
    root,
    body,
    leftWing,
    rightWing,
    ring,
    beacon,
    faceCanvas,
    faceTexture,
    setMood,
  };
}

export function animateRoboRig(rig: RoboRig, elapsed: number): void {
  rig.body.position.y = Math.sin(elapsed * 2.8) * 0.09;
  rig.body.rotation.z = Math.sin(elapsed * 1.8) * 0.06;
  rig.leftWing.position.y = Math.sin(elapsed * 4.5) * 0.025;
  rig.rightWing.position.y = -Math.sin(elapsed * 4.5) * 0.025;
  rig.ring.rotation.z = elapsed * 1.4;
  rig.ring.scale.setScalar(0.95 + Math.sin(elapsed * 5) * 0.05);
}

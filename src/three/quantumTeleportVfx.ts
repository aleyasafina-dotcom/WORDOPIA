import * as THREE from 'three';
import type { TeleportPhaseId } from '../types/game.ts';
import { disposeObject3D } from './worlds/worldCommon.ts';

function createSoftGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.28, 'rgba(0,225,255,0.85)');
  grad.addColorStop(0.65, 'rgba(59,130,246,0.32)');
  grad.addColorStop(1, 'rgba(16,28,53,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createQuantumSigilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 246);
  grad.addColorStop(0, 'rgba(224,248,255,0.92)');
  grad.addColorStop(0.32, 'rgba(0,200,240,0.65)');
  grad.addColorStop(0.75, 'rgba(123,97,255,0.3)');
  grad.addColorStop(1, 'rgba(0,200,240,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 246, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#E0F7FF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(256, 256, 210, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#00C8F0';
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 14]);
  ctx.beginPath();
  ctx.arc(256, 256, 168, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = '#A78BFA';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(ang) * 90, 256 + Math.sin(ang) * 90);
    ctx.lineTo(256 + Math.cos(ang) * 210, 256 + Math.sin(ang) * 210);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface OrbitRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  baseRadius: number;
  baseYOffset: number;
  speedX: number;
  speedY: number;
}

interface ShardParticle {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  speed: number;
  heightOffset: number;
  burstVx: number;
  burstVy: number;
  burstVz: number;
}

export interface QuantumTeleportController {
  auraGroup: THREE.Group;
  tunnelGroup: THREE.Group;
  heroLight: THREE.PointLight;
  resetArrivalBurst: (x: number, y: number, z: number) => void;
  updateAura: (
    phase: TeleportPhaseId,
    phaseProgress: number,
    elapsed: number,
    delta: number,
    heroX: number,
    heroY: number,
    heroZ: number
  ) => void;
  updateTunnel: (elapsed: number, delta: number, tunnelProgress: number) => void;
  hideAll: () => void;
  dispose: () => void;
}

export const TUNNEL_ORIGIN_X = 400;

export function createQuantumTeleportVfx(scene: THREE.Scene): QuantumTeleportController {
  const glowTex = createSoftGlowSpriteTexture();
  const sigilTex = createQuantumSigilTexture();

  // =========================================================================
  // 1. CHARACTER QUANTUM ASCENSION AURA GROUP
  // =========================================================================
  const auraGroup = new THREE.Group();
  auraGroup.visible = false;
  scene.add(auraGroup);

  const heroLight = new THREE.PointLight('#38BDF8', 0, 28);
  heroLight.position.set(0, 1.5, 0);
  auraGroup.add(heroLight);

  // Ground energy sigil disc
  const sigilMat = new THREE.MeshBasicMaterial({
    map: sigilTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sigilMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), sigilMat);
  sigilMesh.rotation.x = -Math.PI / 2;
  sigilMesh.position.y = 0.04;
  auraGroup.add(sigilMesh);

  // Expanding ground shockwave ring (Eruption & Landing)
  const waveMat = new THREE.MeshBasicMaterial({
    color: '#7DD3FC',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waveRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.35, 40), waveMat);
  waveRing.rotation.x = -Math.PI / 2;
  waveRing.position.y = 0.06;
  auraGroup.add(waveRing);

  // Vertical Dual-Layer Volumetric Energy Pillar
  const pillarGroup = new THREE.Group();
  auraGroup.add(pillarGroup);

  const innerBeamMat = new THREE.MeshBasicMaterial({
    color: '#F0F9FF',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const innerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1, 20, 1, true), innerBeamMat);
  innerBeam.position.y = 0.5;
  pillarGroup.add(innerBeam);

  const outerBeamMat = new THREE.MeshBasicMaterial({
    color: '#00C8F0',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 1, 24, 1, true), outerBeamMat);
  outerBeam.position.y = 0.5;
  pillarGroup.add(outerBeam);

  // Counter-rotating luminous energy rings around hero
  const orbitRings: OrbitRing[] = [];
  const ringConfigs = [
    { r: 1.45, tube: 0.045, yOff: 0.25, color: '#00C8F0', sx: 0.2, sy: 1.9 },
    { r: 1.78, tube: 0.038, yOff: 0.85, color: '#38BDF8', sx: -0.45, sy: -2.4 },
    { r: 1.32, tube: 0.035, yOff: 1.45, color: '#A78BFA', sx: 0.55, sy: 2.8 },
    { r: 1.95, tube: 0.032, yOff: 1.95, color: '#E0F7FF', sx: -0.25, sy: 1.6 },
  ];
  ringConfigs.forEach((rc) => {
    const mat = new THREE.MeshBasicMaterial({
      color: rc.color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(rc.r, rc.tube, 10, 44), mat);
    mesh.rotation.x = Math.PI / 2;
    auraGroup.add(mesh);
    orbitRings.push({
      mesh,
      mat,
      baseRadius: rc.r,
      baseYOffset: rc.yOff,
      speedX: rc.sx,
      speedY: rc.sy,
    });
  });

  // Electrical arcs orbiting the energy pillar
  const arcLines: THREE.Line[] = [];
  const arcMat = new THREE.LineBasicMaterial({
    color: '#E0F7FF',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  for (let a = 0; a < 6; a++) {
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= 10; s++) {
      const t = s / 10;
      const ang = a * (Math.PI / 3) + t * 2.4;
      const rad = 0.85 + Math.sin(t * Math.PI) * 0.45 + (s % 2 === 0 ? 0.14 : -0.14);
      pts.push(new THREE.Vector3(Math.cos(ang) * rad, t * 5.2, Math.sin(ang) * rad));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, arcMat);
    auraGroup.add(line);
    arcLines.push(line);
  }

  // Quantum Transformation / Arrival Energy Sphere enveloping hero
  const sphereMat = new THREE.MeshBasicMaterial({
    color: '#7DD3FC',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const energySphere = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), sphereMat);
  auraGroup.add(energySphere);

  // Rising & bursting luminous crystal shards & glowing sprites
  const shards: ShardParticle[] = [];
  const shardGeo = new THREE.OctahedronGeometry(0.085, 0);
  const shardColors = ['#00C8F0', '#E0F7FF', '#7B61FF', '#38BDF8'];
  for (let i = 0; i < 64; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: shardColors[i % shardColors.length],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(shardGeo, mat);
    auraGroup.add(mesh);
    const angle = (i / 64) * Math.PI * 2 * 3;
    const radius = 0.85 + (i % 5) * 0.34;
    shards.push({
      mesh,
      angle,
      radius,
      speed: 2.2 + (i % 4) * 0.75,
      heightOffset: (i / 64) * 5.0,
      burstVx: Math.cos(angle) * (2.6 + (i % 5) * 0.85),
      burstVy: 1.5 + (i % 6) * 0.65,
      burstVz: Math.sin(angle) * (2.6 + (i % 5) * 0.85),
    });
  }

  // =========================================================================
  // 2. INTERDIMENSIONAL QUANTUM TUNNEL GROUP (PHASE 5)
  // =========================================================================
  const tunnelGroup = new THREE.Group();
  tunnelGroup.position.set(TUNNEL_ORIGIN_X, 0, 0);
  tunnelGroup.visible = false;
  scene.add(tunnelGroup);

  const tunnelAmbient = new THREE.PointLight('#00C8F0', 4, 65);
  tunnelAmbient.position.set(0, 0, -18);
  tunnelGroup.add(tunnelAmbient);

  // Dark deep cosmic outer shell cylinder
  const shellGeo = new THREE.CylinderGeometry(16, 16, 110, 24, 1, true);
  shellGeo.rotateX(Math.PI / 2);
  const shellMat = new THREE.MeshBasicMaterial({
    color: '#07142E',
    side: THREE.BackSide,
  });
  const outerShell = new THREE.Mesh(shellGeo, shellMat);
  outerShell.position.z = -45;
  tunnelGroup.add(outerShell);

  // Octagonal & circular geometric warp gates rushing past camera
  const warpGates: THREE.Mesh[] = [];
  const gateColors = ['#00C8F0', '#38BDF8', '#7B61FF', '#E0F7FF'];
  for (let i = 0; i < 16; i++) {
    const geo =
      i % 2 === 0
        ? new THREE.TorusGeometry(6.8, 0.14, 8, 8)
        : new THREE.TorusGeometry(8.2, 0.11, 8, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: gateColors[i % gateColors.length],
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const gate = new THREE.Mesh(geo, mat);
    gate.position.z = -i * 6.5;
    tunnelGroup.add(gate);
    warpGates.push(gate);
  }

  // Helical energy stream ribbons spiraling down the tunnel
  const streamTubes: THREE.Mesh[] = [];
  for (let s = 0; s < 6; s++) {
    const pts: THREE.Vector3[] = [];
    const baseAng = (s / 6) * Math.PI * 2;
    for (let k = 0; k <= 24; k++) {
      const z = -k * 4.2;
      const ang = baseAng + k * 0.34;
      const rad = 5.4 + Math.sin(k * 0.45) * 0.65;
      pts.push(new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.09, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: s % 2 === 0 ? '#00C8F0' : '#A78BFA',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tunnelGroup.add(tubeMesh);
    streamTubes.push(tubeMesh);
  }

  // High-speed streaming star & energy trail particles
  const particleCount = 260;
  const streakPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const ang = (i / particleCount) * Math.PI * 2 * 13;
    const rad = 2.2 + (i % 9) * 0.9;
    streakPositions[i * 3] = Math.cos(ang) * rad;
    streakPositions[i * 3 + 1] = Math.sin(ang) * rad;
    streakPositions[i * 3 + 2] = -((i / particleCount) * 96);
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  const streakMat = new THREE.PointsMaterial({
    map: glowTex,
    color: '#E0F7FF',
    size: 0.75,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const streakPoints = new THREE.Points(streakGeo, streakMat);
  tunnelGroup.add(streakPoints);

  let arrivalBurstTimer = -1;

  const resetArrivalBurst = (x: number, y: number, z: number) => {
    arrivalBurstTimer = 0;
    auraGroup.visible = true;
    auraGroup.position.set(x, 0, z);
    shards.forEach((sh) => {
      sh.mesh.position.set(0, Math.max(1.0, y + 0.8), 0);
    });
  };

  const updateAura = (
    phase: TeleportPhaseId,
    phaseProgress: number,
    elapsed: number,
    delta: number,
    heroX: number,
    heroY: number,
    heroZ: number
  ) => {
    if (phase === 'idle' || phase === 'tunnel') {
      auraGroup.visible = false;
      heroLight.intensity = 0;
      return;
    }

    auraGroup.visible = true;
    auraGroup.position.set(heroX, 0, heroZ);
    heroLight.position.set(0, heroY + 1.4, 0);

    // Base intensities per phase
    if (phase === 'activate') {
      const ease = THREE.MathUtils.smoothstep(phaseProgress, 0, 1);
      sigilMat.opacity = ease * 0.85;
      sigilMesh.scale.setScalar(0.35 + ease * 0.65);
      sigilMesh.rotation.z = elapsed * 1.4;

      innerBeamMat.opacity = ease * 0.25;
      outerBeamMat.opacity = ease * 0.18;
      pillarGroup.scale.set(0.6 + ease * 0.4, 0.4 + ease * 2.2, 0.6 + ease * 0.4);

      waveMat.opacity = 0;
      arcMat.opacity = ease * 0.3;
      sphereMat.opacity = 0;
      heroLight.intensity = 1.5 + ease * 3.5;

      orbitRings.forEach((ring, idx) => {
        const threshold = idx * 0.18;
        const rAlpha = THREE.MathUtils.clamp((phaseProgress - threshold) / 0.4, 0, 1);
        ring.mat.opacity = rAlpha * 0.8;
        ring.mesh.position.y = 0.15 + idx * 0.35 * rAlpha;
        ring.mesh.rotation.z += delta * ring.speedY;
        ring.mesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 2 + idx) * 0.18;
        ring.mesh.scale.setScalar(0.65 + rAlpha * 0.35);
      });

      shards.forEach((sh) => {
        const mat = sh.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = ease * 0.78;
        const ang = sh.angle + elapsed * sh.speed;
        const r = sh.radius * (1.25 - ease * 0.35);
        sh.mesh.position.set(Math.cos(ang) * r, 0.2 + ((sh.heightOffset + elapsed * 1.5) % 2.8), Math.sin(ang) * r);
        sh.mesh.rotation.y += delta * 4;
        sh.mesh.scale.setScalar(0.85);
      });
    } else if (phase === 'eruption') {
      const ease = THREE.MathUtils.smoothstep(phaseProgress, 0, 0.85);
      sigilMat.opacity = 0.95;
      sigilMesh.scale.setScalar(1.0 + Math.sin(elapsed * 10) * 0.08);
      sigilMesh.rotation.z = elapsed * 2.8;

      pillarGroup.scale.set(0.9 + ease * 0.35, 2.5 + ease * 16.5, 0.9 + ease * 0.35);
      innerBeamMat.opacity = 0.55 + ease * 0.38;
      outerBeamMat.opacity = 0.35 + ease * 0.34;

      waveRing.scale.setScalar(0.7 + phaseProgress * 6.5);
      waveMat.opacity = (1 - phaseProgress) * 0.9;
      arcMat.opacity = 0.78;
      arcLines.forEach((line, idx) => {
        line.rotation.y = elapsed * (3.8 + idx * 0.6);
        line.scale.y = 0.8 + ease * 1.1;
      });

      sphereMat.opacity = ease * 0.22;
      energySphere.position.y = heroY + 0.95;
      energySphere.scale.setScalar(0.5 + ease * 0.8);
      heroLight.intensity = 5.0 + ease * 5.0;

      orbitRings.forEach((ring, idx) => {
        ring.mat.opacity = 0.92;
        ring.mesh.position.y = 0.35 + idx * 0.55;
        ring.mesh.rotation.z += delta * ring.speedY * 1.7;
        ring.mesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 3.5 + idx) * 0.35;
        ring.mesh.scale.setScalar(1.0 + Math.sin(elapsed * 6 + idx) * 0.08);
      });

      shards.forEach((sh) => {
        const mat = sh.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.95;
        const ang = sh.angle + elapsed * sh.speed * 1.6;
        const y = ((sh.heightOffset + elapsed * 4.8) % 6.5);
        sh.mesh.position.set(Math.cos(ang) * sh.radius * 0.85, y, Math.sin(ang) * sh.radius * 0.85);
        sh.mesh.rotation.y += delta * 6;
        sh.mesh.scale.setScalar(1.05);
      });
    } else if (phase === 'ascend') {
      sigilMat.opacity = 0.88 - phaseProgress * 0.2;
      sigilMesh.rotation.z = elapsed * 3.4;

      pillarGroup.scale.set(1.05, 19, 1.05);
      innerBeamMat.opacity = 0.68;
      outerBeamMat.opacity = 0.42;

      waveMat.opacity = Math.max(0, 0.5 - phaseProgress * 0.5);
      waveRing.scale.setScalar(1.2 + ((phaseProgress * 2) % 1) * 5.5);

      arcMat.opacity = 0.85;
      arcLines.forEach((line, idx) => {
        line.position.y = Math.max(0, heroY - 1.2);
        line.rotation.y = elapsed * (4.5 + idx * 0.7);
      });

      // Rings follow levitating hero at staggered heights
      orbitRings.forEach((ring, idx) => {
        ring.mat.opacity = 0.95;
        ring.mesh.position.y = heroY + ring.baseYOffset - 0.15;
        ring.mesh.rotation.z += delta * ring.speedY * 2.2;
        ring.mesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 2.5 + idx) * 0.48;
        ring.mesh.rotation.y += delta * ring.speedX * 1.4;
        ring.mesh.scale.setScalar(0.95 + Math.sin(elapsed * 5 + idx) * 0.1);
      });

      sphereMat.opacity = 0.18 + phaseProgress * 0.28;
      energySphere.position.y = heroY + 0.95;
      energySphere.scale.setScalar(1.1 + phaseProgress * 0.25);
      heroLight.intensity = 7.5 + phaseProgress * 2.5;

      shards.forEach((sh) => {
        const mat = sh.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.95;
        const ang = sh.angle + elapsed * sh.speed * 1.9;
        const y = heroY - 0.8 + ((sh.heightOffset + elapsed * 4.2) % 4.6);
        const r = sh.radius * 0.82;
        sh.mesh.position.set(Math.cos(ang) * r, Math.max(0.2, y), Math.sin(ang) * r);
        sh.mesh.rotation.y += delta * 7;
        sh.mesh.scale.setScalar(1.0);
      });
    } else if (phase === 'transform') {
      const ease = THREE.MathUtils.smoothstep(phaseProgress, 0, 1);
      sigilMat.opacity = (1 - ease) * 0.7;
      pillarGroup.scale.set(1.2 - ease * 0.75, 20, 1.2 - ease * 0.75);
      innerBeamMat.opacity = 0.85;
      outerBeamMat.opacity = 0.55 * (1 - ease * 0.4);

      arcMat.opacity = (1 - ease) * 0.9;
      arcLines.forEach((line, idx) => {
        line.position.y = heroY;
        line.rotation.y = elapsed * (7 + idx);
        line.scale.setScalar(1 - ease * 0.5);
      });

      orbitRings.forEach((ring, idx) => {
        ring.mat.opacity = 1 - ease * 0.6;
        ring.mesh.position.y = heroY + 0.9 + (ring.baseYOffset - 0.9) * (1 - ease);
        ring.mesh.scale.setScalar(Math.max(0.22, 1.0 - ease * 0.72));
        ring.mesh.rotation.z += delta * ring.speedY * 3.5;
        ring.mesh.rotation.x += delta * 2.2;
      });

      energySphere.position.y = heroY + 0.95;
      energySphere.scale.setScalar(1.25 - ease * 0.6 + Math.pow(ease, 3) * 3.2);
      sphereMat.opacity = 0.45 + ease * 0.5;
      heroLight.intensity = 10;

      shards.forEach((sh) => {
        const mat = sh.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 1;
        const ang = sh.angle + elapsed * sh.speed * 3.2;
        const r = sh.radius * (1 - ease * 0.78);
        sh.mesh.position.set(
          Math.cos(ang) * r,
          heroY + 0.9 + ease * 2.8 + Math.sin(ang) * 0.4,
          Math.sin(ang) * r
        );
        sh.mesh.scale.setScalar(1.1);
      });
    } else if (phase === 'arrive') {
      if (arrivalBurstTimer < 0) arrivalBurstTimer = 0;
      arrivalBurstTimer += delta;

      const fade = 1 - THREE.MathUtils.smoothstep(phaseProgress, 0.35, 1);
      sigilMat.opacity = fade * 0.82;
      sigilMesh.scale.setScalar(1.05);
      sigilMesh.rotation.z = elapsed * 2.2;

      pillarGroup.scale.set(0.75 * fade, 14, 0.75 * fade);
      innerBeamMat.opacity = fade * 0.55;
      outerBeamMat.opacity = fade * 0.32;
      arcMat.opacity = fade * 0.45;

      // Energy sphere expands & dissolves smoothly in first 45% of arrival
      const spherePhase = THREE.MathUtils.clamp(phaseProgress / 0.45, 0, 1);
      energySphere.position.y = heroY + 0.95;
      energySphere.scale.setScalar(0.8 + spherePhase * 2.8);
      sphereMat.opacity = (1 - spherePhase) * 0.85;

      // Circular energy wave spreads on touchdown (phaseProgress >= 0.42)
      if (phaseProgress >= 0.42) {
        const waveT = (phaseProgress - 0.42) / 0.58;
        waveRing.scale.setScalar(0.9 + waveT * 7.5);
        waveMat.opacity = (1 - waveT) * 0.9;
      } else {
        waveMat.opacity = 0;
      }

      orbitRings.forEach((ring, idx) => {
        ring.mat.opacity = fade * 0.82;
        ring.mesh.position.y = heroY + ring.baseYOffset * 0.8;
        ring.mesh.scale.setScalar(0.95 + (1 - fade) * 0.5);
        ring.mesh.rotation.z += delta * ring.speedY * 1.8;
        ring.mesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 2 + idx) * 0.25;
      });

      heroLight.intensity = 6.5 * fade;

      shards.forEach((sh) => {
        const mat = sh.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = fade;
        const bt = arrivalBurstTimer;
        sh.mesh.position.set(
          sh.burstVx * bt * 1.15,
          Math.max(0.15, heroY + 1.0 + sh.burstVy * bt - 2.6 * bt * bt),
          sh.burstVz * bt * 1.15
        );
        sh.mesh.rotation.y += delta * 6;
        sh.mesh.scale.setScalar(Math.max(0.05, fade));
      });
    }
  };

  const updateTunnel = (elapsed: number, delta: number, tunnelProgress: number) => {
    tunnelGroup.visible = true;
    const speed = 38 + Math.sin(tunnelProgress * Math.PI) * 26;

    warpGates.forEach((gate, idx) => {
      gate.position.z += speed * delta;
      if (gate.position.z > 6) {
        gate.position.z -= 16 * 6.5;
      }
      gate.rotation.z = elapsed * (idx % 2 === 0 ? 1.4 : -1.1) + idx * 0.4;
    });

    streamTubes.forEach((tube, idx) => {
      tube.rotation.z = elapsed * (idx % 2 === 0 ? 2.2 : -1.8);
    });

    const posAttr = streakGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      let z = arr[i * 3 + 2] + speed * 1.45 * delta;
      if (z > 4) z -= 98;
      arr[i * 3 + 2] = z;
    }
    posAttr.needsUpdate = true;
  };

  const hideAll = () => {
    auraGroup.visible = false;
    tunnelGroup.visible = false;
    heroLight.intensity = 0;
    arrivalBurstTimer = -1;
  };

  const dispose = () => {
    scene.remove(auraGroup);
    scene.remove(tunnelGroup);
    disposeObject3D(auraGroup);
    disposeObject3D(tunnelGroup);
    glowTex.dispose();
    sigilTex.dispose();
  };

  return {
    auraGroup,
    tunnelGroup,
    heroLight,
    resetArrivalBurst,
    updateAura,
    updateTunnel,
    hideAll,
    dispose,
  };
}

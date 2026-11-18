import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getHeroById } from '../data/missions.ts';
import type { HeroDefinition, HeroId, PlayerAnimationState } from '../types/game.ts';

export interface PlayableHeroRig {
  heroId: HeroId;
  root: THREE.Group;
  modelRoot: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  coatTail: THREE.Group;
  mixer?: THREE.AnimationMixer;
  actions?: Partial<Record<PlayerAnimationState, THREE.AnimationAction>>;
  isExternalGltf: boolean;
}

/**
 * Builds a realistic-proportioned (non-chibi, 7.5-head athletic explorer ratio)
 * articulated 3D human character rig for ARKA, NARA, ZAYAN, or MIKA.
 * Grounded cleanly at local y = 0 at the soles of the boots.
 */
export function buildProceduralHeroRig(heroId: HeroId): PlayableHeroRig {
  const hero: HeroDefinition = getHeroById(heroId);
  const root = new THREE.Group();
  const modelRoot = new THREE.Group();
  root.add(modelRoot);

  const isFemale = hero.id === 'nara' || hero.id === 'mika';

  const skinMat = new THREE.MeshStandardMaterial({
    color: hero.skinTone,
    roughness: 0.62,
    metalness: 0.04,
  });

  const primarySuitMat = new THREE.MeshStandardMaterial({
    color: hero.primaryColor,
    roughness: 0.42,
    metalness: 0.28,
  });

  const secondaryTrimMat = new THREE.MeshStandardMaterial({
    color: hero.secondaryColor,
    emissive: hero.secondaryColor,
    emissiveIntensity: 0.32,
    roughness: 0.25,
    metalness: 0.55,
  });

  const darkPantMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.72,
    metalness: 0.14,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: '#0D1322',
    roughness: 0.48,
    metalness: 0.35,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: hero.hairColor,
    roughness: 0.66,
    metalness: 0.12,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: '#94A3B8',
    roughness: 0.28,
    metalness: 0.78,
  });

  // Hips / Pelvis pivot at ~0.92m above ground
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  modelRoot.add(hips);

  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(isFemale ? 0.28 : 0.31, 0.14, 0.2),
    darkPantMat
  );
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Tactical utility belt with glowing buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.325, 0.05, 0.215), bootMat);
  belt.position.y = 0.055;
  hips.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.03), secondaryTrimMat);
  buckle.position.set(0, 0.055, 0.11);
  hips.add(buckle);

  // Coat tail / trench skirt for long sci-fi coat silhouette (inspired by reference)
  const coatTail = new THREE.Group();
  coatTail.position.set(0, 0.03, 0);
  hips.add(coatTail);
  if (hero.coatStyle === 'long_trench' || hero.coatStyle === 'cyber_blazer') {
    const coatBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, hero.coatStyle === 'long_trench' ? 0.48 : 0.32, 12, 1, true, Math.PI * 0.35, Math.PI * 1.3),
      new THREE.MeshStandardMaterial({
        color: hero.primaryColor,
        roughness: 0.48,
        metalness: 0.22,
        side: THREE.DoubleSide,
      })
    );
    coatBack.position.set(0, hero.coatStyle === 'long_trench' ? -0.22 : -0.14, -0.01);
    coatBack.castShadow = true;
    coatTail.add(coatBack);
  }

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.07;
  hips.add(torso);

  const chestWidth = isFemale ? 0.31 : 0.36;
  const waistWidth = isFemale ? 0.25 : 0.3;
  const chestMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(chestWidth * 0.56, waistWidth * 0.54, 0.44, 14),
    primarySuitMat
  );
  chestMesh.scale.set(1.08, 1, 0.68);
  chestMesh.position.y = 0.22;
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // High futuristic collar + glowing chest spine/trim
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.14, 0.1, 14, 1, true, -Math.PI * 0.72, Math.PI * 1.44),
    new THREE.MeshStandardMaterial({
      color: hero.primaryColor,
      roughness: 0.35,
      metalness: 0.3,
      side: THREE.DoubleSide,
    })
  );
  collar.position.set(0, 0.45, -0.01);
  collar.rotation.y = Math.PI;
  torso.add(collar);

  const chestStripLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.025), secondaryTrimMat);
  chestStripLeft.position.set(-0.07, 0.24, 0.12);
  chestStripLeft.rotation.z = 0.14;
  torso.add(chestStripLeft);

  const chestStripRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.025), secondaryTrimMat);
  chestStripRight.position.set(0.07, 0.24, 0.12);
  chestStripRight.rotation.z = -0.14;
  torso.add(chestStripRight);

  // Back comms pack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.07), bootMat);
  pack.position.set(0, 0.26, -0.13);
  pack.castShadow = true;
  torso.add(pack);
  const packCore = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.02), secondaryTrimMat);
  packCore.position.set(0, 0.26, -0.165);
  torso.add(packCore);

  // Neck + Realistic Proportioned Head (head ~0.23m tall on ~1.72m character -> ~7.5 heads)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.1, 12), skinMat);
  neck.position.y = 0.47;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.57;
  torso.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.108, 18, 16), skinMat);
  cranium.scale.set(0.92, 1.08, 0.98);
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.075, 0.13), skinMat);
  jaw.position.set(0, -0.052, 0.015);
  head.add(jaw);

  // Subtle realistic eyes + brows
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const irisMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  [-0.036, 0.036].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), eyeWhiteMat);
    eye.position.set(ex, 0.008, 0.095);
    eye.scale.set(1.1, 0.75, 0.6);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), irisMat);
    pupil.position.set(ex, 0.008, 0.102);
    head.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.01), hairMat);
    brow.position.set(ex, 0.03, 0.099);
    head.add(brow);
  });

  // Tactical comms earpiece on right ear
  const earpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 10), secondaryTrimMat);
  earpiece.rotation.z = Math.PI / 2;
  earpiece.position.set(0.102, -0.005, 0.01);
  head.add(earpiece);

  // Distinct hairstyles for ARKA, NARA, ZAYAN, MIKA
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.114, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.scale.set(0.95, 1.06, 1.02);
  hairCap.position.y = 0.012;
  hairCap.castShadow = true;
  head.add(hairCap);

  if (hero.hairVariant === 'short_taper') {
    // ARKA: Short crisp dark hair with slight front sweep
    const frontSweep = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.06), hairMat);
    frontSweep.position.set(0.01, 0.088, 0.062);
    frontSweep.rotation.set(0.25, 0, -0.12);
    head.add(frontSweep);
    const backFade = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.07), hairMat);
    backFade.position.set(0, 0.01, -0.075);
    head.add(backFade);
  } else if (hero.hairVariant === 'ponytail') {
    // NARA: Sleek hair with high athletic ponytail at back
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 12), hairMat);
    backHair.position.set(0, 0.01, -0.03);
    head.add(backHair);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 8, 14), secondaryTrimMat);
    tie.position.set(0, 0.04, -0.115);
    tie.rotation.x = Math.PI / 4;
    head.add(tie);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.24, 12), hairMat);
    tail.position.set(0, -0.06, -0.165);
    tail.rotation.x = -0.38;
    tail.castShadow = true;
    head.add(tail);
  } else if (hero.hairVariant === 'wavy_textured') {
    // ZAYAN: Wavy textured dark hair
    [-0.055, 0, 0.055].forEach((ox, idx) => {
      const wave = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), hairMat);
      wave.scale.set(1.0, 0.85, 1.3);
      wave.position.set(ox, 0.105 + (idx === 1 ? 0.012 : 0), 0.035);
      head.add(wave);
    });
    const backWave = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.08), hairMat);
    backWave.position.set(0, 0.005, -0.075);
    head.add(backWave);
  } else {
    // MIKA: Smooth shoulder-length dark hair
    const leftCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.22, 0.12), hairMat);
    leftCurtain.position.set(-0.095, -0.04, -0.015);
    leftCurtain.rotation.z = 0.08;
    head.add(leftCurtain);
    const rightCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.22, 0.12), hairMat);
    rightCurtain.position.set(0.095, -0.04, -0.015);
    rightCurtain.rotation.z = -0.08;
    head.add(rightCurtain);
    const backSheet = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.06), hairMat);
    backSheet.position.set(0, -0.045, -0.09);
    backSheet.castShadow = true;
    head.add(backSheet);
  }

  // Arms (Shoulder -> Upper Arm -> Elbow Forearm -> Glove)
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * (isFemale ? 0.205 : 0.23), 0.39, 0);
    torso.add(shoulder);

    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), primarySuitMat);
    pauldron.scale.set(1.05, 0.9, 1.0);
    shoulder.add(pauldron);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.24, 10), primarySuitMat);
    upperArm.position.y = -0.13;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Group();
    forearm.position.y = -0.26;
    shoulder.add(forearm);

    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.033, 0.22, 10), primarySuitMat);
    lowerArm.position.y = -0.11;
    lowerArm.castShadow = true;
    forearm.add(lowerArm);

    // Holo-bracer on left forearm
    if (side === -1) {
      const bracer = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.075, 0.088), secondaryTrimMat);
      bracer.position.y = -0.14;
      forearm.add(bracer);
    }

    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.08, 0.068), bootMat);
    glove.position.y = -0.24;
    forearm.add(glove);

    return { shoulder, forearm };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Legs (Hip -> Thigh -> Knee -> Shin -> Boot, total length = 0.92m so boots touch y = 0)
  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * (isFemale ? 0.095 : 0.108), -0.02, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(isFemale ? 0.066 : 0.072, 0.056, 0.42, 12),
      darkPantMat
    );
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);

    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.05), metalMat);
    kneePad.position.set(0, 0, 0.045);
    knee.add(kneePad);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.044, 0.32, 12), bootMat);
    shin.position.y = -0.17;
    shin.castShadow = true;
    knee.add(shin);

    const bootTrim = new THREE.Mesh(new THREE.TorusGeometry(0.051, 0.008, 6, 14), secondaryTrimMat);
    bootTrim.rotation.x = Math.PI / 2;
    bootTrim.position.y = -0.12;
    knee.add(bootTrim);

    const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.095, 0.21), bootMat);
    bootFoot.position.set(0, -0.41, 0.045);
    bootFoot.castShadow = true;
    knee.add(bootFoot);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    heroId: hero.id,
    root,
    modelRoot,
    hips,
    torso,
    head,
    leftShoulder: leftArm.shoulder,
    rightShoulder: rightArm.shoulder,
    leftForearm: leftArm.forearm,
    rightForearm: rightArm.forearm,
    leftHip: leftLeg.hip,
    rightHip: rightLeg.hip,
    leftKnee: leftLeg.knee,
    rightKnee: rightLeg.knee,
    coatTail,
    isExternalGltf: false,
  };
}

/**
 * Replaceable GLTF/GLB Asset Loader:
 * Attempts to load `/assets/models/${heroId}.glb` if a real rigged GLB exists.
 * Otherwise resolves immediately to the procedural articulated human rig.
 */
export async function loadPlayableHeroRig(heroId: HeroId): Promise<PlayableHeroRig> {
  const hero = getHeroById(heroId);
  try {
    const headRes = await fetch(hero.modelAssetPath, { method: 'HEAD' });
    const contentType = headRes.headers.get('content-type') || '';
    if (headRes.ok && (contentType.includes('model') || contentType.includes('octet-stream'))) {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(hero.modelAssetPath);
      const fallback = buildProceduralHeroRig(heroId);
      fallback.root.clear();
      const modelRoot = new THREE.Group();
      modelRoot.add(gltf.scene);
      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      fallback.root.add(modelRoot);
      fallback.modelRoot = modelRoot;
      fallback.isExternalGltf = true;
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(gltf.scene);
        fallback.mixer = mixer;
        fallback.actions = {};
        for (const clip of gltf.animations) {
          const lower = clip.name.toLowerCase();
          if (lower.includes('idle')) fallback.actions.idle = mixer.clipAction(clip);
          else if (lower.includes('walk')) fallback.actions.walk = mixer.clipAction(clip);
          else if (lower.includes('run')) fallback.actions.run = mixer.clipAction(clip);
          else if (lower.includes('jump')) fallback.actions.jump = mixer.clipAction(clip);
          else if (lower.includes('interact')) fallback.actions.interact = mixer.clipAction(clip);
          else if (lower.includes('win') || lower.includes('victory')) {
            fallback.actions.victory = mixer.clipAction(clip);
          }
        }
        fallback.actions.idle?.play();
      }
      return fallback;
    }
  } catch {
    // Expected when external GLB assets are not yet supplied — fallback cleanly
  }

  return buildProceduralHeroRig(heroId);
}

/**
 * Smoothly animates the playable character across idle, walk, run, jump, interact, and victory states.
 */
export function updateHeroAnimation(
  rig: PlayableHeroRig,
  state: PlayerAnimationState,
  elapsed: number,
  delta: number
): void {
  if (rig.isExternalGltf && rig.mixer) {
    rig.mixer.update(delta);
    return;
  }

  const dampRate = Math.min(1, delta * 12);
  const lerpAngle = (current: number, target: number) =>
    current + (target - current) * dampRate;

  let tHipsY = 0.92;
  let tTorsoX = 0;
  let tTorsoY = 0;
  let tHeadY = 0;
  let tLShoulderX = 0;
  let tRShoulderX = 0;
  let tLShoulderZ = 0.08;
  let tRShoulderZ = -0.08;
  let tLForearmX = -0.22;
  let tRForearmX = -0.22;
  let tLHipX = 0;
  let tRHipX = 0;
  let tLKneeX = 0.04;
  let tRKneeX = 0.04;
  let tCoatX = 0;

  if (state === 'idle') {
    const breath = Math.sin(elapsed * 2.1);
    tHipsY = 0.92 + breath * 0.012;
    tTorsoX = breath * 0.02;
    tHeadY = Math.sin(elapsed * 0.8) * 0.08;
    tLShoulderZ = 0.09 + breath * 0.015;
    tRShoulderZ = -0.09 - breath * 0.015;
    tLForearmX = -0.2;
    tRForearmX = -0.2;
  } else if (state === 'walk' || state === 'run') {
    const speed = state === 'run' ? 11.5 : 7.2;
    const amp = state === 'run' ? 0.72 : 0.44;
    const stride = Math.sin(elapsed * speed);
    const bounce = Math.abs(Math.cos(elapsed * speed));
    tHipsY = 0.92 + bounce * (state === 'run' ? 0.065 : 0.032);
    tTorsoX = state === 'run' ? 0.18 : 0.07;
    tTorsoY = stride * 0.07;
    tLHipX = stride * amp;
    tRHipX = -stride * amp;
    tLKneeX = Math.max(0.05, -stride * amp * 0.85 + 0.18);
    tRKneeX = Math.max(0.05, stride * amp * 0.85 + 0.18);
    tLShoulderX = -stride * amp * 0.75;
    tRShoulderX = stride * amp * 0.75;
    tLForearmX = state === 'run' ? -0.95 : -0.45;
    tRForearmX = state === 'run' ? -0.95 : -0.45;
    tCoatX = state === 'run' ? 0.34 : 0.15;
  } else if (state === 'jump') {
    tHipsY = 0.95;
    tTorsoX = -0.08;
    tLHipX = -0.45;
    tRHipX = 0.25;
    tLKneeX = 0.65;
    tRKneeX = 0.35;
    tLShoulderX = -0.9;
    tRShoulderX = -0.9;
    tLShoulderZ = 0.42;
    tRShoulderZ = -0.42;
    tCoatX = 0.32;
  } else if (state === 'landing') {
    tHipsY = 0.84;
    tTorsoX = 0.16;
    tLHipX = -0.28;
    tRHipX = -0.24;
    tLKneeX = 0.56;
    tRKneeX = 0.52;
    tLShoulderX = 0.18;
    tRShoulderX = 0.18;
    tLShoulderZ = 0.24;
    tRShoulderZ = -0.24;
    tLForearmX = -0.55;
    tRForearmX = -0.55;
    tCoatX = 0.2;
  } else if (state === 'ascend') {
    const hoverFloat = Math.sin(elapsed * 4.5) * 0.05;
    tHipsY = 0.94 + hoverFloat;
    tTorsoX = -0.14;
    tHeadY = Math.sin(elapsed * 1.4) * 0.06;
    tLHipX = -0.18;
    tRHipX = 0.14;
    tLKneeX = 0.28;
    tRKneeX = 0.18;
    tLShoulderX = -0.58;
    tRShoulderX = -0.58;
    tLShoulderZ = 0.56 + Math.sin(elapsed * 4) * 0.05;
    tRShoulderZ = -0.56 - Math.sin(elapsed * 4) * 0.05;
    tLForearmX = -0.35;
    tRForearmX = -0.35;
    tCoatX = 0.28 + Math.sin(elapsed * 7.5) * 0.07;
  } else if (state === 'interact') {
    const reach = Math.sin(elapsed * 6) * 0.12;
    tTorsoY = -0.18;
    tLShoulderX = -0.95 + reach;
    tLForearmX = -0.55;
    tRShoulderX = -0.25;
    tRForearmX = -0.35;
  } else if (state === 'victory') {
    const cheer = Math.sin(elapsed * 5.2) * 0.16;
    tHipsY = 0.94 + Math.abs(Math.sin(elapsed * 3.8)) * 0.06;
    tLShoulderX = -2.4 + cheer;
    tRShoulderX = -2.4 - cheer;
    tLShoulderZ = 0.45;
    tRShoulderZ = -0.45;
    tLForearmX = -0.2;
    tRForearmX = -0.2;
  }

  rig.hips.position.y = lerpAngle(rig.hips.position.y, tHipsY);
  rig.torso.rotation.x = lerpAngle(rig.torso.rotation.x, tTorsoX);
  rig.torso.rotation.y = lerpAngle(rig.torso.rotation.y, tTorsoY);
  rig.head.rotation.y = lerpAngle(rig.head.rotation.y, tHeadY);
  rig.leftShoulder.rotation.x = lerpAngle(rig.leftShoulder.rotation.x, tLShoulderX);
  rig.rightShoulder.rotation.x = lerpAngle(rig.rightShoulder.rotation.x, tRShoulderX);
  rig.leftShoulder.rotation.z = lerpAngle(rig.leftShoulder.rotation.z, tLShoulderZ);
  rig.rightShoulder.rotation.z = lerpAngle(rig.rightShoulder.rotation.z, tRShoulderZ);
  rig.leftForearm.rotation.x = lerpAngle(rig.leftForearm.rotation.x, tLForearmX);
  rig.rightForearm.rotation.x = lerpAngle(rig.rightForearm.rotation.x, tRForearmX);
  rig.leftHip.rotation.x = lerpAngle(rig.leftHip.rotation.x, tLHipX);
  rig.rightHip.rotation.x = lerpAngle(rig.rightHip.rotation.x, tRHipX);
  rig.leftKnee.rotation.x = lerpAngle(rig.leftKnee.rotation.x, tLKneeX);
  rig.rightKnee.rotation.x = lerpAngle(rig.rightKnee.rotation.x, tRKneeX);
  rig.coatTail.rotation.x = lerpAngle(rig.coatTail.rotation.x, tCoatX);
}

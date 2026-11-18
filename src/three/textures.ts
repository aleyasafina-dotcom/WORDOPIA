import * as THREE from 'three';
import type { RoboMood } from '../types/game.ts';

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(8, 16, 36, 0.72)');
  grad.addColorStop(0.55, 'rgba(8, 16, 36, 0.28)');
  grad.addColorStop(1, 'rgba(8, 16, 36, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHoloPlatformTexture(accentHex = '#00C8F0'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#101C35';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Radial glow
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 250);
  glow.addColorStop(0, 'rgba(0, 200, 240, 0.35)');
  glow.addColorStop(0.6, 'rgba(123, 97, 255, 0.14)');
  glow.addColorStop(1, 'rgba(16, 28, 53, 0.95)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 512);

  // Concentric rings
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  [90, 145, 200, 236].forEach((r, idx) => {
    ctx.globalAlpha = idx === 3 ? 0.85 : 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Segmented ticks
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 4;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = i % 3 === 0 ? 185 : 194;
    const r2 = 212;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSkyDomeTexture(stormIntensity = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (stormIntensity > 0.5) {
    grad.addColorStop(0, '#101C35');
    grad.addColorStop(0.45, '#2B255E');
    grad.addColorStop(0.75, '#1B3A6B');
    grad.addColorStop(1, '#0F2547');
  } else {
    grad.addColorStop(0, '#0C3570');
    grad.addColorStop(0.38, '#1975C8');
    grad.addColorStop(0.72, '#4CC9F0');
    grad.addColorStop(1, '#BCEEFF');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft aurora ribbons
  ctx.globalAlpha = 0.25;
  const aurora = ctx.createLinearGradient(0, 90, 512, 220);
  aurora.addColorStop(0, '#00C8F0');
  aurora.addColorStop(0.5, '#A5F05A');
  aurora.addColorStop(1, '#7B61FF');
  ctx.fillStyle = aurora;
  ctx.beginPath();
  ctx.moveTo(0, 140);
  ctx.bezierCurveTo(150, 80, 340, 210, 512, 120);
  ctx.lineTo(512, 185);
  ctx.bezierCurveTo(340, 260, 150, 130, 0, 195);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function drawRoboFaceCanvas(canvas: HTMLCanvasElement, mood: RoboMood): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0A162D';
  ctx.fillRect(0, 0, w, h);

  // Subtle visor scanline glow
  const bgGlow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.55);
  const accent =
    mood === 'amaran'
      ? '#FFB547'
      : mood === 'bangga' || mood === 'teruja'
      ? '#A5F05A'
      : '#00C8F0';
  bgGlow.addColorStop(0, `${accent}33`);
  bgGlow.addColorStop(1, 'rgba(10, 22, 45, 0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';

  const leftX = w * 0.34;
  const rightX = w * 0.66;
  const eyeY = h * 0.44;

  if (mood === 'bangga' || mood === 'teruja') {
    // Happy curved eyes ^_^
    [leftX, rightX].forEach((ex) => {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 8, 22, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    });
  } else if (mood === 'amaran') {
    // Alert determined eyes
    [leftX, rightX].forEach((ex, i) => {
      ctx.beginPath();
      ctx.arc(ex, eyeY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ex - 20, eyeY - 24 + (i === 0 ? 0 : 8));
      ctx.lineTo(ex + 20, eyeY - 24 + (i === 0 ? 8 : 0));
      ctx.stroke();
    });
  } else if (mood === 'berfikir') {
    // One big eye, one squinting
    ctx.beginPath();
    ctx.arc(leftX, eyeY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(rightX - 18, eyeY - 5, 36, 10, 5);
    ctx.fill();
  } else {
    // Friendly glowing eyes with cute highlight
    [leftX, rightX].forEach((ex) => {
      ctx.beginPath();
      ctx.roundRect(ex - 16, eyeY - 22, 32, 44, 16);
      ctx.fill();
      ctx.fillStyle = '#F4F8FF';
      ctx.beginPath();
      ctx.arc(ex - 5, eyeY - 9, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
    });
  }

  // Cute digital mouth
  ctx.beginPath();
  if (mood === 'amaran') {
    ctx.arc(w / 2, h * 0.72, 18, Math.PI * 1.15, Math.PI * 1.85);
  } else if (mood === 'berfikir') {
    ctx.moveTo(w / 2 - 16, h * 0.68);
    ctx.lineTo(w / 2 + 16, h * 0.65);
  } else {
    ctx.arc(w / 2, h * 0.63, 20, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
}

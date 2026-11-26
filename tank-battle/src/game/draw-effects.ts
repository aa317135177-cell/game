import { BULLET_SIZE, POWER_UP_BLINK_MS, TANK_SIZE } from './constants';
import { drawStar, roundRect, seededRandom, TAU } from './draw-shapes';
import type { Bullet, Explosion, PowerUp, PowerUpKind } from './types';

const ICON_GOLD = '#e8c547';
const ICON_DARK = '#1d1a12';

export function drawPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUp, clock: number): void {
  const remaining = powerUp.expiresAt - clock;
  if (remaining < POWER_UP_BLINK_MS && Math.floor(clock / 120) % 2 === 0) {
    return;
  }
  const bob = Math.sin(clock / 180) * 1.2;
  drawPowerUpIcon(ctx, powerUp.kind, powerUp.x + TANK_SIZE / 2, powerUp.y + TANK_SIZE / 2 + bob, TANK_SIZE);
}

export function drawPowerUpIcon(
  ctx: CanvasRenderingContext2D,
  kind: PowerUpKind,
  centerX: number,
  centerY: number,
  size: number,
): void {
  const scale = size / TANK_SIZE;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  roundRect(ctx, -13, -13, 26, 26, 4);
  ctx.fillStyle = ICON_DARK;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ICON_GOLD;
  ctx.stroke();
  if (kind === 'star') {
    ctx.fillStyle = ICON_GOLD;
    drawStar(ctx, 0, 1, 9);
  } else if (kind === 'maxStar') {
    ctx.fillStyle = '#fff2ab';
    drawStar(ctx, 0, -4, 6);
    ctx.fillStyle = ICON_GOLD;
    drawStar(ctx, -6, 5, 5);
    drawStar(ctx, 6, 5, 5);
  } else if (kind === 'shovel') {
    drawShovel(ctx);
  } else if (kind === 'bomb') {
    drawBomb(ctx);
  } else if (kind === 'helmet') {
    drawHelmet(ctx);
  } else {
    drawMiniTank(ctx);
  }
  ctx.restore();
}

function drawShovel(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#b07a3a';
  ctx.fillRect(-1.5, -10, 3, 12);
  ctx.fillStyle = '#d9d2bf';
  ctx.fillRect(-4, -11, 8, 2.5);
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.lineTo(5, 2);
  ctx.lineTo(4, 8);
  ctx.lineTo(0, 11);
  ctx.lineTo(-4, 8);
  ctx.closePath();
  ctx.fillStyle = '#c5cbd3';
  ctx.fill();
  ctx.restore();
}

function drawBomb(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.arc(-1, 2, 7.5, 0, TAU);
  ctx.fillStyle = '#2b2b2b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-3.5, -0.5, 2.2, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(2.5, -7, 4, 3.5);
  ctx.strokeStyle = '#c9a133';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(5, -7);
  ctx.quadraticCurveTo(8, -11, 9, -8);
  ctx.stroke();
  ctx.fillStyle = '#ff9b2e';
  ctx.beginPath();
  ctx.arc(9, -8.5, 1.8, 0, TAU);
  ctx.fill();
}

function drawHelmet(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-9, 5);
  ctx.quadraticCurveTo(-9, -8, 0, -8);
  ctx.quadraticCurveTo(9, -8, 9, 5);
  ctx.closePath();
  ctx.fillStyle = '#6f8a4a';
  ctx.fill();
  ctx.fillStyle = '#9bb56d';
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.quadraticCurveTo(-5, -6, 0, -6);
  ctx.lineTo(0, -3);
  ctx.quadraticCurveTo(-4, -3, -6, -2);
  ctx.fill();
  ctx.fillStyle = '#4f6b38';
  ctx.fillRect(-11, 4, 22, 3.5);
}

function drawMiniTank(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#4d4218';
  ctx.fillRect(-9, -7, 4, 15);
  ctx.fillRect(5, -7, 4, 15);
  ctx.fillStyle = '#e2b83a';
  ctx.fillRect(-5, -5, 10, 11);
  ctx.beginPath();
  ctx.arc(0, 1, 3.6, 0, TAU);
  ctx.fillStyle = '#f0c94d';
  ctx.fill();
  ctx.fillStyle = '#c9a133';
  ctx.fillRect(-1.2, -11, 2.4, 9);
}

const SHELL_COLORS = ['#ffd36b', '#ffb14b', '#72e5ff', '#ff634c'] as const;

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  const x = bullet.x + BULLET_SIZE / 2;
  const y = bullet.y + BULLET_SIZE / 2;
  if (bullet.firePower === 0) {
    ctx.fillStyle = bullet.faction === 'player' ? '#ffe08a' : '#f0f0f0';
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, TAU);
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bullet.dir * Math.PI / 2);
  ctx.fillStyle = SHELL_COLORS[bullet.firePower];
  if (bullet.firePower === 2) {
    // 两道凝聚的曳光共用一个弹头和一处命中点。
    drawTracer(ctx, -1.8, 1.4, 11);
    drawTracer(ctx, 1.8, 1.4, 11);
  } else {
    const heavy = bullet.firePower === 3;
    drawTracer(ctx, 0, heavy ? 3.7 : 2, heavy ? 17 : 8);
  }
  const halfWidth = 1.5 + bullet.firePower * 0.55;
  ctx.beginPath();
  ctx.moveTo(0, -3.8);
  ctx.quadraticCurveTo(halfWidth, -1.8, halfWidth, 2.7);
  ctx.lineTo(-halfWidth, 2.7);
  ctx.quadraticCurveTo(-halfWidth, -1.8, 0, -3.8);
  ctx.fill();
  ctx.fillStyle = '#fff5d8';
  ctx.fillRect(-0.85, -2.8, 1.7, 4.7);
  ctx.restore();
}

function drawTracer(ctx: CanvasRenderingContext2D, x: number, halfWidth: number, length: number): void {
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(x - halfWidth, 1);
  ctx.lineTo(x, length);
  ctx.lineTo(x + halfWidth, 1);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion): void {
  const progress = Math.min(1, explosion.age / explosion.maxAge);
  if (explosion.kind === 'score') {
    drawScorePopup(ctx, explosion, progress);
    return;
  }
  const random = seededRandom(explosion.seed);
  if (explosion.kind === 'small') {
    drawSmallBlast(ctx, explosion, progress, random);
    return;
  }
  drawBigBlast(ctx, explosion, progress, random);
}

function drawSmallBlast(
  ctx: CanvasRenderingContext2D,
  explosion: Explosion,
  progress: number,
  random: () => number,
): void {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, explosion.size * 0.45 * (1 - progress * 0.6), 0, TAU);
  ctx.fill();
  ctx.strokeStyle = explosion.firePower ? SHELL_COLORS[explosion.firePower] : '#ff9b2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, explosion.size * (0.4 + progress * 0.8), 0, TAU);
  ctx.stroke();
  drawSparks(ctx, explosion, progress, random, 5 + explosion.firePower * 2, SHELL_COLORS[explosion.firePower]);
  ctx.restore();
}

function drawBigBlast(
  ctx: CanvasRenderingContext2D,
  explosion: Explosion,
  progress: number,
  random: () => number,
): void {
  ctx.save();
  for (let index = 0; index < 6; index += 1) {
    const angle = random() * TAU;
    const distance = explosion.size * (0.3 + random() * 0.6) * progress;
    const radius = explosion.size * (0.3 + random() * 0.25) * (0.6 + progress);
    ctx.globalAlpha = Math.max(0, 0.45 * (1 - progress));
    ctx.fillStyle = '#4a4238';
    ctx.beginPath();
    ctx.arc(
      explosion.x + Math.cos(angle) * distance,
      explosion.y + Math.sin(angle) * distance - progress * 8,
      radius,
      0,
      TAU,
    );
    ctx.fill();
  }

  const fireRadius = explosion.size * (0.5 + progress * 0.7);
  const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, fireRadius);
  gradient.addColorStop(0, `rgba(255, 250, 220, ${1 - progress})`);
  gradient.addColorStop(0.4, `rgba(255, 190, 70, ${0.9 * (1 - progress)})`);
  gradient.addColorStop(1, 'rgba(220, 60, 20, 0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, fireRadius, 0, TAU);
  ctx.fill();

  if (progress < 0.18) {
    ctx.globalAlpha = 1 - progress / 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.size * 0.55, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawSparks(ctx, explosion, progress, random, 10 + explosion.firePower * 2, explosion.firePower ? SHELL_COLORS[explosion.firePower] : '#ffcf5a');
  ctx.restore();
}

function drawSparks(
  ctx: CanvasRenderingContext2D,
  explosion: Explosion,
  progress: number,
  random: () => number,
  count: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = Math.max(0, 1 - progress);
  for (let index = 0; index < count; index += 1) {
    const angle = random() * TAU;
    const speed = 0.6 + random() * 0.8;
    const inner = explosion.size * progress * speed;
    const outer = inner + 3 + random() * 3;
    ctx.beginPath();
    ctx.moveTo(explosion.x + Math.cos(angle) * inner, explosion.y + Math.sin(angle) * inner);
    ctx.lineTo(explosion.x + Math.cos(angle) * outer, explosion.y + Math.sin(angle) * outer);
    ctx.stroke();
  }
}

function drawScorePopup(ctx: CanvasRenderingContext2D, explosion: Explosion, progress: number): void {
  ctx.save();
  ctx.globalAlpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  ctx.font = 'bold 11px "Avenir Next", "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const y = explosion.y - progress * 14;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20, 18, 12, 0.85)';
  ctx.strokeText(explosion.label, explosion.x, y);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(explosion.label, explosion.x, y);
  ctx.restore();
}

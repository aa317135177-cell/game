import { TANK_SIZE } from './constants';
import { drawStar, roundRect, TAU } from './draw-shapes';
import {
  drawGoldTrim,
  drawGun,
  drawMissilePods,
  drawReactivePlates,
  drawTrackSkirts,
  drawTurretGoldRing,
  UPGRADE_GOLD,
} from './draw-tank-upgrades';
import type { Tank } from './types';

export interface TankPalette {
  track: string;
  pad: string;
  wheel: string;
  hull: string;
  hullDark: string;
  hullLight: string;
  turret: string;
  barrel: string;
  sleeve: string;
  metal: string;
  accent: string;
}

const BONUS_FLASH_MS = 160;

export function drawTank(ctx: CanvasRenderingContext2D, tank: Tank, clock: number): void {
  ctx.save();
  ctx.translate(tank.x + TANK_SIZE / 2, tank.y + TANK_SIZE / 2);
  ctx.save();
  ctx.rotate((tank.dir * Math.PI) / 2);
  const palette = getPalette(tank, clock);
  drawTracks(ctx, tank.trackPhase, palette);
  if (tank.firePower >= 1) {
    drawTrackSkirts(ctx, palette);
  }
  drawHull(ctx, tank, palette);
  if (tank.firePower >= 2) {
    drawReactivePlates(ctx, palette);
  }
  if (tank.firePower >= 3) {
    drawGoldTrim(ctx);
    drawMissilePods(ctx, palette);
  }
  drawTurret(ctx, tank, palette);
  ctx.restore();
  if (tank.invincibleUntil > clock) {
    drawShield(ctx, clock, tank.invincibleUntil - clock);
  }
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, clock: number, remaining: number): void {
  if (remaining < 1000 && Math.floor(clock / 90) % 2 === 0) {
    return;
  }
  const pulse = (Math.sin(clock / 90) + 1) / 2;
  ctx.save();
  ctx.rotate(clock / 260);
  ctx.strokeStyle = `rgba(150, 220, 255, ${0.55 + pulse * 0.35})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, TANK_SIZE / 2 + 3, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(150, 220, 255, ${0.08 + pulse * 0.08})`;
  ctx.fill();
  ctx.restore();
}

function drawTracks(ctx: CanvasRenderingContext2D, trackPhase: number, palette: TankPalette): void {
  drawTrack(ctx, -13.5, trackPhase, palette);
  drawTrack(ctx, 7.5, trackPhase, palette);
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  x: number,
  trackPhase: number,
  palette: TankPalette,
): void {
  const width = 6;
  const height = 26;
  const y = -13;
  roundRect(ctx, x, y, width, height, 2);
  ctx.fillStyle = palette.track;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 0.6, y + 1.2, width - 1.2, height - 2.4);
  ctx.clip();
  const step = 3.4;
  const shift = ((trackPhase % step) + step) % step;
  for (let padY = y - step + shift; padY < y + height; padY += step) {
    ctx.fillStyle = palette.pad;
    ctx.fillRect(x + 1, padY, width - 2, 2.1);
    ctx.fillStyle = palette.hullLight;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x + 1, padY, width - 2, 0.7);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  for (let index = 0; index < 4; index += 1) {
    const wheelY = -8.2 + index * 5.4;
    ctx.beginPath();
    ctx.arc(x + width / 2, wheelY, 1.7, 0, TAU);
    ctx.fillStyle = palette.wheel;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width / 2, wheelY, 0.6, 0, TAU);
    ctx.fillStyle = palette.metal;
    ctx.fill();
  }
}

function drawHull(ctx: CanvasRenderingContext2D, tank: Tank, palette: TankPalette): void {
  roundRect(ctx, -8.2, -10.5, 16.4, 21, 2.4);
  ctx.fillStyle = palette.hullDark;
  ctx.fill();
  roundRect(ctx, -7.2, -9.4, 14.4, 18.6, 1.8);
  ctx.fillStyle = palette.hull;
  ctx.fill();
  ctx.fillStyle = palette.hullLight;
  ctx.beginPath();
  ctx.moveTo(-6.4, -9);
  ctx.lineTo(6.4, -9);
  ctx.lineTo(5.2, -5.6);
  ctx.lineTo(-5.2, -5.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.hullDark;
  ctx.fillRect(-5.6, 5.6, 11.2, 4.4);
  ctx.fillStyle = palette.metal;
  for (let index = 0; index < 3; index += 1) {
    ctx.fillRect(-4.4 + index * 3.4, 6.3, 2.4, 2.8);
  }
  if (tank.kind === 'armor') {
    ctx.strokeStyle = palette.hullLight;
    ctx.lineWidth = 1;
    ctx.strokeRect(-6.6, -7.2, 13.2, 13.6);
  }
}

function drawTurret(ctx: CanvasRenderingContext2D, tank: Tank, palette: TankPalette): void {
  const radius = tank.firePower >= 2 ? 5.8 : 5.2;
  ctx.beginPath();
  ctx.arc(0, 0.6, radius + 1, 0, TAU);
  ctx.fillStyle = palette.hullDark;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0.2, radius, 0, TAU);
  ctx.fillStyle = palette.turret;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-1.2, -1, 2.1, 0, TAU);
  ctx.fillStyle = palette.hullLight;
  ctx.fill();
  if (tank.firePower >= 3) {
    drawTurretGoldRing(ctx, radius);
  }

  const recoil = Math.min(1, Math.max(0, tank.barrelRecoil));
  drawGun(ctx, palette, tank.firePower, recoil);

  if (tank.faction === 'player') {
    const goldStar = tank.firePower >= 3;
    ctx.fillStyle = goldStar ? UPGRADE_GOLD : palette.accent;
    drawStar(ctx, 1.4, 1.6, goldStar ? 2.5 : 2.1);
    if (goldStar) {
      ctx.strokeStyle = palette.hullDark;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(0.6, 1.2, 2.2, 2.2);
  }
}

function getPalette(tank: Tank, clock: number): TankPalette {
  if (tank.bonus && Math.floor(clock / BONUS_FLASH_MS) % 2 === 0) {
    return {
      track: '#4a1414',
      pad: '#2a0a0a',
      wheel: '#1a0606',
      hull: '#d9443b',
      hullDark: '#8a1f1c',
      hullLight: '#f39a8a',
      turret: '#e0574d',
      barrel: '#b8302a',
      sleeve: '#7a1d18',
      metal: '#f0d2cc',
      accent: '#ffe08a',
    };
  }
  if (tank.faction === 'player') {
    return {
      track: '#4d4218',
      pad: '#2d2710',
      wheel: '#1f1a0c',
      hull: '#e2b83a',
      hullDark: '#9a7420',
      hullLight: '#ffe08a',
      turret: '#f0c94d',
      barrel: '#c9a133',
      sleeve: '#8b6a1d',
      metal: '#d8d0b4',
      accent: '#c62828',
    };
  }
  if (tank.kind === 'fast') {
    return {
      track: '#4a2412',
      pad: '#2a140a',
      wheel: '#1a0d07',
      hull: '#d9753b',
      hullDark: '#8a3f1c',
      hullLight: '#f3b07a',
      turret: '#e0894d',
      barrel: '#b85a28',
      sleeve: '#7a3b18',
      metal: '#d7c4b4',
      accent: '#5c1d0c',
    };
  }
  if (tank.kind === 'armor') {
    const cracked = tank.hp < tank.maxHp;
    return {
      track: '#24301e',
      pad: '#141a10',
      wheel: '#0e120b',
      hull: cracked ? '#6f8a4a' : '#4f6b38',
      hullDark: '#2f3f22',
      hullLight: '#9bb56d',
      turret: cracked ? '#7d9a56' : '#5b7a40',
      barrel: '#3d5229',
      sleeve: '#2a381d',
      metal: '#c5d0b6',
      accent: '#d9e8c8',
    };
  }
  return {
    track: '#2d3036',
    pad: '#16181c',
    wheel: '#0f1114',
    hull: '#c5c9ce',
    hullDark: '#6f747c',
    hullLight: '#eef1f4',
    turret: '#d5d9de',
    barrel: '#9aa0a8',
    sleeve: '#5d636b',
    metal: '#ececec',
    accent: '#8b1e1e',
  };
}

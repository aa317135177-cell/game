import { TANK_SIZE } from './constants';
import type { Tank } from './types';

interface TankPalette {
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

export function drawTank(ctx: CanvasRenderingContext2D, tank: Tank, now: number): void {
  const blinking = tank.invincibleUntil > now && Math.floor(now / 80) % 2 === 0;
  ctx.save();
  if (blinking) {
    ctx.globalAlpha = 0.45;
  }
  ctx.translate(tank.x + TANK_SIZE / 2, tank.y + TANK_SIZE / 2);
  ctx.rotate((tank.dir * Math.PI) / 2);
  const palette = getPalette(tank);
  drawTracks(ctx, tank.trackPhase, palette);
  drawHull(ctx, tank, palette);
  drawTurret(ctx, tank, palette);
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
    ctx.arc(x + width / 2, wheelY, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = palette.wheel;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width / 2, wheelY, 0.6, 0, Math.PI * 2);
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
  ctx.beginPath();
  ctx.arc(0, 0.6, 6.2, 0, Math.PI * 2);
  ctx.fillStyle = palette.hullDark;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0.2, 5.2, 0, Math.PI * 2);
  ctx.fillStyle = palette.turret;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-1.2, -1, 2.1, 0, Math.PI * 2);
  ctx.fillStyle = palette.hullLight;
  ctx.fill();

  const recoil = Math.min(1, Math.max(0, tank.barrelRecoil));
  const sleeveLength = 6.2;
  const barrelLength = 8.4 - recoil * 5.4;
  ctx.fillStyle = palette.sleeve;
  ctx.fillRect(-2.1, -sleeveLength - 1.2, 4.2, sleeveLength);
  ctx.fillStyle = palette.barrel;
  ctx.fillRect(-1.25, -sleeveLength - barrelLength, 2.5, barrelLength);
  ctx.fillStyle = palette.metal;
  ctx.fillRect(-1.8, -sleeveLength - barrelLength - 1.4, 3.6, 1.6);

  if (tank.faction === 'player') {
    ctx.fillStyle = palette.accent;
    drawStar(ctx, 1.4, 1.6, 2.1);
  } else {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(0.6, 1.2, 2.2, 2.2);
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let index = 0; index < 5; index += 1) {
    const outer = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    const inner = outer + Math.PI / 5;
    const command = index === 0 ? ctx.moveTo : ctx.lineTo;
    command.call(ctx, x + Math.cos(outer) * radius, y + Math.sin(outer) * radius);
    ctx.lineTo(x + Math.cos(inner) * radius * 0.42, y + Math.sin(inner) * radius * 0.42);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function getPalette(tank: Tank): TankPalette {
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

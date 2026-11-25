import { roundRect, TAU } from './draw-shapes';
import type { TankPalette } from './draw-tank';

export const UPGRADE_GOLD = '#ffd54a';

const SLEEVE_LENGTH = 6.2;
const RECOIL_TRAVEL = 5.4;
const MUZZLE_FLASH_START = 0.55;
const TWIN_BARREL_OFFSET = 2.2;
const TWIN_RECOIL_LAG = 0.25;

interface BarrelSpec {
  offsetX: number;
  width: number;
  length: number;
  sleeveWidth: number;
  muzzleBrake: boolean;
}

const BASE_BARREL: BarrelSpec = { offsetX: 0, width: 2.5, length: 8.4, sleeveWidth: 4.2, muzzleBrake: false };

// 星星升级只改变玩家坦克外形：1 星履带挡板 + 长炮管，2 星反应装甲 + 双联装炮，3 星金边 + 导弹舱。
export function drawTrackSkirts(ctx: CanvasRenderingContext2D, palette: TankPalette): void {
  [-14.6, 12].forEach((x) => {
    roundRect(ctx, x, -12, 2.6, 24, 1);
    ctx.fillStyle = palette.hullDark;
    ctx.fill();
    roundRect(ctx, x + 0.5, -11.4, 1.6, 22.8, 0.6);
    ctx.fillStyle = palette.hull;
    ctx.fill();
    ctx.fillStyle = palette.metal;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(x + 1.3, -8 + index * 5.4, 0.45, 0, TAU);
      ctx.fill();
    }
  });
}

export function drawReactivePlates(ctx: CanvasRenderingContext2D, palette: TankPalette): void {
  [-7.6, -2.5, 2.6].forEach((x, index) => {
    const y = index === 1 ? -12.6 : -12.2;
    ctx.fillStyle = palette.hullDark;
    ctx.fillRect(x - 0.4, y - 0.4, 5.8, 3.8);
    ctx.fillStyle = palette.hullLight;
    ctx.fillRect(x, y, 5, 3);
  });
  [-8.6, 6.2].forEach((x) => {
    ctx.fillStyle = palette.hullDark;
    ctx.fillRect(x, -3, 2.4, 6);
    ctx.fillStyle = palette.hullLight;
    ctx.fillRect(x + 0.4, -2.6, 1.6, 5.2);
  });
}

export function drawGoldTrim(ctx: CanvasRenderingContext2D): void {
  roundRect(ctx, -7.6, -9.8, 15.2, 19.4, 2);
  ctx.strokeStyle = UPGRADE_GOLD;
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

export function drawMissilePods(ctx: CanvasRenderingContext2D, palette: TankPalette): void {
  [-10.6, 6.2].forEach((x) => {
    roundRect(ctx, x, 1.6, 4.4, 8.2, 1);
    ctx.fillStyle = palette.hullDark;
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 0.6, 2.2, 3.2, 7);
    for (let index = 0; index < 2; index += 1) {
      ctx.beginPath();
      ctx.arc(x + 2.2, 3.8 + index * 3.4, 1.2, 0, TAU);
      ctx.fillStyle = '#e04a3a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 1.9, 3.5 + index * 3.4, 0.4, 0, TAU);
      ctx.fillStyle = '#ffd0c4';
      ctx.fill();
    }
  });
}

export function drawTurretGoldRing(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.arc(0, 0.2, radius + 0.5, 0, TAU);
  ctx.strokeStyle = UPGRADE_GOLD;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

export function drawGun(ctx: CanvasRenderingContext2D, palette: TankPalette, firePower: number, recoil: number): void {
  if (firePower <= 0) {
    drawBarrel(ctx, palette, recoil, BASE_BARREL);
    return;
  }
  if (firePower === 1) {
    const longBarrel = { offsetX: 0, width: 2.9, length: 10.4, sleeveWidth: 4.8, muzzleBrake: true };
    drawMuzzleFlash(ctx, drawBarrel(ctx, palette, recoil, longBarrel), recoil, 0);
    return;
  }
  const heavy = firePower >= 3;
  ctx.fillStyle = palette.sleeve;
  roundRect(ctx, -4.4, -7.6, 8.8, 6.8, 1.2);
  ctx.fill();
  [-TWIN_BARREL_OFFSET, TWIN_BARREL_OFFSET].forEach((offsetX, index) => {
    const barrelRecoil = index === 0 ? recoil : Math.max(0, recoil - TWIN_RECOIL_LAG);
    const twinBarrel = {
      offsetX,
      width: heavy ? 2.6 : 2.3,
      length: heavy ? 10.6 : 9.6,
      sleeveWidth: 0,
      muzzleBrake: heavy,
    };
    drawMuzzleFlash(ctx, drawBarrel(ctx, palette, barrelRecoil, twinBarrel), barrelRecoil, offsetX);
  });
}

function drawBarrel(ctx: CanvasRenderingContext2D, palette: TankPalette, recoil: number, spec: BarrelSpec): number {
  const barrelLength = spec.length - recoil * RECOIL_TRAVEL;
  const tipY = -SLEEVE_LENGTH - barrelLength;
  if (spec.sleeveWidth > 0) {
    ctx.fillStyle = palette.sleeve;
    ctx.fillRect(spec.offsetX - spec.sleeveWidth / 2, -SLEEVE_LENGTH - 1.2, spec.sleeveWidth, SLEEVE_LENGTH);
  }
  ctx.fillStyle = palette.barrel;
  ctx.fillRect(spec.offsetX - spec.width / 2, tipY, spec.width, barrelLength);
  ctx.fillStyle = palette.metal;
  if (spec.muzzleBrake) {
    ctx.fillRect(spec.offsetX - spec.width / 2 - 1.2, tipY - 2.2, spec.width + 2.4, 2.4);
    ctx.fillStyle = palette.hullDark;
    ctx.fillRect(spec.offsetX - spec.width / 2 - 1.2, tipY - 1.2, spec.width + 2.4, 0.6);
  } else {
    ctx.fillRect(spec.offsetX - spec.width / 2 - 0.55, tipY - 1.4, spec.width + 1.1, 1.6);
  }
  return tipY;
}

function drawMuzzleFlash(ctx: CanvasRenderingContext2D, tipY: number, recoil: number, offsetX: number): void {
  if (recoil < MUZZLE_FLASH_START) {
    return;
  }
  const strength = (recoil - MUZZLE_FLASH_START) / (1 - MUZZLE_FLASH_START);
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(offsetX - 2.4, tipY - 1);
  ctx.lineTo(offsetX, tipY - 6 - strength * 3);
  ctx.lineTo(offsetX + 2.4, tipY - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(offsetX, tipY - 1.5, 2.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

import { COLS, MAP_SIZE, ROWS, TILE } from './constants';
import { drawBullet, drawExplosion, drawPowerUp } from './draw-effects';
import { drawTank } from './draw-tank';
import type { GameMap } from './map';
import type { Bullet, Explosion, PowerUp, StageBanner, Tank } from './types';

export interface RenderState {
  map: GameMap;
  tanks: Tank[];
  bullets: Bullet[];
  explosions: Explosion[];
  powerUp: PowerUp | null;
  clock: number;
  baseRingFlashing: boolean;
  banner: StageBanner | null;
}

export function renderWorld(ctx: CanvasRenderingContext2D, state: RenderState, terrainAtlas: HTMLImageElement): void {
  ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  drawGround(ctx);
  drawTiles(ctx, state, false, terrainAtlas);
  state.tanks.forEach((tank) => drawTank(ctx, tank, state.clock));
  state.bullets.forEach((bullet) => drawBullet(ctx, bullet));
  drawTiles(ctx, state, true, terrainAtlas);
  if (state.powerUp) {
    drawPowerUp(ctx, state.powerUp, state.clock);
  }
  state.explosions.forEach((explosion) => drawExplosion(ctx, explosion));
  if (state.banner) {
    drawBanner(ctx, state.banner);
  }
}

function drawGround(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#2a271f';
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let index = 0; index <= COLS; index += 1) {
    ctx.beginPath();
    ctx.moveTo(index * TILE + 0.5, 0);
    ctx.lineTo(index * TILE + 0.5, MAP_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, index * TILE + 0.5);
    ctx.lineTo(MAP_SIZE, index * TILE + 0.5);
    ctx.stroke();
  }
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  grassOnly: boolean,
  terrainAtlas: HTMLImageElement,
): void {
  const { map, clock, baseRingFlashing } = state;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = map.getTile(col, row);
      if (grassOnly !== (tile === 4)) {
        continue;
      }
      const x = col * TILE;
      const y = row * TILE;
      if (tile === 1 || tile === 2 || tile === 5) {
        const material = tile === 2 && baseRingFlashing && map.isFortifiedCell(col, row) ? 1 : tile;
        drawTerrainTile(ctx, terrainAtlas, material, col, row);
      } else if (tile === 3) {
        drawWater(ctx, x, y, clock);
      } else if (tile === 4) {
        drawGrass(ctx, x, y);
      }
    }
  }
}

// 图集从左到右为砖墙、钢墙、基地。每幅图覆盖 2×2 个可独立摧毁的地图格。
const TERRAIN_SPRITES = {
  1: { index: 0, fallback: '#bb6036' },
  2: { index: 1, fallback: '#6286a8' },
  5: { index: 2, fallback: '#dfb344' },
} as const;

function drawTerrainTile(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  material: keyof typeof TERRAIN_SPRITES,
  col: number,
  row: number,
): void {
  const sprite = TERRAIN_SPRITES[material];
  const x = col * TILE;
  const y = row * TILE;
  if (!atlas.complete || !atlas.naturalHeight) {
    ctx.fillStyle = sprite.fallback;
    ctx.fillRect(x, y, TILE, TILE);
    return;
  }
  const half = atlas.naturalHeight / 2;
  const sx = sprite.index * atlas.naturalHeight + (col % 2) * half;
  const sy = (row % 2) * half;
  ctx.drawImage(atlas, sx, sy, half, half, x, y, TILE, TILE);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number): void {
  const wave = (Math.sin(clock / 220 + x * 0.2 + y * 0.15) + 1) / 2;
  ctx.fillStyle = `rgb(${30 + wave * 20}, ${90 + wave * 40}, ${150 + wave * 40})`;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(180,220,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y + 6 + wave * 4);
  ctx.lineTo(x + TILE, y + 8 - wave * 3);
  ctx.stroke();
}

function drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(62, 140, 58, 0.88)';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(30, 80, 32, 0.8)';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + TILE);
  ctx.lineTo(x + 5, y + 3);
  ctx.moveTo(x + 9, y + TILE);
  ctx.lineTo(x + 11, y + 2);
  ctx.stroke();
}

function drawBanner(ctx: CanvasRenderingContext2D, banner: StageBanner): void {
  ctx.save();
  ctx.globalAlpha = banner.alpha;
  ctx.fillStyle = 'rgba(15, 14, 10, 0.78)';
  ctx.fillRect(0, MAP_SIZE / 2 - 26, MAP_SIZE, 52);
  ctx.fillStyle = '#e8c547';
  ctx.font = 'bold 22px "Avenir Next", "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.text, MAP_SIZE / 2, MAP_SIZE / 2);
  ctx.restore();
}

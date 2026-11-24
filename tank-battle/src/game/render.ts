import { BULLET_SIZE, COLS, MAP_SIZE, ROWS, TILE } from './constants';
import { drawTank } from './draw-tank';
import type { GameMap } from './map';
import type { Bullet, Explosion, Tank } from './types';

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  tanks: Tank[],
  bullets: Bullet[],
  explosions: Explosion[],
  now: number,
): void {
  ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  drawGround(ctx);
  drawTiles(ctx, map, now, false);
  tanks.forEach((tank) => drawTank(ctx, tank, now));
  bullets.forEach((bullet) => drawBullet(ctx, bullet));
  explosions.forEach((explosion) => drawExplosion(ctx, explosion));
  drawTiles(ctx, map, now, true);
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

function drawTiles(ctx: CanvasRenderingContext2D, map: GameMap, now: number, grassOnly: boolean): void {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = map.getTile(col, row);
      if (grassOnly && tile !== 4) {
        continue;
      }
      if (!grassOnly && tile === 4) {
        continue;
      }
      const x = col * TILE;
      const y = row * TILE;
      if (tile === 1) {
        drawBrick(ctx, x, y);
      } else if (tile === 2) {
        drawSteel(ctx, x, y);
      } else if (tile === 3) {
        drawWater(ctx, x, y, now);
      } else if (tile === 4) {
        drawGrass(ctx, x, y);
      } else if (tile === 5) {
        drawBase(ctx, x, y, col, row, map);
      }
    }
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#8a3b24';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#c46a45';
  ctx.fillRect(x + 1, y + 1, TILE - 2, 6);
  ctx.fillRect(x + 1, y + 9, TILE - 2, 6);
  ctx.strokeStyle = '#5c2416';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
}

function drawSteel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#8d939b';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#c5cbd3';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#5d636b';
  ctx.fillRect(x + 6, y + 6, 4, 4);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const wave = (Math.sin(now / 220 + x * 0.2 + y * 0.15) + 1) / 2;
  ctx.fillStyle = `rgb(${30 + wave * 20}, ${90 + wave * 40}, ${150 + wave * 40})`;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(180,220,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y + 6 + wave * 4);
  ctx.lineTo(x + TILE, y + 8 - wave * 3);
  ctx.stroke();
}

function drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(62, 140, 58, 0.82)';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(30, 80, 32, 0.8)';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + TILE);
  ctx.lineTo(x + 5, y + 3);
  ctx.moveTo(x + 9, y + TILE);
  ctx.lineTo(x + 11, y + 2);
  ctx.stroke();
}

function drawBase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  col: number,
  row: number,
  map: GameMap,
): void {
  ctx.fillStyle = '#4a2c12';
  ctx.fillRect(x, y, TILE, TILE);
  if (map.getTile(col, row - 1) === 5 || map.getTile(col - 1, row) === 5) {
    return;
  }
  ctx.fillStyle = '#e8c547';
  ctx.beginPath();
  ctx.moveTo(x + TILE, y + 6);
  ctx.lineTo(x + TILE * 2 - 4, y + TILE * 2 - 4);
  ctx.lineTo(x + 4, y + TILE * 2 - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9a1f1f';
  ctx.fillRect(x + TILE - 2, y + 2, 4, TILE * 2 - 6);
}

function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  ctx.fillStyle = bullet.faction === 'player' ? '#ffe08a' : '#f0f0f0';
  ctx.beginPath();
  ctx.arc(bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion): void {
  const progress = explosion.age / explosion.maxAge;
  ctx.fillStyle = `rgba(255, ${160 - progress * 80}, 40, ${1 - progress})`;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, explosion.radius * (0.4 + progress), 0, Math.PI * 2);
  ctx.fill();
}


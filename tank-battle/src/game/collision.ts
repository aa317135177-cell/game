import { LANE_OFFSET, TANK_SIZE, TILE } from './constants';
import type { GameMap } from './map';
import type { Rect, Tank } from './types';

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function tankRect(tank: Tank): Rect {
  return { x: tank.x, y: tank.y, w: TANK_SIZE, h: TANK_SIZE };
}

export function isSpawnClear(map: GameMap, tanks: Tank[], x: number, y: number): boolean {
  if (!map.canTankOccupy(x, y)) {
    return false;
  }
  const spawnRect = { x, y, w: TANK_SIZE, h: TANK_SIZE };
  return tanks.every((tank) => !rectsOverlap(spawnRect, tankRect(tank)));
}

function canPlaceTank(map: GameMap, tanks: Tank[], tank: Tank, x: number, y: number): boolean {
  if (!map.canTankOccupy(x, y)) {
    return false;
  }
  const nextRect = { x, y, w: TANK_SIZE, h: TANK_SIZE };
  return tanks.every((other) => other.id === tank.id || !rectsOverlap(nextRect, tankRect(other)));
}

function tryMoveTank(map: GameMap, tanks: Tank[], tank: Tank, x: number, y: number): boolean {
  if (!canPlaceTank(map, tanks, tank, x, y)) {
    return false;
  }
  tank.x = x;
  tank.y = y;
  return true;
}

function nearestLane(value: number): number {
  return Math.round((value - LANE_OFFSET) / TILE) * TILE + LANE_OFFSET;
}

// 被挡住时，如果对齐到最近的通道就能通过，就沿垂直方向滑过去，避免卡在墙角。
export function moveTank(map: GameMap, tanks: Tank[], tank: Tank, dx: number, dy: number): boolean {
  if (dx === 0 && dy === 0) {
    return false;
  }
  if (tryMoveTank(map, tanks, tank, tank.x + dx, tank.y + dy)) {
    return true;
  }
  const step = Math.abs(dx !== 0 ? dx : dy);
  if (dx !== 0) {
    const laneY = nearestLane(tank.y);
    if (laneY === tank.y || !canPlaceTank(map, tanks, tank, tank.x + dx, laneY)) {
      return false;
    }
    const shift = Math.sign(laneY - tank.y) * Math.min(step, Math.abs(laneY - tank.y));
    return tryMoveTank(map, tanks, tank, tank.x, tank.y + shift);
  }
  const laneX = nearestLane(tank.x);
  if (laneX === tank.x || !canPlaceTank(map, tanks, tank, laneX, tank.y + dy)) {
    return false;
  }
  const shift = Math.sign(laneX - tank.x) * Math.min(step, Math.abs(laneX - tank.x));
  return tryMoveTank(map, tanks, tank, tank.x + shift, tank.y);
}

import { SNAP, TANK_SIZE } from './constants';
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

export function tryMoveTank(map: GameMap, tanks: Tank[], tank: Tank, nextX: number, nextY: number): boolean {
  if (!map.canTankOccupy(nextX, nextY)) {
    return false;
  }
  const nextRect = { x: nextX, y: nextY, w: TANK_SIZE, h: TANK_SIZE };
  const blockedByTank = tanks.some(
    (other) => other.id !== tank.id && rectsOverlap(nextRect, tankRect(other)),
  );
  if (blockedByTank) {
    return false;
  }
  tank.x = nextX;
  tank.y = nextY;
  return true;
}

export function moveTank(map: GameMap, tanks: Tank[], tank: Tank, dx: number, dy: number): boolean {
  if (dx === 0 && dy === 0) {
    return false;
  }
  if (tryMoveTank(map, tanks, tank, tank.x + dx, tank.y + dy)) {
    return true;
  }
  if (dx !== 0) {
    const snappedY = Math.round(tank.y / SNAP) * SNAP;
    if (snappedY !== tank.y) {
      return tryMoveTank(map, tanks, tank, tank.x + dx, snappedY);
    }
  }
  if (dy !== 0) {
    const snappedX = Math.round(tank.x / SNAP) * SNAP;
    if (snappedX !== tank.x) {
      return tryMoveTank(map, tanks, tank, snappedX, tank.y + dy);
    }
  }
  return false;
}

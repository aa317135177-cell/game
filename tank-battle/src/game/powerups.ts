import { COMPACT_SIZE, LANE_OFFSET, POWER_UP_LIFETIME_MS, TANK_SIZE, TILE } from './constants';
import { rectsOverlap } from './collision';
import type { GameMap } from './map';
import type { PowerUp, PowerUpKind, Rect } from './types';

export const POWER_UP_KINDS: readonly PowerUpKind[] = ['star', 'shovel', 'bomb', 'helmet', 'tank', 'maxStar'];

const PICKUP_INSET = 4;

export function isPowerUpKind(value: string | undefined): value is PowerUpKind {
  return POWER_UP_KINDS.some((kind) => kind === value);
}

export function powerUpRect(powerUp: PowerUp): Rect {
  return {
    x: powerUp.x + PICKUP_INSET,
    y: powerUp.y + PICKUP_INSET,
    w: TANK_SIZE - PICKUP_INSET * 2,
    h: TANK_SIZE - PICKUP_INSET * 2,
  };
}

export function createPowerUp(map: GameMap, blockedRects: Rect[], clock: number): PowerUp | null {
  const spots: Rect[] = [];
  for (let row = 0; row < COMPACT_SIZE; row += 1) {
    for (let col = 0; col < COMPACT_SIZE; col += 1) {
      const spot = {
        x: col * TILE * 2 + LANE_OFFSET,
        y: row * TILE * 2 + LANE_OFFSET,
        w: TANK_SIZE,
        h: TANK_SIZE,
      };
      if (!map.canTankOccupy(spot.x, spot.y)) {
        continue;
      }
      if (blockedRects.some((rect) => rectsOverlap(rect, spot))) {
        continue;
      }
      spots.push(spot);
    }
  }
  if (spots.length === 0) {
    return null;
  }
  const spot = spots[Math.floor(Math.random() * spots.length)];
  const kind = POWER_UP_KINDS[Math.floor(Math.random() * POWER_UP_KINDS.length)];
  return { kind, x: spot.x, y: spot.y, expiresAt: clock + POWER_UP_LIFETIME_MS };
}

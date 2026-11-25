import { DIR_VECTORS, TANK_SIZE } from './constants';
import { dirToPoint, oppositeDir } from './entities';
import { moveTank } from './collision';
import type { GameMap } from './map';
import type { Direction, Point, Tank } from './types';

export function updateEnemyAi(
  map: GameMap,
  tanks: Tank[],
  enemy: Tank,
  player: Tank | null,
  baseCenter: Point,
  dt: number,
): void {
  enemy.thinkIn -= dt;
  const moved = drive(map, tanks, enemy);
  if (!moved || enemy.thinkIn <= 0) {
    enemy.dir = chooseDirection(map, enemy, player, baseCenter);
    enemy.thinkIn = 380 + Math.random() * 700;
    drive(map, tanks, enemy);
  }
}

function drive(map: GameMap, tanks: Tank[], enemy: Tank): boolean {
  const vector = DIR_VECTORS[enemy.dir];
  return moveTank(map, tanks, enemy, vector.x * enemy.speed, vector.y * enemy.speed);
}

function chooseDirection(map: GameMap, enemy: Tank, player: Tank | null, baseCenter: Point): Direction {
  const roll = Math.random();
  const centerX = enemy.x + TANK_SIZE / 2;
  const centerY = enemy.y + TANK_SIZE / 2;
  if (roll < 0.35 && player) {
    const playerX = player.x + TANK_SIZE / 2;
    const playerY = player.y + TANK_SIZE / 2;
    if (!map.isGrassAt(playerX, playerY)) {
      return dirToPoint(centerX, centerY, playerX, playerY);
    }
  }
  if (roll < 0.6) {
    return dirToPoint(centerX, centerY, baseCenter.x, baseCenter.y);
  }
  const randomDir = Math.floor(Math.random() * 4) as Direction;
  if (randomDir === oppositeDir(enemy.dir) && Math.random() < 0.6) {
    return enemy.dir;
  }
  return randomDir;
}

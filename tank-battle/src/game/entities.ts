import {
  BARREL_RECOIL_MS,
  BULLET_SIZE,
  BULLET_SPEED,
  DIR_VECTORS,
  ENEMY_SPEED_SCALE,
  FIRE_POWER_STATS,
  PLAYER_SPEED,
  SPAWN_PROTECT_MS,
  TANK_SIZE,
} from './constants';
import type { Bullet, Direction, EnemyKind, Explosion, ExplosionKind, Tank } from './types';

let nextEntityId = 1;

export function createPlayer(x: number, y: number, clock: number, firePower: number): Tank {
  return {
    id: nextEntityId++,
    faction: 'player',
    kind: 'player',
    x,
    y,
    dir: 0,
    speed: PLAYER_SPEED,
    hp: 1,
    maxHp: 1,
    cooldown: 0,
    fireInterval: FIRE_POWER_STATS[firePower].fireInterval,
    invincibleUntil: clock + SPAWN_PROTECT_MS,
    thinkIn: 0,
    trackPhase: 0,
    barrelRecoil: 0,
    bonus: false,
    firePower,
  };
}

export function createEnemy(x: number, y: number, kind: EnemyKind, bonus: boolean): Tank {
  const stats = getEnemyStats(kind);
  return {
    id: nextEntityId++,
    faction: 'enemy',
    kind,
    x,
    y,
    dir: 2,
    speed: stats.speed,
    hp: stats.hp,
    maxHp: stats.hp,
    cooldown: 400,
    fireInterval: stats.fireInterval,
    invincibleUntil: 0,
    thinkIn: 300,
    trackPhase: 0,
    barrelRecoil: 0,
    bonus,
    firePower: 0,
  };
}

export function createBullet(tank: Tank, enemyBulletSpeed = BULLET_SPEED): Bullet {
  const vector = DIR_VECTORS[tank.dir];
  const centerX = tank.x + TANK_SIZE / 2 - BULLET_SIZE / 2;
  const centerY = tank.y + TANK_SIZE / 2 - BULLET_SIZE / 2;
  const fireStats = FIRE_POWER_STATS[tank.firePower];
  const isPlayer = tank.faction === 'player';
  return {
    id: nextEntityId++,
    x: centerX + vector.x * 16,
    y: centerY + vector.y * 16,
    dir: tank.dir,
    faction: tank.faction,
    ownerId: tank.id,
    firePower: isPlayer ? tank.firePower : 0,
    speed: isPlayer ? fireStats.bulletSpeed : enemyBulletSpeed,
    breaksSteel: isPlayer && fireStats.breaksSteel,
  };
}

const EXPLOSION_MAX_AGE: Record<ExplosionKind, number> = {
  small: 240,
  big: 620,
  score: 900,
};

export function createExplosion(kind: ExplosionKind, x: number, y: number, size: number, label = '', firePower = 0): Explosion {
  return {
    kind,
    x,
    y,
    age: 0,
    maxAge: EXPLOSION_MAX_AGE[kind],
    size,
    seed: Math.floor(Math.random() * 0xffffffff),
    label,
    firePower,
  };
}

export function tickTankAnim(tank: Tank, dt: number, movedDistance: number): void {
  if (movedDistance > 0) {
    tank.trackPhase += movedDistance;
  }
  tank.barrelRecoil = Math.max(0, tank.barrelRecoil - dt / BARREL_RECOIL_MS);
}

function getEnemyStats(kind: EnemyKind): { speed: number; hp: number; fireInterval: number } {
  if (kind === 'fast') {
    return { speed: 2.35 * ENEMY_SPEED_SCALE, hp: 1, fireInterval: 700 };
  }
  if (kind === 'armor') {
    return { speed: 1.25 * ENEMY_SPEED_SCALE, hp: 3, fireInterval: 780 };
  }
  return { speed: 1.35 * ENEMY_SPEED_SCALE, hp: 1, fireInterval: 860 };
}

export function oppositeDir(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

export function dirToPoint(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 1 : 3;
  }
  return dy > 0 ? 2 : 0;
}

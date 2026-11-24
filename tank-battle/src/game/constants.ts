export const TILE = 16;
export const COMPACT_SIZE = 13;
export const COLS = 26;
export const ROWS = 26;
export const MAP_SIZE = TILE * COLS;
export const TANK_SIZE = 28;
export const LANE_OFFSET = (TILE * 2 - TANK_SIZE) / 2;
export const BULLET_SIZE = 6;
export const BULLET_SPEED = 5;
export const BULLET_SUBSTEP = 3;
export const PLAYER_SPEED = 1.85;
export const ENEMY_SPEED_SCALE = 0.5;
export const BARREL_RECOIL_MS = 180;
export const PLAYER_LIVES = 3;
export const MAX_LIVES = 9;
export const MAX_ENEMIES_ALIVE = 4;
export const SPAWN_PROTECT_MS = 2000;
export const RESPAWN_DELAY_MS = 900;
export const END_DELAY_MS = 1400;

export const BONUS_EVERY = 4;
export const POWER_UP_LIFETIME_MS = 12000;
export const POWER_UP_BLINK_MS = 3000;
export const POWER_UP_SCORE = 500;
export const HELMET_MS = 10000;
export const SHOVEL_MS = 15000;
export const SHOVEL_FLASH_MS = 3000;

export const FIRE_POWER_STATS = [
  { bulletSpeed: 5, maxBullets: 2, fireInterval: 260, breaksSteel: false },
  { bulletSpeed: 7, maxBullets: 2, fireInterval: 220, breaksSteel: false },
  { bulletSpeed: 7, maxBullets: 3, fireInterval: 180, breaksSteel: false },
  { bulletSpeed: 7.5, maxBullets: 3, fireInterval: 180, breaksSteel: true },
] as const;
export const MAX_FIRE_POWER = FIRE_POWER_STATS.length - 1;

export const DIR_VECTORS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

export const SCORE_BY_KIND = {
  basic: 100,
  fast: 200,
  armor: 300,
} as const;

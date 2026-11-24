export const TILE = 16;
export const COMPACT_SIZE = 13;
export const COLS = 26;
export const ROWS = 26;
export const MAP_SIZE = TILE * COLS;
export const TANK_SIZE = 28;
export const BULLET_SIZE = 6;
export const BULLET_SPEED = 5;
export const SNAP = 8;
export const PLAYER_SPEED = 1.85;
export const ENEMY_SPEED_SCALE = 0.5;
export const BARREL_RECOIL_MS = 180;
export const PLAYER_LIVES = 3;
export const PLAYER_FIRE_MS = 260;
export const MAX_PLAYER_BULLETS = 2;
export const MAX_ENEMIES_ALIVE = 4;
export const ENEMIES_PER_LEVEL = 12;
export const SPAWN_INTERVAL_MS = 2600;
export const SPAWN_PROTECT_MS = 2000;
export const RESPAWN_DELAY_MS = 900;

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

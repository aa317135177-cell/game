export type Direction = 0 | 1 | 2 | 3;

export type TileType = 0 | 1 | 2 | 3 | 4 | 5;

export type GamePhase = 'menu' | 'playing' | 'paused' | 'win' | 'lose';

export type Faction = 'player' | 'enemy';

export type EnemyKind = 'basic' | 'fast' | 'armor';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Tank {
  id: number;
  faction: Faction;
  kind: 'player' | EnemyKind;
  x: number;
  y: number;
  dir: Direction;
  speed: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  fireInterval: number;
  invincibleUntil: number;
  thinkIn: number;
  trackPhase: number;
  barrelRecoil: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  dir: Direction;
  faction: Faction;
  ownerId: number;
}

export interface Explosion {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  radius: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  level: number;
  levelCount: number;
  lives: number;
  enemiesLeft: number;
  score: number;
}

export interface OverlayCopy {
  title: string;
  subtitle: string;
  action: string;
}

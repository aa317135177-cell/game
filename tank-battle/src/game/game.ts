import {
  BONUS_EVERY,
  BULLET_SIZE,
  BULLET_SUBSTEP,
  DIR_VECTORS,
  END_DELAY_MS,
  FIRE_POWER_STATS,
  HELMET_MS,
  MAP_SIZE,
  MAX_ENEMIES_ALIVE,
  MAX_FIRE_POWER,
  MAX_LIVES,
  PLAYER_LIVES,
  POWER_UP_SCORE,
  RESPAWN_DELAY_MS,
  SCORE_BY_KIND,
  SHOVEL_FLASH_MS,
  SHOVEL_MS,
  TANK_SIZE,
} from './constants';
import { isSpawnClear, moveTank, rectsOverlap, tankRect } from './collision';
import { createBullet, createEnemy, createExplosion, createPlayer, tickTankAnim } from './entities';
import { updateEnemyAi } from './ai';
import { buildSpawnQueue, getLevelEnemyTotal, LEVELS } from './levels';
import { GameMap } from './map';
import { createPowerUp, powerUpRect } from './powerups';
import type { Input } from './input';
import type { RenderState } from './render';
import type {
  Bullet,
  EnemyKind,
  Explosion,
  GamePhase,
  HudSnapshot,
  OverlayCopy,
  Point,
  PowerUp,
  PowerUpKind,
  Rect,
  SoundName,
  StageBanner,
  Tank,
} from './types';

const BANNER_MS = 1800;
const BANNER_FADE_MS = 500;
const ENEMY_FIRE_CHANCE = 0.03;
const SPAWN_RETRY_MS = 500;

type EndPhase = 'win' | 'lose';

export class TankBattle {
  readonly map = new GameMap();
  tanks: Tank[] = [];
  bullets: Bullet[] = [];
  explosions: Explosion[] = [];
  powerUp: PowerUp | null = null;
  phase: GamePhase = 'menu';
  levelIndex = 0;
  lives = PLAYER_LIVES;
  score = 0;
  private clock = 0;
  private levelStartedAt = 0;
  private spawnQueue: EnemyKind[] = [];
  private spawnedCount = 0;
  private spawnIn = 0;
  private spawnCursor = 0;
  private respawnIn = 0;
  private playerId: number | null = null;
  private firePower = 0;
  private shovelUntil = 0;
  private pendingEnd: EndPhase | null = null;
  private pendingEndIn = 0;
  private baseLost = false;
  private soundQueue: SoundName[] = [];

  update(dt: number, input: Input): void {
    const confirmPressed = input.consumeConfirm();
    const pausePressed = input.consumePause();
    const firing = input.consumeFire();

    if (this.phase !== 'playing') {
      if (confirmPressed) {
        this.confirmOverlay();
      } else if (pausePressed && this.phase === 'paused') {
        this.phase = 'playing';
      }
      if (this.phase !== 'paused') {
        this.tickExplosions(dt);
      }
      return;
    }

    if (pausePressed) {
      this.phase = 'paused';
      return;
    }

    this.clock += dt;
    this.tickPlayer(dt, input, firing);
    this.tickEnemies(dt);
    this.tickBullets();
    this.tickPowerUp();
    this.tickShovel();
    this.tickExplosions(dt);
    this.tickSpawns(dt);
    this.tickRespawn(dt);
    this.checkRoundEnd();
    this.tickPendingEnd(dt);
  }

  confirmOverlay(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      return;
    }
    if (this.phase === 'win' && this.levelIndex < LEVELS.length - 1) {
      this.levelIndex += 1;
      this.loadCurrentLevel();
      return;
    }
    if (this.phase === 'menu' || this.phase === 'win' || this.phase === 'lose') {
      this.start();
    }
  }

  getHud(): HudSnapshot {
    return {
      phase: this.phase,
      level: this.levelIndex + 1,
      levelCount: LEVELS.length,
      lives: Math.max(0, this.lives),
      enemiesLeft: this.getEnemiesLeft(),
      score: this.score,
      firePower: this.firePower,
    };
  }

  getRenderState(): RenderState {
    return {
      map: this.map,
      tanks: this.tanks,
      bullets: this.bullets,
      explosions: this.explosions,
      powerUp: this.powerUp,
      clock: this.clock,
      baseRingFlashing: this.isBaseRingFlashing(),
      banner: this.getBanner(),
    };
  }

  drainSounds(): SoundName[] {
    const sounds = this.soundQueue;
    this.soundQueue = [];
    return sounds;
  }

  getOverlay(): OverlayCopy | null {
    if (this.phase === 'menu') {
      return { title: '坦克大战', subtitle: `共 ${LEVELS.length} 关，保护基地，消灭全部敌军`, action: '开始游戏' };
    }
    if (this.phase === 'paused') {
      return { title: '已暂停', subtitle: '按 P 或回车继续', action: '继续战斗' };
    }
    if (this.phase === 'win' && this.levelIndex < LEVELS.length - 1) {
      return {
        title: '关卡肃清',
        subtitle: `${LEVELS[this.levelIndex].name} 已拿下，下一关：${LEVELS[this.levelIndex + 1].name}`,
        action: '下一关',
      };
    }
    if (this.phase === 'win') {
      return { title: '战役胜利', subtitle: `${LEVELS.length} 关全部通关，最终得分 ${this.score}`, action: '再来一局' };
    }
    if (this.phase === 'lose') {
      const reason = this.baseLost ? '基地被摧毁' : '坦克全部阵亡';
      return { title: '战斗失败', subtitle: `${reason}，本局得分 ${this.score}`, action: '重新开始' };
    }
    return null;
  }

  getLevelName(): string {
    return LEVELS[this.levelIndex]?.name ?? '';
  }

  private start(): void {
    this.lives = PLAYER_LIVES;
    this.score = 0;
    this.levelIndex = 0;
    this.firePower = 0;
    this.loadCurrentLevel();
  }

  private loadCurrentLevel(): void {
    const level = LEVELS[this.levelIndex];
    this.map.load(level);
    this.tanks = [];
    this.bullets = [];
    this.explosions = [];
    this.powerUp = null;
    this.spawnQueue = buildSpawnQueue(level);
    this.spawnedCount = 0;
    this.spawnIn = 300;
    this.spawnCursor = 0;
    this.respawnIn = 0;
    this.shovelUntil = 0;
    this.pendingEnd = null;
    this.pendingEndIn = 0;
    this.baseLost = false;
    this.levelStartedAt = this.clock;
    const player = createPlayer(this.map.playerSpawn.x, this.map.playerSpawn.y, this.clock, this.firePower);
    this.tanks.push(player);
    this.playerId = player.id;
    this.phase = 'playing';
    this.emit('start');
  }

  private tickPlayer(dt: number, input: Input, firing: boolean): void {
    const player = this.getPlayer();
    if (!player) {
      return;
    }
    player.cooldown = Math.max(0, player.cooldown - dt);
    const prevX = player.x;
    const prevY = player.y;
    const direction = input.getDirection();
    if (direction !== null) {
      player.dir = direction;
      const vector = DIR_VECTORS[direction];
      moveTank(this.map, this.tanks, player, vector.x * player.speed, vector.y * player.speed);
    }
    tickTankAnim(player, dt, Math.hypot(player.x - prevX, player.y - prevY));
    if (firing) {
      this.tryFire(player);
    }
  }

  private tickEnemies(dt: number): void {
    const player = this.getPlayer();
    const baseCenter = this.map.getBaseCenter();
    this.tanks
      .filter((tank) => tank.faction === 'enemy')
      .forEach((enemy) => {
        enemy.cooldown = Math.max(0, enemy.cooldown - dt);
        const prevX = enemy.x;
        const prevY = enemy.y;
        updateEnemyAi(this.map, this.tanks, enemy, player, baseCenter, dt);
        tickTankAnim(enemy, dt, Math.hypot(enemy.x - prevX, enemy.y - prevY));
        if (enemy.cooldown <= 0 && Math.random() < ENEMY_FIRE_CHANCE) {
          this.tryFire(enemy);
        }
      });
  }

  private tryFire(tank: Tank): void {
    if (tank.cooldown > 0) {
      return;
    }
    if (tank.faction === 'player') {
      const flying = this.bullets.filter((bullet) => bullet.ownerId === tank.id).length;
      if (flying >= FIRE_POWER_STATS[tank.firePower].maxBullets) {
        return;
      }
      this.emit('fire');
    }
    this.bullets.push(createBullet(tank));
    tank.cooldown = tank.fireInterval;
    tank.barrelRecoil = 1;
  }

  // 快子弹按小步推进，每一步都做碰撞，避免一帧直接穿过一格砖或一辆坦克。
  private tickBullets(): void {
    let activeBullets = [...this.bullets];
    const maxSpeed = Math.max(0, ...activeBullets.map((bullet) => bullet.speed));
    const substeps = Math.max(1, Math.ceil(maxSpeed / BULLET_SUBSTEP));
    for (let step = 0; step < substeps && this.phase === 'playing'; step += 1) {
      activeBullets = activeBullets.filter((bullet) => this.advanceBullet(bullet, bullet.speed / substeps));
      activeBullets = this.resolveBulletClashes(activeBullets);
    }
    this.bullets = activeBullets;
  }

  private advanceBullet(bullet: Bullet, distance: number): boolean {
    const vector = DIR_VECTORS[bullet.dir];
    bullet.x += vector.x * distance;
    bullet.y += vector.y * distance;
    const centerX = bullet.x + BULLET_SIZE / 2;
    const centerY = bullet.y + BULLET_SIZE / 2;
    if (centerX < 0 || centerY < 0 || centerX > MAP_SIZE || centerY > MAP_SIZE) {
      const x = Math.min(MAP_SIZE, Math.max(0, centerX));
      const y = Math.min(MAP_SIZE, Math.max(0, centerY));
      this.addBlast('small', x, y, 8, bullet.firePower);
      return false;
    }

    const tipX = centerX + vector.x * (BULLET_SIZE / 2);
    const tipY = centerY + vector.y * (BULLET_SIZE / 2);
    const impact = this.map.hitBullet(tipX, tipY, bullet.dir, bullet.breaksSteel, bullet.faction === 'player');
    if (impact === 'base') {
      this.addBlast('big', centerX, centerY, 26, bullet.firePower);
      this.emit('bigExplode');
      this.baseLost = true;
      this.scheduleEnd('lose');
      return false;
    }
    if (impact !== 'none') {
      this.addBlast('small', tipX, tipY, 9, bullet.firePower);
      if (bullet.faction === 'player') {
        this.emit(impact === 'steel' ? 'hitSteel' : 'hitBrick');
      }
      return false;
    }

    const bulletBox = { x: bullet.x, y: bullet.y, w: BULLET_SIZE, h: BULLET_SIZE };
    const victim = this.tanks.find(
      (tank) => tank.faction !== bullet.faction && rectsOverlap(bulletBox, tankRect(tank)),
    );
    if (victim) {
      this.hitTank(victim, bullet);
      return false;
    }
    return true;
  }

  private resolveBulletClashes(bullets: Bullet[]): Bullet[] {
    const removedIds = new Set<number>();
    for (let first = 0; first < bullets.length; first += 1) {
      for (let second = first + 1; second < bullets.length; second += 1) {
        const firstBullet = bullets[first];
        const secondBullet = bullets[second];
        if (firstBullet.faction === secondBullet.faction) {
          continue;
        }
        if (removedIds.has(firstBullet.id) || removedIds.has(secondBullet.id)) {
          continue;
        }
        const overlapped = rectsOverlap(
          { x: firstBullet.x, y: firstBullet.y, w: BULLET_SIZE, h: BULLET_SIZE },
          { x: secondBullet.x, y: secondBullet.y, w: BULLET_SIZE, h: BULLET_SIZE },
        );
        if (!overlapped) {
          continue;
        }
        removedIds.add(firstBullet.id);
        removedIds.add(secondBullet.id);
        this.addBlast(
          'small',
          (firstBullet.x + secondBullet.x) / 2 + BULLET_SIZE / 2,
          (firstBullet.y + secondBullet.y) / 2 + BULLET_SIZE / 2,
          7,
          Math.max(firstBullet.firePower, secondBullet.firePower),
        );
      }
    }
    return removedIds.size === 0 ? bullets : bullets.filter((bullet) => !removedIds.has(bullet.id));
  }

  private hitTank(tank: Tank, bullet: Bullet): void {
    const centerX = bullet.x + BULLET_SIZE / 2;
    const centerY = bullet.y + BULLET_SIZE / 2;
    if (tank.invincibleUntil > this.clock) {
      this.addBlast('small', centerX, centerY, 8, bullet.firePower);
      return;
    }
    if (tank.bonus) {
      tank.bonus = false;
      this.spawnPowerUp();
    }
    tank.hp -= 1;
    if (tank.hp > 0) {
      this.addBlast('small', centerX, centerY, 10, bullet.firePower);
      if (bullet.faction === 'player') {
        this.emit('hitSteel');
      }
      return;
    }
    this.destroyTank(tank, bullet.firePower);
  }

  private destroyTank(tank: Tank, firePower = 0): void {
    this.tanks = this.tanks.filter((item) => item.id !== tank.id);
    const centerX = tank.x + TANK_SIZE / 2;
    const centerY = tank.y + TANK_SIZE / 2;
    this.addBlast('big', centerX, centerY, 22, firePower);
    if (tank.kind === 'player') {
      this.emit('bigExplode');
      this.playerId = null;
      this.firePower = 0;
      this.lives -= 1;
      if (this.lives <= 0) {
        this.scheduleEnd('lose');
        return;
      }
      this.respawnIn = RESPAWN_DELAY_MS;
      return;
    }
    this.emit('explode');
    const points = SCORE_BY_KIND[tank.kind];
    this.score += points;
    this.explosions.push(createExplosion('score', centerX, centerY, 0, `+${points}`));
  }

  private tickPowerUp(): void {
    if (!this.powerUp) {
      return;
    }
    if (this.clock >= this.powerUp.expiresAt) {
      this.powerUp = null;
      return;
    }
    const player = this.getPlayer();
    if (!player || !rectsOverlap(tankRect(player), powerUpRect(this.powerUp))) {
      return;
    }
    const kind = this.powerUp.kind;
    const pickedAt = { x: this.powerUp.x + TANK_SIZE / 2, y: this.powerUp.y + TANK_SIZE / 2 };
    this.powerUp = null;
    this.applyPowerUp(kind, player, pickedAt);
  }

  private spawnPowerUp(): void {
    const blockedRects: Rect[] = [
      ...this.tanks.map(tankRect),
      ...this.map.enemySpawns.map((point) => ({ x: point.x, y: point.y, w: TANK_SIZE, h: TANK_SIZE })),
      { x: this.map.playerSpawn.x, y: this.map.playerSpawn.y, w: TANK_SIZE, h: TANK_SIZE },
    ];
    const baseRect = this.map.getBaseRect();
    if (baseRect) {
      blockedRects.push(baseRect);
    }
    const powerUp = createPowerUp(this.map, blockedRects, this.clock);
    if (!powerUp) {
      console.warn('[tank-battle] 道具生成失败：地图上没有可放置的位置', { level: this.levelIndex + 1 });
      return;
    }
    this.powerUp = powerUp;
    this.emit('powerUpSpawn');
  }

  private applyPowerUp(kind: PowerUpKind, player: Tank, pickedAt: Point): void {
    this.score += POWER_UP_SCORE;
    this.explosions.push(createExplosion('score', pickedAt.x, pickedAt.y, 0, `+${POWER_UP_SCORE}`));
    this.emit('powerUpPick');
    if (kind === 'star') {
      this.firePower = Math.min(MAX_FIRE_POWER, this.firePower + 1);
      player.firePower = this.firePower;
      player.fireInterval = FIRE_POWER_STATS[this.firePower].fireInterval;
      return;
    }
    if (kind === 'shovel') {
      this.map.fortifyBase(this.tanks.map(tankRect));
      this.shovelUntil = this.clock + SHOVEL_MS;
      return;
    }
    if (kind === 'bomb') {
      this.tanks.filter((tank) => tank.faction === 'enemy').forEach((enemy) => this.destroyTank(enemy));
      return;
    }
    if (kind === 'helmet') {
      player.invincibleUntil = Math.max(player.invincibleUntil, this.clock + HELMET_MS);
      return;
    }
    this.lives = Math.min(MAX_LIVES, this.lives + 1);
  }

  private tickShovel(): void {
    if (this.shovelUntil === 0 || this.clock < this.shovelUntil) {
      return;
    }
    this.map.restoreBase(this.tanks.map(tankRect));
    this.shovelUntil = 0;
  }

  private isBaseRingFlashing(): boolean {
    const remaining = this.shovelUntil - this.clock;
    return this.shovelUntil > 0 && remaining < SHOVEL_FLASH_MS && Math.floor(this.clock / 200) % 2 === 0;
  }

  private tickExplosions(dt: number): void {
    this.explosions.forEach((explosion) => {
      explosion.age += dt;
    });
    this.explosions = this.explosions.filter((explosion) => explosion.age < explosion.maxAge);
  }

  private tickSpawns(dt: number): void {
    if (this.spawnedCount >= this.spawnQueue.length) {
      return;
    }
    const aliveEnemies = this.tanks.filter((tank) => tank.faction === 'enemy').length;
    if (aliveEnemies >= MAX_ENEMIES_ALIVE) {
      return;
    }
    this.spawnIn -= dt;
    if (this.spawnIn > 0) {
      return;
    }
    const spawnPoint = this.pickEnemySpawnPoint();
    if (!spawnPoint) {
      this.spawnIn = SPAWN_RETRY_MS;
      return;
    }
    const isBonus = (this.spawnedCount + 1) % BONUS_EVERY === 0;
    this.tanks.push(createEnemy(spawnPoint.x, spawnPoint.y, this.spawnQueue[this.spawnedCount], isBonus));
    this.spawnedCount += 1;
    this.spawnIn = LEVELS[this.levelIndex].spawnIntervalMs;
  }

  private pickEnemySpawnPoint(): Point | null {
    const spawns = this.map.enemySpawns;
    for (let offset = 0; offset < spawns.length; offset += 1) {
      const index = (this.spawnCursor + offset) % spawns.length;
      const point = spawns[index];
      if (isSpawnClear(this.map, this.tanks, point.x, point.y)) {
        this.spawnCursor = index + 1;
        return point;
      }
    }
    return null;
  }

  private tickRespawn(dt: number): void {
    if (this.playerId !== null || this.lives <= 0 || this.pendingEnd === 'lose') {
      return;
    }
    this.respawnIn -= dt;
    if (this.respawnIn > 0) {
      return;
    }
    const spawn = this.map.playerSpawn;
    if (!isSpawnClear(this.map, this.tanks, spawn.x, spawn.y)) {
      this.respawnIn = 200;
      return;
    }
    const player = createPlayer(spawn.x, spawn.y, this.clock, this.firePower);
    this.tanks.push(player);
    this.playerId = player.id;
  }

  private checkRoundEnd(): void {
    if (this.map.isBaseDestroyed()) {
      this.baseLost = true;
      this.scheduleEnd('lose');
      return;
    }
    const enemiesAlive = this.tanks.some((tank) => tank.faction === 'enemy');
    if (!enemiesAlive && this.spawnedCount >= this.spawnQueue.length) {
      this.scheduleEnd('win');
    }
  }

  // 先让最后一下爆炸播完再弹结算；失败优先级高于胜利。
  private scheduleEnd(phase: EndPhase): void {
    if (this.pendingEnd === 'lose' || this.pendingEnd === phase) {
      return;
    }
    this.pendingEnd = phase;
    this.pendingEndIn = END_DELAY_MS;
  }

  private tickPendingEnd(dt: number): void {
    if (!this.pendingEnd) {
      return;
    }
    this.pendingEndIn -= dt;
    if (this.pendingEndIn > 0) {
      return;
    }
    this.phase = this.pendingEnd;
    this.pendingEnd = null;
    this.bullets = [];
    this.emit(this.phase === 'win' ? 'levelClear' : 'gameOver');
  }

  private getEnemiesLeft(): number {
    if (this.phase === 'menu') {
      return getLevelEnemyTotal(LEVELS[0]);
    }
    const unspawned = this.spawnQueue.length - this.spawnedCount;
    return unspawned + this.tanks.filter((tank) => tank.faction === 'enemy').length;
  }

  private getBanner(): StageBanner | null {
    if (this.phase !== 'playing' && this.phase !== 'paused') {
      return null;
    }
    const elapsed = this.clock - this.levelStartedAt;
    if (elapsed >= BANNER_MS) {
      return null;
    }
    const fadeStart = BANNER_MS - BANNER_FADE_MS;
    const alpha = elapsed < fadeStart ? 1 : 1 - (elapsed - fadeStart) / BANNER_FADE_MS;
    return { text: `第 ${this.levelIndex + 1} 关 · ${this.getLevelName()}`, alpha };
  }

  private getPlayer(): Tank | null {
    return this.tanks.find((tank) => tank.id === this.playerId) ?? null;
  }

  private addBlast(kind: 'big' | 'small', x: number, y: number, size: number, firePower: number): void {
    this.explosions.push(createExplosion(kind, x, y, size, '', firePower));
  }

  private emit(sound: SoundName): void {
    this.soundQueue.push(sound);
  }
}

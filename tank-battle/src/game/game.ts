import {
  BULLET_SIZE,
  BULLET_SPEED,
  DIR_VECTORS,
  ENEMIES_PER_LEVEL,
  MAP_SIZE,
  MAX_ENEMIES_ALIVE,
  MAX_PLAYER_BULLETS,
  RESPAWN_DELAY_MS,
  SCORE_BY_KIND,
  SPAWN_INTERVAL_MS,
  SPAWN_PROTECT_MS,
  TANK_SIZE,
} from './constants';
import { isSpawnClear, moveTank, rectsOverlap, tankRect } from './collision';
import {
  createBullet,
  createEnemy,
  createExplosion,
  createPlayer,
  pickEnemyKind,
  tickTankAnim,
} from './entities';
import { updateEnemyAi } from './ai';
import { LEVELS } from './levels';
import { GameMap } from './map';
import type { Input } from './input';
import type { Bullet, EnemyKind, Explosion, GamePhase, HudSnapshot, OverlayCopy, Tank } from './types';

export class TankBattle {
  readonly map = new GameMap();
  tanks: Tank[] = [];
  bullets: Bullet[] = [];
  explosions: Explosion[] = [];
  phase: GamePhase = 'menu';
  levelIndex = 0;
  lives = 3;
  score = 0;
  remainingSpawns = ENEMIES_PER_LEVEL;
  private spawnIn = 400;
  private respawnIn = 0;
  private playerId: number | null = null;

  start(): void {
    this.lives = 3;
    this.score = 0;
    this.levelIndex = 0;
    this.loadCurrentLevel(true);
  }

  restart(): void {
    this.start();
  }

  continueAfterWin(): void {
    if (this.levelIndex < LEVELS.length - 1) {
      this.levelIndex += 1;
      this.loadCurrentLevel(false);
      return;
    }
    this.start();
  }

  togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      return;
    }
    if (this.phase === 'paused') {
      this.phase = 'playing';
    }
  }

  update(dt: number, now: number, input: Input): void {
    if (this.phase === 'menu' || this.phase === 'win' || this.phase === 'lose') {
      if (input.consumeConfirm()) {
        if (this.phase === 'win') {
          this.continueAfterWin();
        } else {
          this.start();
        }
      }
      this.tickExplosions(dt);
      return;
    }

    if (this.phase === 'paused' && input.consumeConfirm()) {
      this.phase = 'playing';
    }

    if (input.consumePause()) {
      this.togglePause();
    }
    if (this.phase !== 'playing') {
      return;
    }

    input.consumeConfirm();
    this.tickPlayer(dt, input);
    this.tickEnemies(dt);
    this.tickBullets(now);
    this.tickExplosions(dt);
    this.tickSpawns(dt);
    this.tickRespawn(dt, now);
    this.checkRoundEnd();
  }

  getHud(): HudSnapshot {
    return {
      phase: this.phase,
      level: this.levelIndex + 1,
      levelCount: LEVELS.length,
      lives: this.lives,
      enemiesLeft: this.remainingSpawns + this.tanks.filter((tank) => tank.faction === 'enemy').length,
      score: this.score,
    };
  }

  getOverlay(): OverlayCopy | null {
    if (this.phase === 'menu') {
      return { title: '坦克大战', subtitle: '保护基地，消灭全部敌军', action: '开始游戏' };
    }
    if (this.phase === 'paused') {
      return { title: '已暂停', subtitle: '战场不会消失，只是暂时安静', action: '继续战斗' };
    }
    if (this.phase === 'win' && this.levelIndex < LEVELS.length - 1) {
      return { title: '关卡肃清', subtitle: `${LEVELS[this.levelIndex].name} 已拿下`, action: '下一关' };
    }
    if (this.phase === 'win') {
      return { title: '战役胜利', subtitle: `最终得分 ${this.score}`, action: '再来一局' };
    }
    if (this.phase === 'lose') {
      return { title: '基地失守', subtitle: `本局得分 ${this.score}`, action: '重新开始' };
    }
    return null;
  }

  getLevelName(): string {
    return LEVELS[this.levelIndex]?.name ?? '';
  }

  private loadCurrentLevel(resetLives: boolean): void {
    const level = LEVELS[this.levelIndex];
    this.map.load(level);
    this.tanks = [];
    this.bullets = [];
    this.explosions = [];
    this.remainingSpawns = ENEMIES_PER_LEVEL;
    this.spawnIn = 200;
    this.respawnIn = 0;
    if (resetLives) {
      this.lives = 3;
    }
    const player = createPlayer(this.map.playerSpawn.x, this.map.playerSpawn.y, performance.now());
    this.tanks.push(player);
    this.playerId = player.id;
    this.phase = 'playing';
  }

  private getPlayer(): Tank | null {
    return this.tanks.find((tank) => tank.id === this.playerId) ?? null;
  }

  private tickPlayer(dt: number, input: Input): void {
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
    if (input.isFiring()) {
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
        if (enemy.cooldown <= 0 && Math.random() < 0.03) {
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
      if (flying >= MAX_PLAYER_BULLETS) {
        return;
      }
    }
    this.bullets.push(createBullet(tank));
    tank.cooldown = tank.fireInterval;
    tank.barrelRecoil = 1;
  }

  private tickBullets(now: number): void {
    const nextBullets: Bullet[] = [];
    this.bullets.forEach((bullet) => {
      const vector = DIR_VECTORS[bullet.dir];
      bullet.x += vector.x * BULLET_SPEED;
      bullet.y += vector.y * BULLET_SPEED;
      const centerX = bullet.x + BULLET_SIZE / 2;
      const centerY = bullet.y + BULLET_SIZE / 2;
      if (centerX < 0 || centerY < 0 || centerX > MAP_SIZE || centerY > MAP_SIZE) {
        return;
      }

      const paired = nextBullets.find((other) =>
        rectsOverlap(
          { x: bullet.x, y: bullet.y, w: BULLET_SIZE, h: BULLET_SIZE },
          { x: other.x, y: other.y, w: BULLET_SIZE, h: BULLET_SIZE },
        ),
      );
      if (paired) {
        nextBullets.splice(nextBullets.indexOf(paired), 1);
        this.explosions.push(createExplosion(centerX, centerY, 10));
        return;
      }

      const tileHit = this.map.hitBullet(centerX, centerY);
      if (tileHit === 'base') {
        this.explosions.push(createExplosion(centerX, centerY, 22));
        this.phase = 'lose';
        return;
      }
      if (tileHit === 'brick' || tileHit === 'stop') {
        this.explosions.push(createExplosion(centerX, centerY, 10));
        return;
      }

      const victim = this.tanks.find(
        (tank) =>
          tank.faction !== bullet.faction &&
          tank.invincibleUntil <= now &&
          rectsOverlap(
            { x: bullet.x, y: bullet.y, w: BULLET_SIZE, h: BULLET_SIZE },
            tankRect(tank),
          ),
      );
      if (victim) {
        this.hurtTank(victim);
        this.explosions.push(
          createExplosion(victim.x + TANK_SIZE / 2, victim.y + TANK_SIZE / 2, 16),
        );
        return;
      }
      nextBullets.push(bullet);
    });
    this.bullets = nextBullets;
  }

  private hurtTank(tank: Tank): void {
    tank.hp -= 1;
    if (tank.hp > 0) {
      return;
    }
    this.tanks = this.tanks.filter((item) => item.id !== tank.id);
    if (tank.faction === 'player') {
      this.playerId = null;
      this.lives -= 1;
      if (this.lives <= 0) {
        this.phase = 'lose';
        return;
      }
      this.respawnIn = RESPAWN_DELAY_MS;
      return;
    }
    this.score += SCORE_BY_KIND[tank.kind as EnemyKind];
  }

  private tickExplosions(dt: number): void {
    this.explosions.forEach((explosion) => {
      explosion.age += dt;
    });
    this.explosions = this.explosions.filter((explosion) => explosion.age < explosion.maxAge);
  }

  private tickSpawns(dt: number): void {
    if (this.remainingSpawns <= 0) {
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
    this.spawnIn = SPAWN_INTERVAL_MS;
    const spawnPoint = this.map.enemySpawns.find((point) => isSpawnClear(this.map, this.tanks, point.x, point.y));
    if (!spawnPoint) {
      this.spawnIn = 500;
      return;
    }
    const kind = pickEnemyKind(ENEMIES_PER_LEVEL - this.remainingSpawns);
    this.tanks.push(createEnemy(spawnPoint.x, spawnPoint.y, kind));
    this.remainingSpawns -= 1;
  }

  private tickRespawn(dt: number, now: number): void {
    if (this.playerId !== null || this.lives <= 0 || this.phase !== 'playing') {
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
    const player = createPlayer(spawn.x, spawn.y, now);
    player.invincibleUntil = now + SPAWN_PROTECT_MS;
    this.tanks.push(player);
    this.playerId = player.id;
  }

  private checkRoundEnd(): void {
    if (this.phase !== 'playing') {
      return;
    }
    if (this.map.isBaseDestroyed()) {
      this.phase = 'lose';
      return;
    }
    const enemiesAlive = this.tanks.some((tank) => tank.faction === 'enemy');
    if (!enemiesAlive && this.remainingSpawns <= 0) {
      this.phase = 'win';
    }
  }
}

import { COLS, COMPACT_SIZE, ROWS, TANK_SIZE, TILE } from './constants';
import type { LevelDef } from './levels';
import type { Point, TileType } from './types';

const TILE_BY_CHAR: Record<string, TileType | 'player' | 'enemy' | 'base'> = {
  '.': 0,
  '#': 1,
  '@': 2,
  '~': 3,
  '%': 4,
  P: 'player',
  E: 'enemy',
  B: 'base',
};

function createEmptyTiles(): TileType[][] {
  return Array.from({ length: ROWS }, () => Array<TileType>(COLS).fill(0));
}

export class GameMap {
  tiles: TileType[][] = createEmptyTiles();
  playerSpawn: Point = { x: 0, y: 0 };
  enemySpawns: Point[] = [];
  private baseCells: Point[] = [];

  load(level: LevelDef): void {
    this.tiles = createEmptyTiles();
    this.enemySpawns = [];
    this.baseCells = [];

    for (let row = 0; row < COMPACT_SIZE; row += 1) {
      for (let col = 0; col < COMPACT_SIZE; col += 1) {
        const token = level.layout[row][col];
        const mapped = TILE_BY_CHAR[token] ?? 0;
        const originCol = col * 2;
        const originRow = row * 2;
        const spawn = this.toSpawnPoint(originCol, originRow);

        if (mapped === 'player') {
          this.playerSpawn = spawn;
          continue;
        }
        if (mapped === 'enemy') {
          this.enemySpawns.push(spawn);
          continue;
        }
        if (mapped === 'base') {
          this.fillBlock(originCol, originRow, 5);
          this.baseCells.push(
            { x: originCol, y: originRow },
            { x: originCol + 1, y: originRow },
            { x: originCol, y: originRow + 1 },
            { x: originCol + 1, y: originRow + 1 },
          );
          continue;
        }
        this.fillBlock(originCol, originRow, mapped);
      }
    }

    if (this.enemySpawns.length === 0) {
      this.enemySpawns.push({ x: TILE, y: TILE });
    }
  }

  canTankOccupy(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x + TANK_SIZE > COLS * TILE || y + TANK_SIZE > ROWS * TILE) {
      return false;
    }
    const startCol = Math.floor(x / TILE);
    const startRow = Math.floor(y / TILE);
    const endCol = Math.floor((x + TANK_SIZE - 1) / TILE);
    const endRow = Math.floor((y + TANK_SIZE - 1) / TILE);
    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        const tile = this.getTile(col, row);
        if (tile === 1 || tile === 2 || tile === 3 || tile === 5) {
          return false;
        }
      }
    }
    return true;
  }

  hitBullet(x: number, y: number): 'none' | 'stop' | 'brick' | 'base' {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    const tile = this.getTile(col, row);
    if (tile === 1) {
      this.setTile(col, row, 0);
      return 'brick';
    }
    if (tile === 2) {
      return 'stop';
    }
    if (tile === 5) {
      this.destroyBase();
      return 'base';
    }
    return 'none';
  }

  isBaseDestroyed(): boolean {
    return this.baseCells.every((cell) => this.getTile(cell.x, cell.y) !== 5);
  }

  getBaseCenter(): Point {
    if (this.baseCells.length === 0) {
      return { x: MAP_CENTER, y: MAP_CENTER };
    }
    const sum = this.baseCells.reduce(
      (acc, cell) => ({ x: acc.x + cell.x, y: acc.y + cell.y }),
      { x: 0, y: 0 },
    );
    return {
      x: (sum.x / this.baseCells.length) * TILE + TILE,
      y: (sum.y / this.baseCells.length) * TILE + TILE,
    };
  }

  getTile(col: number, row: number): TileType {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) {
      return 2;
    }
    return this.tiles[row]?.[col] ?? 0;
  }

  private setTile(col: number, row: number, tile: TileType): void {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS || !this.tiles[row]) {
      return;
    }
    this.tiles[row][col] = tile;
  }

  private fillBlock(col: number, row: number, tile: TileType): void {
    this.setTile(col, row, tile);
    this.setTile(col + 1, row, tile);
    this.setTile(col, row + 1, tile);
    this.setTile(col + 1, row + 1, tile);
  }

  private destroyBase(): void {
    this.baseCells.forEach((cell) => {
      this.setTile(cell.x, cell.y, 0);
    });
  }

  private toSpawnPoint(col: number, row: number): Point {
    return {
      x: col * TILE + (TILE * 2 - TANK_SIZE) / 2,
      y: row * TILE + (TILE * 2 - TANK_SIZE) / 2,
    };
  }
}

const MAP_CENTER = (COLS * TILE) / 2;

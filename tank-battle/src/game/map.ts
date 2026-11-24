import { COLS, COMPACT_SIZE, LANE_OFFSET, ROWS, TANK_SIZE, TILE } from './constants';
import { rectsOverlap } from './collision';
import type { LevelDef } from './levels';
import type { BulletImpact, Direction, Point, Rect, TileType } from './types';

type LayoutCell = TileType | 'player' | 'enemy' | 'base';

const TILE_BY_CHAR: Record<string, LayoutCell> = {
  '.': 0,
  '#': 1,
  '@': 2,
  '~': 3,
  '%': 4,
  P: 'player',
  E: 'enemy',
  B: 'base',
};

const CONTACT_OFFSETS = [-2, 2];
const WIDE_DESTROY_OFFSETS = [-10, -2, 2, 10];
const NARROW_DESTROY_OFFSETS = [0, -2, 2];

function createEmptyTiles(): TileType[][] {
  return Array.from({ length: ROWS }, () => Array<TileType>(COLS).fill(0));
}

function isInside(col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < COLS && row < ROWS;
}

function cellRect(cell: Point): Rect {
  return { x: cell.x * TILE, y: cell.y * TILE, w: TILE, h: TILE };
}

export class GameMap {
  tiles: TileType[][] = createEmptyTiles();
  playerSpawn: Point = { x: 0, y: 0 };
  enemySpawns: Point[] = [];
  private baseCells: Point[] = [];
  private baseRing: Point[] = [];
  private fortifiedCells: Point[] = [];

  load(level: LevelDef): void {
    this.tiles = createEmptyTiles();
    this.enemySpawns = [];
    this.baseCells = [];
    this.fortifiedCells = [];

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
    this.baseRing = this.computeBaseRing();
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

  // 玩家子弹按坦克宽度横向清掉两格砖，方便开出通道；敌军子弹每发只清一格，避免基地砖墙被过快打穿。
  hitBullet(
    centerX: number,
    centerY: number,
    dir: Direction,
    breaksSteel: boolean,
    wideBlast: boolean,
  ): BulletImpact {
    const vertical = dir === 0 || dir === 2;
    const cellAt = (offset: number): Point => ({
      x: Math.floor((vertical ? centerX + offset : centerX) / TILE),
      y: Math.floor((vertical ? centerY : centerY + offset) / TILE),
    });
    const contactTiles = CONTACT_OFFSETS.map((offset) => {
      const cell = cellAt(offset);
      return this.getTile(cell.x, cell.y);
    });
    if (contactTiles.includes(5)) {
      this.destroyBase();
      return 'base';
    }
    if (!contactTiles.some((tile) => tile === 1 || tile === 2)) {
      return 'none';
    }

    let brokeBrick = false;
    let brokeSteel = false;
    const destroyOffsets = wideBlast ? WIDE_DESTROY_OFFSETS : NARROW_DESTROY_OFFSETS;
    for (const offset of destroyOffsets) {
      const cell = cellAt(offset);
      if (!isInside(cell.x, cell.y)) {
        continue;
      }
      const tile = this.getTile(cell.x, cell.y);
      if (tile === 1) {
        this.setTile(cell.x, cell.y, 0);
        brokeBrick = true;
      } else if (tile === 2 && breaksSteel) {
        this.setTile(cell.x, cell.y, 0);
        brokeSteel = true;
      }
      if (!wideBlast && (brokeBrick || brokeSteel)) {
        break;
      }
    }
    if (brokeSteel) {
      return 'steelBroken';
    }
    return brokeBrick ? 'brick' : 'steel';
  }

  fortifyBase(blockedRects: Rect[]): void {
    this.baseRing.forEach((cell) => {
      const tile = this.getTile(cell.x, cell.y);
      if (tile === 2 || tile === 3) {
        return;
      }
      if (blockedRects.some((rect) => rectsOverlap(rect, cellRect(cell)))) {
        return;
      }
      this.setTile(cell.x, cell.y, 2);
      if (!this.isFortifiedCell(cell.x, cell.y)) {
        this.fortifiedCells.push(cell);
      }
    });
  }

  restoreBase(blockedRects: Rect[]): void {
    this.fortifiedCells.forEach((cell) => {
      if (blockedRects.some((rect) => rectsOverlap(rect, cellRect(cell)))) {
        return;
      }
      this.setTile(cell.x, cell.y, 1);
    });
    this.fortifiedCells = [];
  }

  isFortifiedCell(col: number, row: number): boolean {
    return this.fortifiedCells.some((cell) => cell.x === col && cell.y === row);
  }

  isBaseDestroyed(): boolean {
    return this.baseCells.every((cell) => this.getTile(cell.x, cell.y) !== 5);
  }

  getBaseRect(): Rect | null {
    if (this.baseCells.length === 0) {
      return null;
    }
    const cols = this.baseCells.map((cell) => cell.x);
    const rows = this.baseCells.map((cell) => cell.y);
    const minCol = Math.min(...cols);
    const minRow = Math.min(...rows);
    return {
      x: minCol * TILE,
      y: minRow * TILE,
      w: (Math.max(...cols) - minCol + 1) * TILE,
      h: (Math.max(...rows) - minRow + 1) * TILE,
    };
  }

  getBaseCenter(): Point {
    const baseRect = this.getBaseRect();
    if (!baseRect) {
      return { x: MAP_CENTER, y: MAP_CENTER };
    }
    return { x: baseRect.x + baseRect.w / 2, y: baseRect.y + baseRect.h / 2 };
  }

  getTile(col: number, row: number): TileType {
    if (!isInside(col, row)) {
      return 2;
    }
    return this.tiles[row]?.[col] ?? 0;
  }

  private setTile(col: number, row: number, tile: TileType): void {
    if (!isInside(col, row) || !this.tiles[row]) {
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
      x: col * TILE + LANE_OFFSET,
      y: row * TILE + LANE_OFFSET,
    };
  }

  private computeBaseRing(): Point[] {
    const baseRect = this.getBaseRect();
    if (!baseRect) {
      return [];
    }
    const playerRect = { x: this.playerSpawn.x, y: this.playerSpawn.y, w: TANK_SIZE, h: TANK_SIZE };
    const minCol = baseRect.x / TILE - 1;
    const minRow = baseRect.y / TILE - 1;
    const maxCol = (baseRect.x + baseRect.w) / TILE;
    const maxRow = (baseRect.y + baseRect.h) / TILE;
    const ring: Point[] = [];
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const cell = { x: col, y: row };
        const insideBase = this.baseCells.some((baseCell) => baseCell.x === col && baseCell.y === row);
        if (insideBase || !isInside(col, row) || rectsOverlap(cellRect(cell), playerRect)) {
          continue;
        }
        ring.push(cell);
      }
    }
    return ring;
  }
}

const MAP_CENTER = (COLS * TILE) / 2;

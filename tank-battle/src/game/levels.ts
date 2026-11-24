import { COMPACT_SIZE } from './constants';
import type { EnemyKind } from './types';

export interface LevelDef {
  name: string;
  layout: string[];
  enemies: Record<EnemyKind, number>;
  spawnIntervalMs: number;
}

const LAYOUT_TOKENS = new Set(['.', '#', '@', '~', '%', 'P', 'E', 'B']);

function createLayout(name: string, rows: string[]): string[] {
  if (rows.length !== COMPACT_SIZE || rows.some((row) => row.length !== COMPACT_SIZE)) {
    throw new Error(`关卡「${name}」必须是 13x13`);
  }
  const tokens = [...rows.join('')];
  const invalidToken = tokens.find((token) => !LAYOUT_TOKENS.has(token));
  if (invalidToken) {
    throw new Error(`关卡「${name}」含有未知格子「${invalidToken}」`);
  }
  const countToken = (target: string): number => tokens.filter((token) => token === target).length;
  if (countToken('P') !== 1 || countToken('B') !== 1 || countToken('E') === 0) {
    throw new Error(`关卡「${name}」需要 1 个玩家出生点、1 个基地和至少 1 个敌军出生点`);
  }
  return rows;
}

export const LEVELS: LevelDef[] = [
  {
    name: '边境哨所',
    enemies: { basic: 6, fast: 4, armor: 2 },
    spawnIntervalMs: 2600,
    layout: createLayout('边境哨所', [
      'E....E....E..',
      '.##.##.##.##.',
      '.##.##.##.##.',
      '.............',
      '###.#.@.#.###',
      '....#...#....',
      '.@........@..',
      '....#####....',
      '###.......###',
      '.##.##.##.##.',
      '.##.......##.',
      '.....##P##...',
      '.....#B#.....',
    ]),
  },
  {
    name: '钢铁要塞',
    enemies: { basic: 5, fast: 5, armor: 4 },
    spawnIntervalMs: 2400,
    layout: createLayout('钢铁要塞', [
      'E.@..E..@.E..',
      '.@@@.##.@@@..',
      '.#.......#.#.',
      '.#.##.##.#.#.',
      '....@@@.@....',
      '##.#.....#.##',
      '.@...###...@.',
      '##.#.....#.##',
      '.....#.#.....',
      '.#.#.###.#.#.',
      '.#.#..P..#.#.',
      '.##.#####.##.',
      '.....#B#.....',
    ]),
  },
  {
    name: '江心渡口',
    enemies: { basic: 5, fast: 6, armor: 5 },
    spawnIntervalMs: 2200,
    layout: createLayout('江心渡口', [
      'E.....E.....E',
      '.##.#...#.##.',
      '.##.#.%.#.##.',
      '.....%%%.....',
      '~~.~~~.~~~.~~',
      '.............',
      '.#.@.#.#.@.#.',
      '.#...#.#...#.',
      '~~.~~~.~~~.~~',
      '....%...%....',
      '.##.#...#.##.',
      '.....##P##...',
      '.....#B#.....',
    ]),
  },
  {
    name: '密林伏击',
    enemies: { basic: 4, fast: 7, armor: 7 },
    spawnIntervalMs: 2000,
    layout: createLayout('密林伏击', [
      'E....%E%....E',
      '.%%.##.##.%%.',
      '.%%.#...#.%%.',
      '....#.@.#....',
      '%%.........%%',
      '%%.##%%%##.%%',
      '...#.....#...',
      '.@.#.%%%.#.@.',
      '.....%%%.....',
      '%%.#.....#.%%',
      '%%.##...##.%%',
      '.....##P##...',
      '.....#B#.....',
    ]),
  },
  {
    name: '最终防线',
    enemies: { basic: 4, fast: 7, armor: 9 },
    spawnIntervalMs: 1800,
    layout: createLayout('最终防线', [
      'E.@..E...@..E',
      '.#@.###.#@.#.',
      '.#..#.#.#..#.',
      '.~~.......~~.',
      '.~~.@@.@@.~~.',
      '....#...#....',
      '@@.#..%..#.@@',
      '....#...#....',
      '.~~.@@.@@.~~.',
      '.~~.......~~.',
      '.#.#..#..#.#.',
      '.....##P##...',
      '.....#B#.....',
    ]),
  },
];

export function getLevelEnemyTotal(level: LevelDef): number {
  return level.enemies.basic + level.enemies.fast + level.enemies.armor;
}

export function buildSpawnQueue(level: LevelDef): EnemyKind[] {
  const queue: EnemyKind[] = [];
  (Object.keys(level.enemies) as EnemyKind[]).forEach((kind) => {
    for (let index = 0; index < level.enemies[kind]; index += 1) {
      queue.push(kind);
    }
  });
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
  }
  return queue;
}

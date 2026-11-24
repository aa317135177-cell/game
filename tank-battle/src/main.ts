import './style.css';
import { MAP_SIZE } from './game/constants';
import { TankBattle } from './game/game';
import { Input } from './game/input';
import { renderWorld } from './game/render';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`缺少页面元素 ${selector}`);
  }
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#game');
const overlay = requireElement<HTMLElement>('#overlay');
const overlayTitle = requireElement<HTMLElement>('#overlay-title');
const overlaySubtitle = requireElement<HTMLElement>('#overlay-subtitle');
const overlayAction = requireElement<HTMLButtonElement>('#overlay-action');
const hudLevel = requireElement<HTMLElement>('#hud-level');
const hudLives = requireElement<HTMLElement>('#hud-lives');
const hudEnemies = requireElement<HTMLElement>('#hud-enemies');
const hudScore = requireElement<HTMLElement>('#hud-score');
const hudStage = requireElement<HTMLElement>('#hud-stage');
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('当前浏览器不支持 Canvas');
}

const gameContext = ctx;
canvas.width = MAP_SIZE;
canvas.height = MAP_SIZE;

const game = new TankBattle();
const input = new Input();
let lastTime = performance.now();

overlayAction.addEventListener('click', () => {
  if (game.phase === 'win') {
    game.continueAfterWin();
    return;
  }
  if (game.phase === 'paused') {
    game.togglePause();
    return;
  }
  game.start();
});

function frame(now: number): void {
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  try {
    game.update(dt, now, input);
    renderWorld(gameContext, game.map, game.tanks, game.bullets, game.explosions, now);
    syncHud();
  } catch (error) {
    console.error('[tank-battle] 游戏循环异常', error);
  }
  requestAnimationFrame(frame);
}

function syncHud(): void {
  const hud = game.getHud();
  hudLevel.textContent = String(hud.level);
  hudLives.textContent = String(Math.max(hud.lives, 0));
  hudEnemies.textContent = String(hud.enemiesLeft);
  hudScore.textContent = String(hud.score);
  hudStage.textContent = game.getLevelName();

  const copy = game.getOverlay();
  if (!copy) {
    overlay.hidden = true;
    return;
  }
  overlay.hidden = false;
  overlayTitle.textContent = copy.title;
  overlaySubtitle.textContent = copy.subtitle;
  overlayAction.textContent = copy.action;
}

requestAnimationFrame(frame);

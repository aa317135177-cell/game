import './style.css';
import { MAP_SIZE, MAX_FIRE_POWER } from './game/constants';
import { drawPowerUpIcon } from './game/draw-effects';
import { TankBattle } from './game/game';
import { Input } from './game/input';
import { isPowerUpKind } from './game/powerups';
import { renderWorld } from './game/render';
import { SoundBoard } from './game/sound';

const LEGEND_ICON_SIZE = 22;
const MAX_FRAME_MS = 32;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`缺少页面元素 ${selector}`);
  }
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#game');
const board = requireElement<HTMLElement>('.board');
const overlay = requireElement<HTMLElement>('#overlay');
const overlayTitle = requireElement<HTMLElement>('#overlay-title');
const overlaySubtitle = requireElement<HTMLElement>('#overlay-subtitle');
const overlayAction = requireElement<HTMLButtonElement>('#overlay-action');
const hudLevel = requireElement<HTMLElement>('#hud-level');
const hudLives = requireElement<HTMLElement>('#hud-lives');
const hudEnemies = requireElement<HTMLElement>('#hud-enemies');
const hudScore = requireElement<HTMLElement>('#hud-score');
const hudStage = requireElement<HTMLElement>('#hud-stage');
const hudPower = requireElement<HTMLElement>('#hud-power');
const soundToggle = requireElement<HTMLButtonElement>('#sound-toggle');
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('当前浏览器不支持 Canvas');
}

const gameContext = ctx;
const game = new TankBattle();
const input = new Input(canvas);
const sound = new SoundBoard();
let lastTime = performance.now();
let renderScale = 1;

// 画布按实际显示尺寸和屏幕像素比渲染，游戏逻辑仍使用 416x416 坐标。
function resizeCanvas(): void {
  const displaySize = board.clientWidth || MAP_SIZE;
  const pixelRatio = window.devicePixelRatio || 1;
  renderScale = (displaySize * pixelRatio) / MAP_SIZE;
  const backingSize = Math.round(MAP_SIZE * renderScale);
  if (canvas.width !== backingSize || canvas.height !== backingSize) {
    canvas.width = backingSize;
    canvas.height = backingSize;
  }
}

function syncSoundToggle(): void {
  soundToggle.textContent = sound.isMuted ? '音效：关' : '音效：开';
  soundToggle.setAttribute('aria-pressed', String(!sound.isMuted));
}

overlayAction.addEventListener('click', () => {
  if (overlay.hidden) {
    return;
  }
  game.confirmOverlay();
  overlayAction.blur();
});

soundToggle.addEventListener('click', () => {
  sound.unlock();
  sound.toggleMute();
  syncSoundToggle();
  soundToggle.blur();
});

window.addEventListener('pointerdown', () => sound.unlock());
window.addEventListener('keydown', () => sound.unlock());
window.addEventListener('resize', resizeCanvas);

function frame(now: number): void {
  const dt = Math.min(MAX_FRAME_MS, now - lastTime);
  lastTime = now;
  try {
    if (input.consumeMute()) {
      sound.toggleMute();
      syncSoundToggle();
    }
    game.update(dt, input);
    game.drainSounds().forEach((name) => sound.play(name));
    gameContext.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    renderWorld(gameContext, game.getRenderState());
    syncHud();
  } catch (error) {
    console.error('[tank-battle] 游戏循环异常', error);
  }
  requestAnimationFrame(frame);
}

function syncHud(): void {
  const hud = game.getHud();
  hudLevel.textContent = `${hud.level}/${hud.levelCount}`;
  hudLives.textContent = String(hud.lives);
  hudEnemies.textContent = String(hud.enemiesLeft);
  hudScore.textContent = String(hud.score);
  hudStage.textContent = game.getLevelName();
  hudPower.textContent = '★'.repeat(hud.firePower) + '☆'.repeat(MAX_FIRE_POWER - hud.firePower);

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

function drawLegendIcons(): void {
  const pixelRatio = window.devicePixelRatio || 1;
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-power-up]').forEach((iconCanvas) => {
    const kind = iconCanvas.dataset.powerUp;
    if (!isPowerUpKind(kind)) {
      console.warn('[tank-battle] 道具图例类型无效', { kind });
      return;
    }
    const iconContext = iconCanvas.getContext('2d');
    if (!iconContext) {
      return;
    }
    iconCanvas.width = LEGEND_ICON_SIZE * pixelRatio;
    iconCanvas.height = LEGEND_ICON_SIZE * pixelRatio;
    iconContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawPowerUpIcon(iconContext, kind, LEGEND_ICON_SIZE / 2, LEGEND_ICON_SIZE / 2, LEGEND_ICON_SIZE - 2);
  });
}

resizeCanvas();
syncSoundToggle();
drawLegendIcons();
requestAnimationFrame(frame);

import type { Direction } from './types';

const DIR_KEYS: Record<string, Direction> = {
  ArrowUp: 0,
  KeyW: 0,
  ArrowRight: 1,
  KeyD: 1,
  ArrowDown: 2,
  KeyS: 2,
  ArrowLeft: 3,
  KeyA: 3,
};

export class Input {
  private readonly directions: Direction[] = [];
  private fireHeld = false;
  private pauseQueued = false;
  private confirmQueued = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clear);
  }

  getDirection(): Direction | null {
    if (this.directions.length === 0) {
      return null;
    }
    return this.directions[this.directions.length - 1];
  }

  isFiring(): boolean {
    return this.fireHeld;
  }

  consumePause(): boolean {
    const queued = this.pauseQueued;
    this.pauseQueued = false;
    return queued;
  }

  consumeConfirm(): boolean {
    const queued = this.confirmQueued;
    this.confirmQueued = false;
    return queued;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clear);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'KeyJ') {
      event.preventDefault();
      this.fireHeld = true;
      return;
    }
    if (event.code === 'KeyP') {
      event.preventDefault();
      this.pauseQueued = true;
      return;
    }
    if (event.code === 'Enter') {
      this.confirmQueued = true;
      return;
    }
    const direction = DIR_KEYS[event.code];
    if (direction === undefined) {
      return;
    }
    event.preventDefault();
    if (!this.directions.includes(direction)) {
      this.directions.push(direction);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'KeyJ') {
      this.fireHeld = false;
      return;
    }
    const direction = DIR_KEYS[event.code];
    if (direction === undefined) {
      return;
    }
    const index = this.directions.indexOf(direction);
    if (index >= 0) {
      this.directions.splice(index, 1);
    }
  };

  private readonly clear = (): void => {
    this.directions.length = 0;
    this.fireHeld = false;
  };
}

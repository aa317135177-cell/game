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
  private muteQueued = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clear);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
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

  consumeMute(): boolean {
    const queued = this.muteQueued;
    this.muteQueued = false;
    return queued;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clear);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyP') {
      event.preventDefault();
      this.pauseQueued = true;
      return;
    }
    if (event.code === 'Enter') {
      event.preventDefault();
      this.confirmQueued = true;
      return;
    }
    if (event.code === 'KeyM') {
      this.muteQueued = true;
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
    const direction = DIR_KEYS[event.code];
    if (direction === undefined) {
      return;
    }
    const index = this.directions.indexOf(direction);
    if (index >= 0) {
      this.directions.splice(index, 1);
    }
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.fireHeld = true;
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    this.fireHeld = false;
  };

  private readonly clear = (): void => {
    this.directions.length = 0;
    this.fireHeld = false;
  };
}

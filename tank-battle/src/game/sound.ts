import type { SoundName } from './types';

interface ToneSpec {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  volume: number;
  delay?: number;
}

interface NoiseSpec {
  duration: number;
  volume: number;
  filter: number;
  delay?: number;
}

interface SoundRecipe {
  tones?: ToneSpec[];
  noises?: NoiseSpec[];
}

const MASTER_VOLUME = 0.32;

const SOUND_RECIPES: Record<SoundName, SoundRecipe> = {
  start: {
    tones: [
      { type: 'square', from: 392, to: 392, duration: 0.1, volume: 0.25 },
      { type: 'square', from: 523, to: 523, duration: 0.1, volume: 0.25, delay: 0.11 },
      { type: 'square', from: 659, to: 659, duration: 0.18, volume: 0.25, delay: 0.22 },
    ],
  },
  fire: {
    tones: [{ type: 'square', from: 880, to: 220, duration: 0.08, volume: 0.18 }],
    noises: [{ duration: 0.06, volume: 0.12, filter: 2400 }],
  },
  hitBrick: {
    noises: [{ duration: 0.12, volume: 0.28, filter: 900 }],
  },
  hitSteel: {
    tones: [{ type: 'triangle', from: 1400, to: 900, duration: 0.09, volume: 0.2 }],
  },
  explode: {
    tones: [{ type: 'sawtooth', from: 180, to: 40, duration: 0.3, volume: 0.22 }],
    noises: [{ duration: 0.35, volume: 0.4, filter: 700 }],
  },
  bigExplode: {
    tones: [{ type: 'sawtooth', from: 120, to: 30, duration: 0.6, volume: 0.3 }],
    noises: [{ duration: 0.7, volume: 0.55, filter: 500 }],
  },
  powerUpSpawn: {
    tones: [
      { type: 'triangle', from: 660, to: 660, duration: 0.08, volume: 0.22 },
      { type: 'triangle', from: 990, to: 990, duration: 0.12, volume: 0.22, delay: 0.09 },
    ],
  },
  powerUpPick: {
    tones: [
      { type: 'square', from: 523, to: 523, duration: 0.07, volume: 0.2 },
      { type: 'square', from: 659, to: 659, duration: 0.07, volume: 0.2, delay: 0.07 },
      { type: 'square', from: 784, to: 784, duration: 0.07, volume: 0.2, delay: 0.14 },
      { type: 'square', from: 1047, to: 1047, duration: 0.14, volume: 0.2, delay: 0.21 },
    ],
  },
  levelClear: {
    tones: [
      { type: 'square', from: 523, to: 523, duration: 0.12, volume: 0.24 },
      { type: 'square', from: 659, to: 659, duration: 0.12, volume: 0.24, delay: 0.13 },
      { type: 'square', from: 784, to: 784, duration: 0.12, volume: 0.24, delay: 0.26 },
      { type: 'square', from: 1047, to: 1047, duration: 0.3, volume: 0.24, delay: 0.39 },
    ],
  },
  gameOver: {
    tones: [
      { type: 'triangle', from: 392, to: 392, duration: 0.22, volume: 0.26 },
      { type: 'triangle', from: 330, to: 330, duration: 0.22, volume: 0.26, delay: 0.24 },
      { type: 'triangle', from: 262, to: 180, duration: 0.5, volume: 0.26, delay: 0.48 },
    ],
  },
};

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export class SoundBoard {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  // 浏览器要求先有用户操作才能出声，所以在第一次点击或按键时才创建音频上下文。
  unlock(): void {
    if (!this.context) {
      const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[tank-battle] 当前浏览器不支持 Web Audio，音效已关闭');
        return;
      }
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch((error: unknown) => {
        console.warn('[tank-battle] 音频恢复失败', error);
      });
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    }
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted || !this.context || !this.master || this.context.state !== 'running') {
      return;
    }
    const recipe = SOUND_RECIPES[name];
    const startAt = this.context.currentTime;
    recipe.tones?.forEach((tone) => this.playTone(tone, startAt));
    recipe.noises?.forEach((noise) => this.playNoise(noise, startAt));
  }

  private playTone(tone: ToneSpec, startAt: number): void {
    if (!this.context || !this.master) {
      return;
    }
    const begin = startAt + (tone.delay ?? 0);
    const end = begin + tone.duration;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.from, begin);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), end);
    gain.gain.setValueAtTime(tone.volume, begin);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(begin);
    oscillator.stop(end + 0.02);
  }

  private playNoise(noise: NoiseSpec, startAt: number): void {
    if (!this.context || !this.master) {
      return;
    }
    const begin = startAt + (noise.delay ?? 0);
    const end = begin + noise.duration;
    const source = this.context.createBufferSource();
    source.buffer = this.getNoiseBuffer(this.context);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = noise.filter;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(noise.volume, begin);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(begin);
    source.stop(end + 0.02);
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }
}

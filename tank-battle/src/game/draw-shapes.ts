export const TAU = Math.PI * 2;

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let index = 0; index < 5; index += 1) {
    const outer = -Math.PI / 2 + (index * TAU) / 5;
    const inner = outer + Math.PI / 5;
    const outerX = x + Math.cos(outer) * radius;
    const outerY = y + Math.sin(outer) * radius;
    if (index === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(x + Math.cos(inner) * radius * 0.42, y + Math.sin(inner) * radius * 0.42);
  }
  ctx.closePath();
  ctx.fill();
}

// 爆炸粒子用固定种子生成，保证同一次爆炸每帧画出的形状一致。
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

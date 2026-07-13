// Average colour of the visible (non-transparent) pixels of RGBA image data,
// as an "r,g,b" string for use in CSS rgba(var(--glow), a). Returns null if
// there is nothing to sample. Pure, so it can be unit-tested.
export function averageColor(data: Uint8ClampedArray | number[]): string | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 128) continue;
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
    n += 1;
  }
  if (n === 0) return null;
  return Math.round(r / n) + "," + Math.round(g / n) + "," + Math.round(b / n);
}

/**
 * Resize an image file to a max dimension while keeping aspect ratio.
 * Returns a base64 data URL (jpeg for smaller payloads).
 */
export async function resizeImage(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Draw a pixelated version of an image onto a canvas.
 * level: 0 = fully pixelated (big blocks), 10 = full resolution
 */
export function drawPixelated(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  level: number,
  w: number,
  h: number
) {
  const blockSize = Math.max(1, Math.round(40 - level * 4));
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = Math.max(1, Math.round(w / blockSize));
  tmpCanvas.height = Math.max(1, Math.round(h / blockSize));
  const tmpCtx = tmpCanvas.getContext('2d')!;
  tmpCtx.imageSmoothingEnabled = false;
  tmpCtx.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmpCanvas, 0, 0, w, h);
}

/**
 * Shuffle an array in-place using Fisher-Yates.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Check if a tile array is solved (each tile[i] === i).
 */
export function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => v === i);
}

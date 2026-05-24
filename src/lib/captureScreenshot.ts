import { toCanvas } from 'html-to-image';

export interface CaptureOptions {
  type?: string;
  quality?: number;
}

// Default to WebP for ~5-10x smaller uploads vs PNG; quality 0.85 is the
// sweet spot for screenshots (visually indistinguishable, much lighter).
export async function captureBrowserScreenshot(
  options: CaptureOptions = {}
): Promise<Blob> {
  const { type = 'image/webp', quality = 0.85 } = options;
  const target = document.documentElement;
  const canvas = await toCanvas(target, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    pixelRatio: window.devicePixelRatio || 1,
    cacheBust: true,
    width: target.clientWidth,
    height: target.clientHeight,
    filter: (node) =>
      !(node instanceof HTMLElement) || node.dataset.screenshotIgnore === undefined,
  });

  const encode = (mime: string): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, mime, quality));

  let blob = await encode(type);
  // Older Safari (<14) can't encode WebP via canvas — fall back to PNG.
  if (!blob && type !== 'image/png') blob = await encode('image/png');
  if (!blob) throw new Error('Failed to encode screenshot');
  return blob;
}

// Pick a sensible file extension from a Blob's MIME type.
export function extensionForBlob(blob: Blob): string {
  const subtype = (blob.type || 'image/png').split('/')[1] || 'png';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

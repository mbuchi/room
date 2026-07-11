import { screenshotNodeFilter, suppressCaptureShadows } from '@aireon/shared';

export interface CaptureOptions {
  type?: string;
  quality?: number;
}

// html-to-image rasterises a clone of the DOM through an SVG <foreignObject>,
// which the browser paints at animation time-0. Any element with a running
// entrance animation is therefore drawn at its keyframe `from` state — e.g. the
// parcel panel's slide-in (from: translateX(100%); opacity:0) lands off-screen,
// dropping it from the saved image. Blanking CSS animations + transitions for
// the capture makes html-to-image inline `animation: none` (it copies computed
// style), so every node rasterises at its settled state. Reverted in `finally`.
function freezeMotionForCapture(): () => void {
  const style = document.createElement('style');
  style.setAttribute('data-screenshot-motion-freeze', '');
  style.textContent =
    '*,*::before,*::after{animation:none !important;transition:none !important}';
  document.head.appendChild(style);
  return () => style.remove();
}

// Default to WebP for ~5-10x smaller uploads vs PNG; quality 0.85 is the
// sweet spot for screenshots (visually indistinguishable, much lighter).
export async function captureBrowserScreenshot(
  options: CaptureOptions = {}
): Promise<Blob> {
  const { type = 'image/webp', quality = 0.85 } = options;
  // Lazy: html-to-image is only needed the moment the user hits the capture
  // button — a dynamic import keeps it out of the initial bundle. Loaded
  // BEFORE the shadow/motion freeze below so a slow fetch never leaves the
  // live UI in its frozen capture state.
  const { toCanvas } = await import('html-to-image');
  const target = document.documentElement;
  // Blank the box-shadow of every [data-screenshot-deshadow] element for the
  // duration of the capture so the parcel panel's drop-shadow doesn't bleed a
  // faint strip onto the map in the saved image. restoreShadows() reinstates
  // the live UI once the canvas is rasterised — wrapped in try/finally so the
  // restore runs even if encoding throws.
  const restoreShadows = suppressCaptureShadows();
  // Keep the parcel info panel (and any other animated content) in the export:
  // freeze entrance animations so the clone rasterises at its settled state.
  const restoreMotion = freezeMotionForCapture();
  try {
    const canvas = await toCanvas(target, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      pixelRatio: window.devicePixelRatio || 1,
      cacheBust: true,
      width: target.clientWidth,
      height: target.clientHeight,
      // Shared node filter: drop every [data-screenshot-ignore] element (navbar,
      // address search, Claire launcher, map controls) so only the map result +
      // its legend land in the export.
      filter: screenshotNodeFilter,
    });

    const encode = (mime: string): Promise<Blob | null> =>
      new Promise((resolve) => canvas.toBlob(resolve, mime, quality));

    let blob = await encode(type);
    // Older Safari (<14) can't encode WebP via canvas — fall back to PNG.
    if (!blob && type !== 'image/png') blob = await encode('image/png');
    if (!blob) throw new Error('Failed to encode screenshot');
    return blob;
  } finally {
    restoreMotion();
    restoreShadows();
  }
}

// Pick a sensible file extension from a Blob's MIME type.
export function extensionForBlob(blob: Blob): string {
  const subtype = (blob.type || 'image/png').split('/')[1] || 'png';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

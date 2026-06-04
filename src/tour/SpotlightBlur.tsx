import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// react-joyride dims the page via a full-screen overlay (overlayColor +
// mixBlendMode: hard-light) and "punches" a hole over the focused element with
// a gray spotlight. A backdrop-filter on that overlay can't be punched by the
// blend, so blurring the overlay also blurs the highlighted element — exactly
// what we don't want. Instead we render our OWN full-screen blur layer just
// beneath Joyride's overlay and clip a hole out of it that tracks the spotlight,
// so the page goes soft-focus everywhere EXCEPT the highlighted area.
//
// The blur is gated on TWO things being true: Joyride's overlay is on screen,
// AND there is a spotlight rect to cut a hole around. So a tour with no
// resolvable steps (no overlay) or a centered/target-less step (no spotlight)
// never produces a stuck full-screen blur — it simply renders nothing.

type Rect = { top: number; left: number; width: number; height: number };

const OVERLAY_SELECTOR = ".react-joyride__overlay";
const SPOTLIGHT_SELECTOR = ".react-joyride__spotlight";

// Keep the last hole this long through brief spotlight gaps (step transition /
// scroll repaint) before deciding the step is genuinely target-less.
const ABSENCE_GRACE_MS = 240;

// A rounded-rect subpath for the cutout, matching Joyride's spotlight radius.
function roundedRectPath(r: Rect, radius: number): string {
  const rad = Math.max(0, Math.min(radius, r.width / 2, r.height / 2));
  const { left: x, top: y, width: w, height: h } = r;
  return (
    `M${x + rad},${y} ` +
    `H${x + w - rad} ` +
    `A${rad},${rad} 0 0 1 ${x + w},${y + rad} ` +
    `V${y + h - rad} ` +
    `A${rad},${rad} 0 0 1 ${x + w - rad},${y + h} ` +
    `H${x + rad} ` +
    `A${rad},${rad} 0 0 1 ${x},${y + h - rad} ` +
    `V${y + rad} ` +
    `A${rad},${rad} 0 0 1 ${x + rad},${y} Z`
  );
}

export function SpotlightBlur({
  active,
  blurPx = 3,
  zIndex,
  radius = 14,
}: {
  active: boolean;
  blurPx?: number;
  /** Sit one layer below Joyride's overlay (options.zIndex). */
  zIndex: number;
  radius?: number;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [overlayPresent, setOverlayPresent] = useState(false);
  const lastRectRef = useRef<Rect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      setOverlayPresent(false);
      lastRectRef.current = null;
      return;
    }

    let raf = 0;
    let mounted = true;
    let elapsed = 0; // monotonic frame clock — avoids Date.now() churn
    let lastSeen = 0;

    const tick = () => {
      if (!mounted) return;
      elapsed += 16;

      // Only blur while Joyride is actually showing its overlay.
      const hasOverlay = !!document.querySelector(OVERLAY_SELECTOR);
      setOverlayPresent((prev) => (prev === hasOverlay ? prev : hasOverlay));

      const el = document.querySelector(SPOTLIGHT_SELECTOR) as HTMLElement | null;
      if (el) {
        const b = el.getBoundingClientRect();
        const next: Rect = { top: b.top, left: b.left, width: b.width, height: b.height };
        lastSeen = elapsed;
        const prev = lastRectRef.current;
        const changed =
          !prev ||
          Math.abs(prev.top - next.top) > 0.5 ||
          Math.abs(prev.left - next.left) > 0.5 ||
          Math.abs(prev.width - next.width) > 0.5 ||
          Math.abs(prev.height - next.height) > 0.5;
        if (changed) {
          lastRectRef.current = next;
          setRect(next);
        }
      } else if (elapsed - lastSeen > ABSENCE_GRACE_MS && lastRectRef.current) {
        // Sustained absence → target-less (centered) step: drop the blur
        // entirely rather than blur the whole screen.
        lastRectRef.current = null;
        setRect(null);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(raf);
    };
  }, [active]);

  // Blur ONLY when the tour is genuinely highlighting an element: active +
  // Joyride overlay present + a spotlight rect to cut a hole around.
  if (
    !active ||
    !overlayPresent ||
    !rect ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const clip = `path(evenodd, "M0,0 H100000 V100000 H0 Z ${roundedRectPath(rect, radius)}")`;
  const style: React.CSSProperties & { WebkitClipPath?: string } = {
    position: "fixed",
    inset: 0,
    zIndex,
    pointerEvents: "none",
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
    clipPath: clip,
    WebkitClipPath: clip,
  };

  return createPortal(<div aria-hidden style={style} />, document.body);
}

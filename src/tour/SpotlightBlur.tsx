import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// react-joyride dims the page via a full-screen overlay (overlayColor +
// mixBlendMode: hard-light) and "punches" a hole over the focused element with
// a gray spotlight. A backdrop-filter on that overlay can't be punched by the
// blend, so blurring the overlay also blurs the highlighted element — which is
// exactly what we don't want. Instead we render our OWN full-screen blur layer
// just beneath Joyride's overlay and clip a hole out of it that tracks the
// spotlight, so the page goes soft-focus everywhere EXCEPT the highlighted area.

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_SELECTOR = ".react-joyride__spotlight";

// The spotlight element briefly vanishes during step transitions and while the
// scroll-parent repaints. Keep the last hole that long before deciding a step is
// genuinely target-less (placement: "center") and blurring the whole viewport.
const ABSENCE_GRACE_MS = 220;

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
  const lastSeenRef = useRef(0);
  const lastRectRef = useRef<Rect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      lastRectRef.current = null;
      return;
    }

    let raf = 0;
    let mounted = true;
    let elapsed = 0; // monotonic frame clock — avoids Date.now() churn

    const tick = (_now: number) => {
      if (!mounted) return;
      elapsed += 16;
      const el = document.querySelector(SPOTLIGHT_SELECTOR) as HTMLElement | null;

      if (el) {
        const b = el.getBoundingClientRect();
        const next: Rect = { top: b.top, left: b.left, width: b.width, height: b.height };
        lastSeenRef.current = elapsed;
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
      } else if (elapsed - lastSeenRef.current > ABSENCE_GRACE_MS && lastRectRef.current) {
        // Sustained absence → target-less (centered) step: blur everything.
        lastRectRef.current = null;
        setRect(null);
      }
      // Brief absence → keep the last hole (transition / scroll repaint).

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(raf);
    };
  }, [active]);

  if (!active || typeof document === "undefined") return null;

  const style: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex,
    pointerEvents: "none",
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
  };

  if (rect && rect.width > 0 && rect.height > 0) {
    // Oversized outer rect (clipped to the fixed viewport box) minus the
    // spotlight hole, with the even-odd rule carving the hole out.
    const clip = `path(evenodd, "M0,0 H100000 V100000 H0 Z ${roundedRectPath(rect, radius)}")`;
    style.clipPath = clip;
    (style as React.CSSProperties & { WebkitClipPath?: string }).WebkitClipPath = clip;
  }

  return createPortal(<div aria-hidden style={style} />, document.body);
}

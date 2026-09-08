/**
 * Guards for MapLibre's GPU-initialisation failure — which the engine reports
 * TWO different ways depending on the version installed.
 *
 * ⚠ The engine changed its mind in 6.7.0, and a guard written for one half is
 * DEAD CODE under the other:
 *
 *   | engine   | `_setupPainter()` on a refused WebGL2 context | `new Map()`      |
 *   |----------|----------------------------------------------|------------------|
 *   | <= 6.6.0 | FIRES a `GPUInitializationError` event and    | RESOLVES, hands  |
 *   |          | returns; ctor: `if (!this.painter) return;`   | back a painter-  |
 *   |          |                                              | less Map         |
 *   | >= 6.7.0 | `throw new GPUInitializationError(...)`; ctor | THROWS           |
 *   |          | `_cleanupContainer()`s and rethrows           |                  |
 *
 * room ships the 6.7.0 engine, so the post-construction painter gate this
 * module rolled out in Aug 2026 is no longer the limb that fires — the throw
 * sails straight past it. Conversely a plain `try { new Map(...) } catch {}`
 * never runs on 6.6.0 and earlier. BOTH halves are needed, and both now live in
 * one place: `constructMapSafely` from `@aireon/shared/webgl` (v1.211.0+), which
 * folds them into a `null` return and RETHROWS anything that is not a GPU-init
 * failure, so a bad style, a missing container or a real bug stays loud and
 * still reaches MapView's terminal `.catch`.
 *
 * The 6.6.0 limb has not stopped mattering: it is also the shape a map takes
 * when its GL context dies MID-SESSION (MapLibre clears the painter), which is
 * what `mapStillLive` below reads on every late callback. On that limb
 * construction *looks* successful, the half-built object gets stored, and it
 * only detonates later, somewhere unrelated:
 *
 *   - `Marker.addTo` / `easeTo` / `project`
 *       -> "Cannot read properties of undefined (reading '0')"
 *   - `remove()`, which runs `this.painter.destroy()` unconditionally
 *       -> "Cannot read properties of undefined (reading 'destroy')"
 *
 * One environment condition, three unrelated-looking crash signatures. So:
 * preflight WebGL2, then construct through the shared helper BEFORE the
 * instance is stored anywhere, then re-check on every callback that runs on its
 * own clock.
 *
 * Apart from that one helper these guards deliberately import nothing. room's
 * unit suite runs in vitest's `node` environment, and the `@aireon/shared`
 * BARREL touches `window` at module scope (see the note in
 * `__tests__/versionLockstep.test.ts`) — the `@aireon/shared/webgl` SUBPATH does
 * not, so it is safe to pull in here, but the barrel still is not. The WebGL2
 * preflight therefore stays INJECTED by the caller rather than imported: MapView
 * passes the shared `isWebGLAvailable()` answer it already computed at mount.
 * Reusing that one probe rather than running a second one matters, because the
 * shared probe holds on to the context it creates and room can already be
 * carrying a second live MapLibre instance (the Massing tab's buildable-massing
 * scene).
 */
import { constructMapSafely } from '@aireon/shared/webgl';

/**
 * The shape the guards below need from a MapLibre map: the painter MapLibre only
 * assigns once a WebGL2 context exists, and the teardown that dereferences it.
 */
export interface StartedMapLike {
  painter?: unknown;
  remove(): void;
}

/**
 * The one map-startup failure that belongs to the VISITOR'S DEVICE rather than
 * to room: no usable WebGL2 context, so there is nothing to draw the map into.
 * It ends in the same shared `<MapUnavailable/>` panel as any other startup
 * failure, but callers log it as a WARNING, never an error — the shared bug
 * reporter mirrors `console.error` into the Bug Tracker, and a GPU-less visitor
 * is not a room defect (bug #900).
 */
export class MapStartupUnsupportedError extends Error {
  constructor(message = 'WebGL2 is unavailable') {
    super(message);
    this.name = 'MapStartupUnsupportedError';
  }
}

/**
 * Construct a map only when WebGL2 is there, and adopt it only when MapLibre
 * really built a painter. Returns `null` when the map is unusable, having
 * already released whatever was built and logged exactly one warning; the
 * caller renders its map-unavailable state instead.
 *
 * The construction goes through the shared `constructMapSafely`, the only
 * version-agnostic half of this (see the module note): it turns BOTH the
 * >= 6.7.0 throw and the <= 6.6.0 painter-less instance into `null`, releasing
 * the latter, and rethrows everything else unchanged. That rethrow is the point
 * — a bad style, a missing container or a genuine bug must not be laundered
 * into "no WebGL here"; it travels on to MapView's terminal `.catch` and still
 * gets its console.error.
 *
 * `supported` is the preflight answer, injected (see the module note). It is
 * checked again here rather than only at effect entry because construction
 * happens after an `await` — room resolves the basemap style over the network
 * first — and the caller's own early return was evaluated before that gap.
 */
export function startMapGuarded<T extends StartedMapLike>(
  create: () => T,
  label: string,
  supported: () => boolean,
): T | null {
  if (!supported()) {
    console.warn(`${label}:`, new MapStartupUnsupportedError().message);
    return null;
  }
  // The preflight asks a throwaway canvas for a bare webgl2 context; the map
  // asks for one with depth + stencil on its own canvas, later, and only that
  // request can fail the way this guard catches. A device already at its
  // context limit — or one whose GPU process died during the style fetch —
  // passes the probe and still lands here.
  const map = constructMapSafely(create);
  if (!map) {
    console.warn(
      `${label}:`,
      new MapStartupUnsupportedError('MapLibre could not create a WebGL2 painter').message,
    );
    return null;
  }
  return map;
}

/**
 * Teardown that cannot itself throw. A half-built map's `remove()` dereferences
 * the painter it never got, and a React cleanup function that throws takes the
 * whole unmount down with it — the second, unrelated-looking crash in this class.
 */
export function removeMapSafely(map: StartedMapLike | null | undefined, label: string): void {
  if (!map) return;
  try {
    map.remove();
  } catch (e) {
    console.warn(`${label}: teardown of a half-built map failed`, e);
  }
}

/**
 * Late-callback gate. Anything that runs after construction on its own clock —
 * a MapLibre event, a resolved promise, a geolocation fix, a timer — must
 * re-check that the map it captured is STILL the live one and still
 * painter-backed. Read the LIVE ref (never a captured instance, and never React
 * state, which trails the ref by a frame): that is what closes the
 * after-unmount race a StrictMode remount can open.
 */
export function mapStillLive<T extends StartedMapLike>(
  map: T | null | undefined,
  live: T | null | undefined,
): boolean {
  return !!map && map === live && !!map.painter;
}

/**
 * Bounded retry for the basemap style fetch, mirroring the shared map-bootstrap
 * factory (`createAireonMap`: two extra attempts, linear 1 s / 2 s backoff).
 *
 * room resolves the swisstopo style.json over the network BEFORE it constructs
 * the map, and that one read used to be a single shot: a slow style host, a
 * cold cache on a first visit, or a blip on the way to vectortiles.geo.admin.ch
 * ended in `<MapUnavailable/>` and a Bug Tracker entry (bug #1364), although
 * the very next request would have succeeded. The shared basemap cache evicts a
 * rejected read and keeps no negative marker for styles, so every attempt here
 * genuinely refetches.
 */
export const STYLE_FETCH_MAX_RETRIES = 2;
export const STYLE_FETCH_BACKOFF_MS = 1000;

export interface RetryBoundedOptions {
  /** Extra attempts after the first one. */
  retries: number;
  /** Attempt `n` waits `backoffMs * n` before running. */
  backoffMs: number;
  /** Checked before every wait and every re-run; a cancelled caller (unmount,
   *  StrictMode remount) gets the last error back immediately instead of a
   *  retry nobody is listening to. */
  isCancelled?: () => boolean;
  /** Observability hook, fired once per retry with the error that caused it. */
  onRetry?: (error: unknown, attempt: number) => void;
}

export async function retryBounded<T>(
  run: () => Promise<T>,
  options: RetryBoundedOptions,
): Promise<T> {
  const { retries, backoffMs, isCancelled = () => false, onRetry } = options;
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || isCancelled()) throw error;
      attempt += 1;
      onRetry?.(error, attempt);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, backoffMs * attempt);
      });
      if (isCancelled()) throw error;
    }
  }
}

/**
 * The basemap style could not be fetched even after the bounded retries. It is
 * an upstream / network condition, not a device one, so the caller shows the
 * "map could not be loaded, reload to try again" copy rather than the WebGL
 * advice, and keeps the real cause attached for the console.
 */
export class BasemapStyleUnreachableError extends Error {
  readonly styleUrl: string;
  readonly reason: unknown;
  readonly attempts: number;

  constructor(styleUrl: string, reason: unknown, attempts: number) {
    const detail = reason instanceof Error ? reason.message : String(reason);
    super(`Basemap style ${styleUrl} unreachable after ${attempts} attempts: ${detail}`);
    this.name = 'BasemapStyleUnreachableError';
    this.styleUrl = styleUrl;
    this.reason = reason;
    this.attempts = attempts;
  }
}

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BasemapStyleUnreachableError,
  MapStartupUnsupportedError,
  STYLE_FETCH_BACKOFF_MS,
  STYLE_FETCH_MAX_RETRIES,
  mapStillLive,
  removeMapSafely,
  retryBounded,
  startMapGuarded,
} from './mapStartup';

/**
 * Faithful model of what maplibre-gl 6.3.0 — the engine room pins — hands back
 * when the WebGL2 context cannot be created. Transcribed from the engine's own
 * source (`node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`) so these tests
 * reproduce the real crash rather than a guess at it:
 *
 *   _setupPainter():
 *       const gl = this._canvas.getContext('webgl2', attributes);
 *       if (!gl) { this.fire(new ErrorEvent(new GPUInitializationError(...))); return; }
 *       this.painter = new Painter(gl, this._camera.transform);
 *
 *   constructor:
 *       this._setupPainter();
 *       if (!this.painter) return;          <- returns a half-built Map, NO throw
 *
 *   remove():
 *       ... this.painter.destroy(); this._handlers.destroy(); ...
 *       -> "Cannot read properties of undefined (reading 'destroy')"
 */
class HalfBuiltMap {
  painter: { destroy(): void } | undefined = undefined;
  private _handlers: { destroy(): void } | undefined = undefined;
  removeCalls = 0;

  remove(): void {
    this.removeCalls += 1;
    this.painter!.destroy();
    this._handlers!.destroy();
  }

  /** Stand-in for Marker.addTo / easeTo / project on a painter-less map. */
  use(): void {
    throw new TypeError("Cannot read properties of undefined (reading '0')");
  }
}

class WorkingMap {
  painter: { destroy(): void } = { destroy: () => {} };
  removeCalls = 0;
  remove(): void {
    this.removeCalls += 1;
  }
  use(): void {}
}

const webgl2Present = () => true;
const webgl2Absent = () => false;

/* ──────────────────────────────────────────────────────────────────────────
   Non-vacuity: if the stub itself stops behaving like the engine, every guard
   test below is asserting against something that cannot fail.
   ────────────────────────────────────────────────────────────────────────── */
describe('the half-built-map model itself (non-vacuity)', () => {
  it('does not throw at construction — so try/catch around `new Map()` is NOT protection', () => {
    expect(() => new HalfBuiltMap()).not.toThrow();
    expect(new HalfBuiltMap().painter).toBeUndefined();
  });

  it('really crashes the documented way once anything touches it', () => {
    expect(() => new HalfBuiltMap().use()).toThrow(
      "Cannot read properties of undefined (reading '0')",
    );
    expect(() => new HalfBuiltMap().remove()).toThrow(
      "Cannot read properties of undefined (reading 'destroy')",
    );
  });

  it('models a healthy map that is neither crashy nor mistaken for a broken one', () => {
    const ok = new WorkingMap();
    expect(() => ok.use()).not.toThrow();
    expect(() => ok.remove()).not.toThrow();
    expect(ok.painter).toBeTruthy();
  });
});

describe('MapStartupUnsupportedError', () => {
  it('is a distinguishable typed error, not a bare Error', () => {
    expect(new MapStartupUnsupportedError()).toBeInstanceOf(MapStartupUnsupportedError);
    expect(new MapStartupUnsupportedError().name).toBe('MapStartupUnsupportedError');
    expect(new Error('WebGL2 is unavailable')).not.toBeInstanceOf(MapStartupUnsupportedError);
  });
});

describe('startMapGuarded', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands back a painter-backed map untouched', () => {
    const map = new WorkingMap();
    expect(startMapGuarded(() => map, 'room map', webgl2Present)).toBe(map);
    expect(map.removeCalls).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('never even constructs the map when WebGL2 is unavailable', () => {
    const create = vi.fn(() => new WorkingMap());
    expect(startMapGuarded(create, 'room map', webgl2Absent)).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('room map:', 'WebGL2 is unavailable');
    // An environment condition, not a room defect: console.error is mirrored
    // into the Bug Tracker and would file one row per GPU-less visit (#900).
    expect(error).not.toHaveBeenCalled();
  });

  it('refuses the painter-less map MapLibre returns instead of throwing', () => {
    // Unguarded — what room's init effect used to do: construction "succeeds",
    // the instance is stored in mapRef, and the next call detonates.
    const unguarded = new HalfBuiltMap();
    let stored: HalfBuiltMap | null = null;
    expect(() => {
      stored = unguarded;
      stored.use();
    }).toThrow(TypeError);

    // Guarded: the caller is handed null and never stores or touches it.
    const half = new HalfBuiltMap();
    let live: HalfBuiltMap | null = null;
    const adopted = startMapGuarded(() => half, 'room map', webgl2Present);
    if (adopted) {
      live = adopted;
      live.use();
    }
    expect(adopted).toBeNull();
    expect(live).toBeNull();

    // ...and it disposed the reject, swallowing remove()'s own painter crash.
    expect(half.removeCalls).toBe(1);
    expect(warn).toHaveBeenCalledWith('room map:', 'map started without a WebGL2 painter');
    expect(error).not.toHaveBeenCalled();
  });

  it('catches a context that dies AFTER the preflight passed', () => {
    // room preflights at mount, then awaits the basemap style over the network
    // before constructing. This models the window that opens in between: the
    // probe says yes, the map still comes back painter-less.
    const half = new HalfBuiltMap();
    expect(startMapGuarded(() => half, 'room map', webgl2Present)).toBeNull();
    // Two warnings, both benign: the painter gate, then the disposal swallowing
    // the reject's own painter.destroy() crash. Never a console.error.
    expect(warn).toHaveBeenCalledWith('room map:', 'map started without a WebGL2 painter');
    expect(warn).toHaveBeenCalledWith('room map: teardown of a half-built map failed', expect.any(TypeError));
    expect(error).not.toHaveBeenCalled();
  });
});

describe('removeMapSafely', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tears a healthy map down normally', () => {
    const map = new WorkingMap();
    removeMapSafely(map, 'room map');
    expect(map.removeCalls).toBe(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("swallows the half-built map's painter.destroy() crash", () => {
    const half = new HalfBuiltMap();
    // Unguarded, this is the throw that escapes room's effect cleanup and takes
    // the unmount down with it.
    expect(() => half.remove()).toThrow("Cannot read properties of undefined (reading 'destroy')");
    const other = new HalfBuiltMap();
    expect(() => removeMapSafely(other, 'room map')).not.toThrow();
    expect(other.removeCalls).toBe(1);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('is a no-op on a ref that was already cleared', () => {
    expect(() => removeMapSafely(null, 'room map')).not.toThrow();
    expect(() => removeMapSafely(undefined, 'room map')).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('mapStillLive', () => {
  it('is true only for the live, painter-backed instance', () => {
    const map = new WorkingMap();
    expect(mapStillLive(map, map)).toBe(true);
  });

  it('is false once the live ref was cleared — the after-unmount race', () => {
    const map = new WorkingMap();
    expect(mapStillLive(map, null)).toBe(false);
  });

  it('is false for an instance the ref has moved on from (StrictMode remount)', () => {
    expect(mapStillLive(new WorkingMap(), new WorkingMap())).toBe(false);
  });

  it('is false when the captured map lost its painter', () => {
    const map = new WorkingMap();
    (map as { painter?: unknown }).painter = undefined;
    expect(mapStillLive(map, map)).toBe(false);
  });

  it('is false for a half-built map even when it is the one stored', () => {
    const half = new HalfBuiltMap();
    expect(mapStillLive(half, half)).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Wiring. The guards above are worthless if MapView stops routing through
   them, and nothing else catches that: the build, typecheck and lint all stay
   green whichever way the init effect is written. Same idiom the existing
   mapWorkerSeam suite uses for the other invisible MapLibre seam.
   ────────────────────────────────────────────────────────────────────────── */
const mapView = readFileSync(new URL('../components/MapView.tsx', import.meta.url), 'utf8');

describe('MapView routes its map through the startup guards', () => {
  it('gates construction on the painter BEFORE the instance reaches mapRef', () => {
    const constructed = mapView.indexOf('new maplibre.Map(');
    const guarded = mapView.indexOf('startMapGuarded(');
    const stored = mapView.indexOf('mapRef.current = map;');

    expect(guarded, 'MapView must construct via startMapGuarded').toBeGreaterThan(-1);
    expect(constructed).toBeGreaterThan(-1);
    expect(stored, 'MapView must still store the map in mapRef').toBeGreaterThan(-1);
    // The guard wraps the constructor, and the ref assignment comes after it.
    expect(guarded).toBeLessThan(constructed);
    expect(constructed).toBeLessThan(stored);
    // A bare `new maplibre.Map(` that is not the one inside startMapGuarded
    // would be a second, unguarded construction site.
    expect(mapView.split('new maplibre.Map(')).toHaveLength(2);
  });

  it('tears the map down through removeMapSafely, never a bare remove()', () => {
    expect(mapView).toContain('removeMapSafely(mapRef.current');
    // MapLibre's own remove() dereferences the painter unconditionally, so a
    // raw mapRef.current.remove() in the cleanup is the crash, not the fix.
    expect(mapView).not.toMatch(/mapRef\.current\??\.remove\(\)/);
  });

  it('re-checks the live map on the late-callback surfaces', () => {
    // The style 'load' handler and the geolocation-driven Marker.addTo are the
    // two callbacks that run on their own clock after construction.
    expect(mapView.match(/mapStillLive\(map, mapRef\.current\)/g) ?? []).toHaveLength(2);
  });
});

describe('retryBounded (basemap style fetch, bug #1364)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mirrors the shared map-bootstrap budget: two retries, 1 s linear backoff', () => {
    expect(STYLE_FETCH_MAX_RETRIES).toBe(2);
    expect(STYLE_FETCH_BACKOFF_MS).toBe(1000);
  });

  it('returns the first successful attempt and never waits when nothing fails', async () => {
    const run = vi.fn().mockResolvedValue('style');
    await expect(retryBounded(run, { retries: 2, backoffMs: 1000 })).resolves.toBe('style');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries a failed read with linear backoff and resolves once it succeeds', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('Style x could not be loaded'))
      .mockRejectedValueOnce(new Error('Style x failed with 503'))
      .mockResolvedValueOnce('style');
    const onRetry = vi.fn();
    const pending = retryBounded(run, { retries: 2, backoffMs: 1000, onRetry });

    // First failure -> waits 1 s.
    await vi.advanceTimersByTimeAsync(999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    // Second failure -> waits 2 s.
    await vi.advanceTimersByTimeAsync(1999);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(3);

    await expect(pending).resolves.toBe('style');
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][1]).toBe(1);
    expect(onRetry.mock.calls[1][1]).toBe(2);
  });

  it('gives up with the LAST error once the retries are spent', async () => {
    const last = new Error('Style x failed with 503');
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockRejectedValueOnce(last);
    const pending = retryBounded(run, { retries: 2, backoffMs: 1000 });
    const settled = pending.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(3000);
    expect(run).toHaveBeenCalledTimes(3);
    await expect(settled).resolves.toBe(last);
  });

  it('stops retrying once the caller is cancelled (unmount / StrictMode remount)', async () => {
    let cancelled = false;
    const run = vi.fn().mockRejectedValue(new Error('boom'));
    const pending = retryBounded(run, {
      retries: 2,
      backoffMs: 1000,
      isCancelled: () => cancelled,
    });
    const settled = pending.catch((e: unknown) => e);
    // Fails once, schedules the 1 s wait; the effect is torn down meanwhile.
    await vi.advanceTimersByTimeAsync(500);
    cancelled = true;
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(1);
    await expect(settled).resolves.toBeInstanceOf(Error);
  });
});

describe('BasemapStyleUnreachableError', () => {
  it('names the style, the attempt count and the underlying cause', () => {
    const cause = new Error('Style https://x/style.json could not be loaded');
    const err = new BasemapStyleUnreachableError('https://x/style.json', cause, 3);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('BasemapStyleUnreachableError');
    expect(err.styleUrl).toBe('https://x/style.json');
    expect(err.attempts).toBe(3);
    expect(err.reason).toBe(cause);
    expect(err.message).toContain('after 3 attempts');
    expect(err.message).toContain('could not be loaded');
  });
});

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
 * Faithful model of what maplibre-gl <= 6.6.0 hands back when the WebGL2
 * context cannot be created. Transcribed from maplibre-gl 6.3.0's own source
 * (`dist/maplibre-gl-dev.mjs`) so these tests reproduce the real crash rather
 * than a guess at it:
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
 *
 * ⚠ This is NO LONGER the engine room ships. Since v0.47.0 room is on
 * maplibre-gl 6.7.0, which THROWS instead (see `GpuInitializationError` /
 * `refuseWebGL2` below). The shape still models two live situations, which is
 * why it stays: a GL context that dies MID-SESSION leaves exactly this
 * painter-less object behind, and it is what `mapStillLive` and
 * `removeMapSafely` are written against.
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

/**
 * Faithful model of what maplibre-gl >= 6.7.0 does instead. Transcribed from
 * the installed 6.7.0 (`dist/maplibre-gl-dev.mjs`), both halves:
 *
 *   _setupPainter():
 *       const gl = this._canvas.getContext('webgl2', attributes);
 *       if (!gl) throw new GPUInitializationError(attributes, creationEvent);
 *
 *   constructor:
 *       try { this._setupPainter(); }
 *       catch (error) { this._cleanupContainer(); throw error; }
 *
 * The class is matched by NAME, never `instanceof`: room loads the engine from
 * static.aireon.ch through an import map, so the class an app would catch is
 * not the one any bundled copy exposes.
 */
class GpuInitializationError extends Error {
  readonly requestedAttributes: Record<string, boolean>;
  readonly statusMessage: string | null;

  constructor(statusMessage: string | null = null) {
    super(
      'WebGL2 is required to display this map. We are sorry, but it seems that your browser ' +
        'does not support WebGL2, a technology for rendering 3D graphics on the web. Read more ' +
        'on https://wiki.openstreetmap.org/wiki/This_map_requires_WebGL',
    );
    this.name = 'GPUInitializationError';
    this.requestedAttributes = { alpha: true, depth: true, stencil: true, premultipliedAlpha: true };
    this.statusMessage = statusMessage;
  }
}

/** A `create` thunk that behaves like the 6.7.0 constructor on a refused context. */
const refuseWebGL2 = (): never => {
  throw new GpuInitializationError('Could not create a WebGL2 context, GL_VENDOR = Disabled');
};

const webgl2Present = () => true;
const webgl2Absent = () => false;

/* ──────────────────────────────────────────────────────────────────────────
   Non-vacuity: if the stub itself stops behaving like the engine, every guard
   test below is asserting against something that cannot fail.
   ────────────────────────────────────────────────────────────────────────── */
describe('the engine models themselves (non-vacuity)', () => {
  it('models BOTH engine behaviours, which are mutually exclusive', () => {
    // <= 6.6.0: construction RESOLVES with a painter-less map, so a
    // `try { new Map() } catch {}` never fires and is NOT protection there.
    expect(() => new HalfBuiltMap()).not.toThrow();
    expect(new HalfBuiltMap().painter).toBeUndefined();

    // >= 6.7.0 (what room ships): construction THROWS, so the painter gate that
    // runs after it is never reached and is NOT protection here. A guard
    // written for either half alone is dead code under the other.
    expect(refuseWebGL2).toThrow(GpuInitializationError);
  });

  it('gives the throw the name and wording the real engine uses', () => {
    // Recognition is by NAME (the class does not survive the static-engine
    // import-map seam) with the message as the fallback for older engines.
    let caught: unknown;
    try {
      refuseWebGL2();
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).name).toBe('GPUInitializationError');
    expect((caught as Error).message).toMatch(/^WebGL2 is required to display this map/);
    expect((caught as GpuInitializationError).statusMessage).toContain('GL_VENDOR = Disabled');
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

  it('refuses the painter-less map maplibre-gl <= 6.6.0 returns instead of throwing', () => {
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

    // ...and it released the reject, swallowing remove()'s own painter crash.
    expect(half.removeCalls).toBe(1);
    expect(warn).toHaveBeenCalledWith('room map:', 'MapLibre could not create a WebGL2 painter');
    expect(error).not.toHaveBeenCalled();
  });

  it('refuses the GPUInitializationError maplibre-gl >= 6.7.0 THROWS', () => {
    // The live limb on the engine room ships. Unguarded, this throw escapes the
    // whole `.then()` callback and lands in whatever catch is downstream — a
    // retry loop or a console.error in most apps, which files one hub bug row
    // per WebGL2-less visitor (#900).
    expect(refuseWebGL2).toThrow(/^WebGL2 is required to display this map/);

    // Guarded: same null the painter-less limb produces, same one warning, and
    // nothing to release because the engine already _cleanupContainer()d.
    let live: unknown = null;
    const adopted = startMapGuarded(refuseWebGL2, 'room map', webgl2Present);
    if (adopted) live = adopted;
    expect(adopted).toBeNull();
    expect(live).toBeNull();
    expect(warn).toHaveBeenCalledWith('room map:', 'MapLibre could not create a WebGL2 painter');
    expect(warn).toHaveBeenCalledOnce();
    // An environment condition, not a room defect (#900).
    expect(error).not.toHaveBeenCalled();
  });

  it('does NOT launder an unrelated construction failure into "no WebGL here"', () => {
    // A bad style, a container that is not in the document, a genuine bug: all
    // must stay loud and reach MapView's terminal .catch, which shows the
    // basemap copy or files the real console.error. Swallowing these as a
    // device problem is how a room defect becomes invisible.
    const boom = new TypeError("Cannot read properties of undefined (reading 'version')");
    expect(() =>
      startMapGuarded(
        () => {
          throw boom;
        },
        'room map',
        webgl2Present,
      ),
    ).toThrow(boom);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    // Not even one whose message merely mentions a style URL that has "webgl"
    // in it — recognition is the shared name/message test, not a substring hunt.
    const styleFail = new Error('Style https://x/style.json could not be loaded');
    expect(() =>
      startMapGuarded(
        () => {
          throw styleFail;
        },
        'room map',
        webgl2Present,
      ),
    ).toThrow(styleFail);
  });

  it('catches a context that dies AFTER the preflight passed', () => {
    // room preflights at mount, then awaits the basemap style over the network
    // before constructing. This models the window that opens in between: the
    // probe says yes, the context is gone by the time the map asks for one.
    // Both engine limbs are exercised, because either can be the answer.
    const half = new HalfBuiltMap();
    expect(startMapGuarded(() => half, 'room map', webgl2Present)).toBeNull();
    // The reject is released rather than left to leak, and its own
    // painter.destroy() crash is swallowed rather than rethrown at the caller.
    expect(half.removeCalls).toBe(1);
    expect(warn).toHaveBeenCalledWith('room map:', 'MapLibre could not create a WebGL2 painter');
    expect(error).not.toHaveBeenCalled();

    warn.mockClear();
    expect(startMapGuarded(refuseWebGL2, 'room map', webgl2Present)).toBeNull();
    expect(warn).toHaveBeenCalledWith('room map:', 'MapLibre could not create a WebGL2 painter');
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
const mapStartupSrc = readFileSync(new URL('./mapStartup.ts', import.meta.url), 'utf8');

describe('startMapGuarded routes construction through the shared two-limb guard', () => {
  it('builds via constructMapSafely, never a bare create()', () => {
    // The behavioural pin the unit tests above cannot make: it is legal
    // TypeScript, and a green build, to go back to `const map = create();`.
    // That reinstates the 6.7.0 regression — the throw escapes startMapGuarded
    // entirely and the painter gate below it is never reached.
    expect(mapStartupSrc).toContain("from '@aireon/shared/webgl'");
    expect(mapStartupSrc).toContain('constructMapSafely(create)');
    expect(mapStartupSrc).not.toMatch(/=\s*create\(\)\s*;/);
  });

  it('keeps the preflight OUTSIDE the shared helper', () => {
    // constructMapSafely knows nothing about room's injected probe; dropping
    // the supported() gate would construct a map on a device already known to
    // have no WebGL2, burning a context to learn what the mount already knew.
    const preflight = mapStartupSrc.indexOf('if (!supported())');
    const built = mapStartupSrc.indexOf('constructMapSafely(create)');
    expect(preflight).toBeGreaterThan(-1);
    expect(built).toBeGreaterThan(preflight);
  });
});

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
    // ...and the null it can now return for EITHER engine limb has to be acted
    // on before the ref write, or the guard is decorative: room's graceful path
    // is the 'device' init failure, which renders the shared <MapUnavailable/>.
    const handled = mapView.indexOf("if (!cancelled) setMapInitFailed('device');");
    expect(handled, 'MapView must take its unavailable path when the guard returns null')
      .toBeGreaterThan(constructed);
    expect(handled).toBeLessThan(stored);
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

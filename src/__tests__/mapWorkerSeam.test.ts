import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mapView = read('components/MapView.tsx');

/**
 * MapLibre GL v6 derives its tile-worker URL from its own `import.meta.url`,
 * which yields nothing usable once the bundler has rewritten the engine into
 * room's `maplibre` chunk: the worker never starts, no vector tile is ever
 * parsed, and the map paints a blank canvas with no console error. `vite dev`
 * resolves that URL by accident, so the failure is PRODUCTION-ONLY and no gate
 * short of an actual page load catches it. `applyMapWorkerUrl` from
 * `@aireon/shared/map-worker` points the loaded module at the worker asset the
 * bundler really emitted.
 *
 * Both halves below are load-bearing, and neither shows up as a build error:
 * the build stays green whichever way this is written.
 */
describe('maplibre v6 worker seam', () => {
  it('applies the worker URL to the dynamically imported module before constructing the map', () => {
    expect(mapView).toContain("import('@aireon/shared/map-worker')");
    expect(mapView).toContain('applyMapWorkerUrl(maplibre)');

    const applied = mapView.indexOf('applyMapWorkerUrl(maplibre)');
    const constructed = mapView.indexOf('new maplibre.Map(');
    expect(applied).toBeGreaterThan(-1);
    expect(constructed).toBeGreaterThan(-1);
    // Setting a worker URL after the first Map exists is too late for that map.
    expect(applied).toBeLessThan(constructed);
  });

  it('keeps the seam import dynamic so the engine stays off the eager path', () => {
    // The helper's own dependency is
    // `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url`, whose module id
    // contains `node_modules/maplibre-gl/` and so lands in the `maplibre`
    // manualChunks bucket (vite.config.ts). A STATIC import of the helper here
    // therefore hands the eager entry chunk a static edge into that bucket:
    // index.html modulepreloads all ~976 KB of MapLibre again and the
    // deliberate deferral of the engine is silently undone. Measured, not
    // theorized - and invisible to typecheck, lint and the build alike.
    expect(mapView).not.toMatch(/^import\s[^\n]*['"]@aireon\/shared\/map-worker['"]/m);
    // MapLibre itself must stay type-only at module scope for the same reason.
    expect(mapView).toContain("import type * as maplibregl from 'maplibre-gl'");
    expect(mapView).not.toMatch(/^import\s+\*\s+as\s+maplibregl\s+from\s+['"]maplibre-gl['"]/m);
  });
});

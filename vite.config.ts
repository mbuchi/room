import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { aireonHtmlPlugin } from '@aireon/shared/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // plugin-react 6 compiles JSX with Oxc and has dropped its `babel` option
    // entirely, so React Compiler now runs as its own Babel pass below.
    react(),
    // target "19" matches the React this app runs. React 19 ships the compiler
    // runtime natively as react/compiler-runtime, so no separate compatibility
    // package is needed. target is not cosmetic: a wrong value builds clean and
    // breaks at runtime.
    babel({ presets: [reactCompilerPreset({ target: '19' })] }),
    // First-load standard (aireon-shared/docs/PERFORMANCE_STANDARD.md). Injects the
    // pre-paint theme bootstrap, the static app shell so something paints before any
    // JS runs, and preconnects for the origins this app's first screen actually uses.
    // defaultTheme mirrors main.tsx's initTheme('dark'): room's signature look is dark,
    // and a disagreement here would paint a light shell that React then repaints.
    aireonHtmlPlugin({ archetype: 'map-first', defaultTheme: 'dark' }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // ⚠ EXPLICIT, and it must stay explicit. Vite's own default here is the
    // alias `'baseline-widely-available'`, which resolves to this exact browser
    // list — but under Vite 8 / Rolldown the ALIAS is not applied to the output
    // transform, while a literal browser list is. Measured on this repo: with
    // the default, `dist/assets/maplibre-*.js` shipped 13 ES2022 class static
    // blocks (`static{...}`) and the MapLibre worker another 6; with the list
    // below, both are 0 and the bundle grows by 25 bytes.
    //
    // That difference was a real, user-visible outage, Bug Tracker #1158:
    // MapLibre carried ES2022-only syntax and was reached through
    // `import('maplibre-gl')`, so a browser that predates class static blocks
    // (Safari < 16.4, Chrome < 94, Firefox < 93) booted the whole app happily
    // and then failed to PARSE that one chunk. The dynamic import rejected with
    // `SyntaxError: Unexpected token '{'`, MapView logged "Unable to initialise
    // the MapLibre map" and the visitor got the map fallback on an otherwise
    // working page.
    //
    // ⚠ SCOPE CHANGED in v0.37.0 and the list still matters. The ENGINE is now
    // external (fetched from static.aireon.ch), so Vite no longer transforms
    // it and this target cannot lower it — but the emitted worker asset
    // (`?worker&url`, dist/assets/maplibre-gl-worker-*.js) still goes through
    // the output transform, and that is where 6 of those static blocks lived.
    // Dropping the literal list would put them straight back.
    //
    // ⚠ AND THE LIST IS AUTHORITATIVE AGAIN as of v0.41.0. The engine was
    // briefly reached through an injected `<script type="importmap">`, which
    // needs Safari 16.4+ / Firefox 108+ and therefore put the map's real floor
    // ABOVE this list — the #1158 outage all over again, for the same browsers.
    // aireonHtmlPlugin now bakes the absolute engine URL into the chunk at
    // build time and injects no import map, so loading it needs only
    // cross-origin dynamic import (Safari 11+) and the map is back to honouring
    // exactly the list below, same as the app shell.
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    rollupOptions: {
      output: {
        // Split the big vendors out of the entry chunk so the app shell parses
        // fast and these stable payloads cache independently of app code across
        // deploys (maplibre-gl ~1 MB + the React runtime).
        // SURGICAL by design: NOT a `node_modules -> vendor` catch-all, which
        // would force lazy-only deps (e.g. react-joyride behind a lazy Tour
        // chunk) eager. Everything not named here keeps Rollup's default
        // chunking, preserving those lazy boundaries. commonjsHelpers is routed
        // to vendor so no shared-helper edge pulls maplibre back into the entry
        // (the commonjsHelpers TRAP).
        //
        // ⚠ THERE IS DELIBERATELY NO `maplibre` BUCKET (removed v0.37.0).
        // aireonHtmlPlugin resolves the exact bare id `maplibre-gl` to
        // https://static.aireon.ch/maplibre-gl@<version>/maplibre-gl.mjs at
        // build time and marks it external, so the engine never enters the
        // bundle graph and there is nothing left to bucket. (No import map is
        // involved; see the build.target note above for why that shape went.)
        // The only id still matching `node_modules/maplibre-gl/` is the
        // `?worker&url` proxy inside `@aireon/shared/map-worker`, which
        // compiles to a bare URL STRING and must stay one — re-adding the
        // bucket could now ONLY catch that proxy and turn a free string into a
        // chunk edge. It can do harm and no good.
        //
        // ⚠⚠ STYLESHEETS ARE DELIBERATELY EXCLUDED. maplibre-gl.css is still
        // bundled (only the JS engine is external), and a dependency's CSS
        // follows whichever
        // chunk claims it, so bucketing `maplibre-gl.css` here would pull its
        // <link> out of index.html and append it AFTER index.css at runtime.
        // `maplibre-gl.css .maplibregl-map{position:relative}` and Tailwind's
        // `.absolute` are both (0,1,0), so the later sheet would win, the map
        // container would lose `position:absolute`, collapse to height 0, and
        // MapLibre would draw into its 400x300 fallback: a blank map with no
        // console error (the hood v0.25.0 outage). Excluding CSS keeps every
        // stylesheet in the eager entry bundle, in main.tsx import order. The
        // container also carries `.room-map-canvas` (0,2,0) so the outcome no
        // longer depends on order at all.
        manualChunks(id: string) {
          if (id.endsWith('.css')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (id.includes('node_modules/oidc-client-ts/') || id.includes('commonjsHelpers')) {
            return 'vendor'
          }
        },
      },
    },
  },
});

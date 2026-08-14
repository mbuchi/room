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
    // target "18" is required because this app runs React 18 (the compiler
    // emits react-compiler-runtime calls that React 18 lacks natively).
    babel({ presets: [reactCompilerPreset({ target: '18' })] }),
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
        // ⚠ The `maplibre` bucket is a DEFERRED chunk now, not just a separate
        // one: MapView reaches MapLibre only through `import('maplibre-gl')`,
        // so nothing modulepreloads it from index.html any more. A separate
        // chunk was never the same thing as a deferred chunk — it was still
        // 215 KB brotli on the critical path.
        //
        // ⚠⚠ STYLESHEETS ARE DELIBERATELY EXCLUDED, and this matters far more
        // now that the bucket is dynamic. A dependency's CSS follows whichever
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
          if (id.includes('node_modules/maplibre-gl/')) return 'maplibre'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (id.includes('node_modules/oidc-client-ts/') || id.includes('commonjsHelpers')) {
            return 'vendor'
          }
        },
      },
    },
  },
});

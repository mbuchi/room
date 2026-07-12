import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // target "18" is required because this app runs React 18 (the compiler
    // emits react-compiler-runtime calls that React 18 lacks natively).
    react({ babel: { plugins: [['babel-plugin-react-compiler', { target: '18' }]] } }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // Split the big, always-eager vendors out of the entry chunk so the
        // app shell parses fast and these stable payloads cache independently
        // of app code across deploys (maplibre-gl ~1 MB + the React runtime).
        // SURGICAL by design: NOT a `node_modules -> vendor` catch-all, which
        // would force lazy-only deps (e.g. react-joyride behind a lazy Tour
        // chunk) eager. Everything not named here keeps Rollup's default
        // chunking, preserving those lazy boundaries. .css excluded so the
        // maplibre stylesheet doesn't chain its chunk to the 1 MB JS, and
        // commonjsHelpers routed to vendor so no shared-helper edge pulls
        // maplibre back into the entry (the commonjsHelpers TRAP).
        manualChunks(id: string) {
          if (id.includes('node_modules/maplibre-gl/') && !id.endsWith('.css')) return 'maplibre'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (id.includes('node_modules/oidc-client-ts/') || id.includes('commonjsHelpers')) {
            return 'vendor'
          }
        },
      },
    },
  },
});

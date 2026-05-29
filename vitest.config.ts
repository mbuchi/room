import { defineConfig } from 'vitest/config';

// Unit-test config for room. Tests are pure-logic / service-level (no DOM
// rendering), so the default `node` environment is enough — the IndexedDB
// cache test stubs `globalThis.indexedDB` itself. Keep this separate from
// vite.config.ts so the React plugin/build options don't bleed into tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // The IDB resilience test exercises the open-timeout fallback; give it room.
    testTimeout: 10000,
  },
});

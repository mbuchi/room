#!/usr/bin/env node
/**
 * Regression guard for Bug Tracker #1158, "Unable to initialise the MapLibre
 * map / Unexpected token '{'".
 *
 * MapLibre GL v6 ships ES2022 class static blocks (`static { ... }`). Vite is
 * supposed to lower them: `build.target` defaults to the alias
 * `'baseline-widely-available'`, i.e. chrome107 / edge107 / firefox104 /
 * safari16, and Safari 16.0-16.3 cannot parse a static block (it landed in
 * 16.4). Under Vite 8 / Rolldown that ALIAS is not applied to the output
 * transform, so the default silently emitted the syntax anyway and only a
 * literal browser list in vite.config.ts lowers it.
 *
 * The failure mode is invisible in the build log: MapLibre is the only chunk in
 * room with ES2022-only syntax and it is reached through `import('maplibre-gl')`,
 * so an affected browser boots the entire app, then fails to PARSE that one
 * chunk. The dynamic import rejects with `SyntaxError: Unexpected token '{'`
 * and the visitor gets the map fallback on a page that otherwise works.
 *
 * Fails (exit 1) if a static block survives into any emitted chunk. Requires a
 * build first. Run: `npm run build && npm run test:bundle-syntax`.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'dist/assets');

if (!existsSync(assets)) {
  console.error('check-bundle-syntax: dist/assets is missing. Run `npm run build` first.');
  process.exit(1);
}

// Minified output has no whitespace, but the unminified form is matched too so
// the guard keeps working if minification is ever turned off.
const STATIC_BLOCK = /(^|[};])\s*static\s*\{/;

const failures = [];
let scanned = 0;

for (const file of readdirSync(assets)) {
  if (!file.endsWith('.js')) continue;
  scanned += 1;
  const code = readFileSync(resolve(assets, file), 'utf8');
  if (STATIC_BLOCK.test(code)) failures.push(file);
}

if (scanned === 0) {
  console.error('check-bundle-syntax: no JS chunks found in dist/assets. Run `npm run build` first.');
  process.exit(1);
}

if (failures.length > 0) {
  console.error(
    `check-bundle-syntax: ES2022 class static blocks survived into ${failures.length} chunk(s):\n` +
      failures.map((f) => `  - ${f}`).join('\n') +
      '\n\nBrowsers on the app baseline (Safari 16.0-16.3, Chrome < 94, Firefox < 93) cannot\n' +
      "parse them and the dynamic MapLibre import rejects with \"Unexpected token '{'\".\n" +
      "Keep the literal browser list in vite.config.ts's `build.target` (Bug Tracker #1158).",
  );
  process.exit(1);
}

console.log(`check-bundle-syntax: OK, ${scanned} chunk(s) free of ES2022 class static blocks.`);

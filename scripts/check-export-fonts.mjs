#!/usr/bin/env node
/**
 * Regression guard for the "Save image" / "My exports" cssRules SecurityError.
 *
 * html-to-image embeds web fonts by reading every stylesheet's `cssRules`.
 * A CROSS-ORIGIN sheet is the hazard: fetched in no-CORS mode the browser
 * blocks `cssRules` access and the export logs:
 *   "Failed to read the 'cssRules' property from 'CSSStyleSheet': Cannot access rules"
 *
 * room used to load Inter / JetBrains Mono / Varela Round from
 * fonts.googleapis.com and worked around this with `crossorigin`. Since the
 * suite first-load standard (aireon-shared docs/PERFORMANCE_STANDARD.md) the
 * fonts are SELF-HOSTED through `@aireon/shared/fonts.css`, which Vite bundles
 * into the app's own stylesheet. Same-origin sheets are always readable, so the
 * SecurityError cannot occur and the render-blocking third-party request is
 * gone from the critical path.
 *
 * Fails (exit 1) if a Google Fonts stylesheet reappears in index.html, or if
 * the self-hosted fonts.css import is dropped. Run: `npm run test:export-fonts`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const entry = readFileSync(resolve(root, 'src/main.tsx'), 'utf8');

const failures = [];

const googleFontTags = (html.match(/<link\b[^>]*>/gi) ?? []).filter((tag) =>
  /fonts\.(googleapis|gstatic)\.com/i.test(tag),
);
if (googleFontTags.length > 0) {
  failures.push(
    'index.html reintroduces a fonts.googleapis.com / fonts.gstatic.com tag. Fonts must be\n' +
      '  self-hosted: a cross-origin sheet is render-blocking and breaks cssRules on export.',
  );
  googleFontTags.forEach((tag) => failures.push('   ' + tag.trim()));
}

if (!/@aireon\/shared\/fonts\.css/.test(entry)) {
  failures.push(
    "src/main.tsx no longer imports '@aireon/shared/fonts.css'. Without it the self-hosted\n" +
      '  woff2 faces never ship and the export falls back to system fonts.',
  );
}

if (failures.length > 0) {
  console.error('✗ check-export-fonts:');
  failures.forEach((line) => console.error('  ' + line));
  process.exit(1);
}

console.log(
  '✓ check-export-fonts: fonts are self-hosted via @aireon/shared/fonts.css and no Google Fonts\n' +
    '  request remains — same-origin sheets let image export embed fonts cleanly.',
);

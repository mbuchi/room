#!/usr/bin/env node
/**
 * Regression guard for the "Save image" / "My exports" cssRules SecurityError.
 *
 * html-to-image embeds web fonts by reading every stylesheet's `cssRules`.
 * A cross-origin <link> WITHOUT `crossorigin` is fetched in no-CORS mode, so
 * the browser blocks `cssRules` access and the export logs:
 *   "Failed to read the 'cssRules' property from 'CSSStyleSheet': Cannot access rules"
 * Google Fonts serves `Access-Control-Allow-Origin: *`, so loading the sheet
 * with `crossorigin` makes it readable and the error disappears (fonts also
 * embed directly instead of via the slow fetch fallback).
 *
 * Fails (exit 1) if any Google Fonts stylesheet <link> in index.html is
 * missing `crossorigin`. Run: `npm run test:export-fonts`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

const fontLinks = (html.match(/<link\b[^>]*>/gi) ?? []).filter(
  (tag) => /fonts\.googleapis\.com\/css/i.test(tag) && /rel\s*=\s*["']?stylesheet/i.test(tag),
);

if (fontLinks.length === 0) {
  console.error('✗ check-export-fonts: no Google Fonts stylesheet <link> found in index.html');
  process.exit(1);
}

const missing = fontLinks.filter((tag) => !/\bcrossorigin\b/i.test(tag));
if (missing.length > 0) {
  console.error(
    '✗ check-export-fonts: Google Fonts stylesheet <link> missing `crossorigin` — image export will log a cssRules SecurityError:',
  );
  missing.forEach((tag) => console.error('   ' + tag.trim()));
  process.exit(1);
}

console.log(
  `✓ check-export-fonts: all ${fontLinks.length} Google Fonts stylesheet link(s) load with crossorigin — image export can embed fonts cleanly.`,
);

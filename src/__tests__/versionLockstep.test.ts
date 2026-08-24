import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CURRENT_VERSION } from '../data/releaseMeta';

/**
 * Three-way version lockstep.
 *
 * room's version is written down in four places that are all supposed to agree:
 *
 *   1. package.json `version`            (the authority)
 *   2. package-lock.json `version`        } npm writes both of these from
 *   3. package-lock.json `packages[""]`   } package.json on install
 *   4. src/data/releaseMeta.ts CURRENT_VERSION, and RELEASES[0].version
 *      in src/data/releaseNotes.ts (the navbar badge and the What's New panel)
 *
 * They drift when a release hand-edits package.json and releaseMeta but never
 * runs an install, so the lockfile keeps the previous number. That is exactly
 * what happened between 0.35.2 and 0.36.1: two releases merged (#271, #272)
 * with the lockfile still saying 0.35.2, and nothing caught it because room's
 * Vercel install command is `npm install` rather than `npm ci`, so the build
 * stayed green while a reader could no longer tell which number was real.
 *
 * Every assertion below DERIVES from package.json rather than pinning a
 * literal. A guard with a hardcoded version has to be edited on every release,
 * which is how these guards rot into a rubber stamp.
 */

const readRoot = (name: string) => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');

const pkg = JSON.parse(readRoot('package.json')) as { name: string; version: string };
const lock = JSON.parse(readRoot('package-lock.json')) as {
  name: string;
  version: string;
  packages: Record<string, { name?: string; version?: string }>;
};

// releaseNotes.ts cannot be imported here: it re-exports KIND_META from the
// @aireon/shared barrel, which touches `window` at module scope and throws in
// this suite's `node` environment. Read the newest entry out of the source
// instead, the same way panelTabs and parcelDataExport assert on shipped text.
const releaseNotesSrc = readFileSync(
  new URL('../data/releaseNotes.ts', import.meta.url),
  'utf8',
);
const newestRelease = releaseNotesSrc
  .slice(releaseNotesSrc.indexOf('export const RELEASES'))
  .match(/version:\s*'([^']+)'/)?.[1];

describe('version lockstep', () => {
  it('states a SemVer version in package.json', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('carries that version in both package-lock.json version fields', () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages['']?.version).toBe(pkg.version);
  });

  it('describes this package in package-lock.json', () => {
    expect(lock.name).toBe(pkg.name);
    expect(lock.packages['']?.name).toBe(pkg.name);
  });

  it('shows that version in the navbar badge (releaseMeta CURRENT_VERSION)', () => {
    expect(CURRENT_VERSION).toBe(pkg.version);
  });

  it('tops the changelog with that version (RELEASES[0])', () => {
    // Guard the parse itself: a silent regex miss would make the next
    // assertion compare undefined to undefined and pass vacuously.
    expect(newestRelease, 'could not parse RELEASES[0].version out of releaseNotes.ts')
      .toMatch(/^\d+\.\d+\.\d+$/);
    expect(newestRelease).toBe(pkg.version);
  });
});

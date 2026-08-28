import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const VERIFIED_SHARED_COMMIT = '1a179c921b1447fd4e5f4803968cc193c9a77bc1';
const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const pkg = JSON.parse(read('package.json')) as {
  dependencies: Record<string, string>;
};
const lock = JSON.parse(read('package-lock.json')) as {
  packages: Record<string, { version?: string; resolved?: string; dependencies?: Record<string, string> }>;
};
const viteConfig = read('vite.config.ts');
const bridge = read('src/components/UserMenu.tsx');
const releaseNotes = read('src/data/releaseNotes.ts');

describe('room central user-menu runtime adoption', () => {
  it('pins the exact verified shared package in both dependency manifests', () => {
    const expected = `github:mbuchi/aireon-shared#${VERIFIED_SHARED_COMMIT}`;
    expect(pkg.dependencies['@aireon/shared']).toBe(expected);
    expect(lock.packages['']?.dependencies?.['@aireon/shared']).toBe(expected);
    expect(lock.packages['node_modules/@aireon/shared']?.version).toBe('1.195.0');
    expect(lock.packages['node_modules/@aireon/shared']?.resolved).toMatch(
      new RegExp(`#${VERIFIED_SHARED_COMMIT}$`),
    );
  });

  it('keeps the stable production loader injection enabled', () => {
    expect(viteConfig).toContain('aireonHtmlPlugin(');
    expect(viteConfig).not.toContain('runtimeUserMenu: false');
  });

  it('identifies the local adapter and preserves its local theme input', () => {
    const menuInvocation = bridge.slice(
      bridge.indexOf('<MapUserMenu'),
      bridge.indexOf('/>', bridge.indexOf('<MapUserMenu')),
    );
    expect(menuInvocation).toContain('appId="room"');
    expect(menuInvocation).toMatch(/\bdark(?:\s|=)/);
  });

  it('records the rollout in the release entry that shipped it', () => {
    // The runtime shipped in 0.38.0 (#278), and that is a fixed historical
    // fact. This used to assert the mention sat in whatever entry happened to
    // be NEWEST, which made the guard go red on the very next release for a
    // reason having nothing to do with the user menu. Pin the entry that
    // actually carries it instead, and bound it by the next entry down.
    const RUNTIME_RELEASE = "version: '0.38.0'";
    const releasesStart = releaseNotes.indexOf('export const RELEASES');
    const entryStart = releaseNotes.indexOf(RUNTIME_RELEASE, releasesStart);
    const nextEntry = releaseNotes.indexOf('\n  {\n    version:', entryStart);
    const marker = releaseNotes.indexOf('central user-menu runtime', entryStart);

    expect(releasesStart).toBeGreaterThan(-1);
    expect(entryStart, `no ${RUNTIME_RELEASE} entry in releaseNotes.ts`).toBeGreaterThan(releasesStart);
    expect(nextEntry, 'the 0.38.0 entry must be followed by an older one').toBeGreaterThan(entryStart);
    expect(marker, 'the runtime rollout is no longer described in 0.38.0').toBeGreaterThan(entryStart);
    expect(marker).toBeLessThan(nextEntry);
  });
});

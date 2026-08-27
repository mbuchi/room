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

  it('records the rollout in the current release entry', () => {
    const releasesStart = releaseNotes.indexOf('export const RELEASES');
    const firstRelease = releaseNotes.indexOf('\n  {\n    version:', releasesStart);
    const secondRelease = releaseNotes.indexOf('\n  {\n    version:', firstRelease + 1);
    const marker = releaseNotes.indexOf('central user-menu runtime', firstRelease);

    expect(firstRelease).toBeGreaterThan(releasesStart);
    expect(secondRelease).toBeGreaterThan(firstRelease);
    expect(marker).toBeGreaterThan(firstRelease);
    expect(marker).toBeLessThan(secondRelease);
  });
});

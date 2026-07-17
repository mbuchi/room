import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { COMPACT_LAYOUT_BREAKPOINT, matchesCompactLayout } from '../hooks/useCompactLayout';

// Source contracts for the compact (<1024px) app layout — the suite mobile
// standard (scoore origin). These read the shipped source files so a refactor
// that silently drops a compact behaviour fails the suite instead of shipping.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('compact layout detection', () => {
  it('matches the single-pane layout below 1024px', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query === '(max-width: 1023px)' }));
    vi.stubGlobal('window', { matchMedia });
    expect(COMPACT_LAYOUT_BREAKPOINT).toBe(1024);
    expect(matchesCompactLayout()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('compact navbar contract', () => {
  const navbar = read('components/Navbar.tsx');

  it('hides the hub badge at compact widths', () => {
    expect(navbar).toContain('hideHubLink={isCompact}');
  });

  it('folds the toolbar and icon cluster into the one account menu', () => {
    expect(navbar).toContain('actionsExtra={isCompact ? undefined');
    expect(navbar).toContain('toolbar={isCompact ? undefined');
    expect(navbar).toContain('compactOnlyTools');
  });

  it('caps the account dropdown height so every merged row stays reachable', () => {
    expect(navbar).toContain('map-shell-user-dropdown]:max-h-');
    expect(navbar).toContain('map-shell-user-dropdown]:overflow-y-auto');
  });
});

describe('full-height parcel sheet contract', () => {
  const mapView = read('components/MapView.tsx');

  it('expands the phone bottom sheet to just under the navbar, uncapped', () => {
    expect(mapView).toContain("sheetExpanded ? 'calc(100dvh - 3.5rem)'");
    expect(mapView).not.toContain('max-h-[90dvh]');
  });
});

describe('map-tools sheet contract', () => {
  const mapView = read('components/MapView.tsx');

  it('stacks every control card full-width on phones instead of tabbing', () => {
    expect(mapView).toContain('renderParcelCard(true)');
    expect(mapView).toContain('renderResidentialTypeCard(true)');
    expect(mapView).toContain('renderBuildingCard(true)');
    expect(mapView).not.toContain('dockTab');
  });
});

describe('one-column basemap picker contract', () => {
  const css = read('index.css');

  it('renders the shared basemap gallery as a single scrollable column on compact', () => {
    expect(css).toContain('.aireon-bm__grid');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toContain('.aireon-bm__menu');
    expect(css).toContain('max-height: min(55dvh, 24rem)');
  });
});

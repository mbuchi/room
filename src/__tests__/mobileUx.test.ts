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

  it('presents full-height by default and re-expands on every new selection', () => {
    expect(mapView).toContain('const [sheetExpanded, setSheetExpanded] = useState(true)');
    expect(mapView).toContain('setSheetExpanded(true)');
  });

  it('clears the home indicator with a safe-area bottom pad on phones only', () => {
    expect(mapView).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(mapView).toContain('md:pb-0');
  });

  it('wires drag-down-to-dismiss on the grab handle (valoo pattern)', () => {
    expect(mapView).toContain('onTouchStart={onSheetTouchStart}');
    expect(mapView).toContain('onTouchMove={onSheetTouchMove}');
    expect(mapView).toContain('onTouchEnd={onSheetTouchEnd}');
    expect(mapView).toContain('onTouchCancel={onSheetTouchEnd}');
    // Release past the threshold closes the panel; the live gesture translates
    // the sheet with transitions off so it tracks the finger.
    expect(mapView).toContain('handleCloseInfoPanel();');
    expect(mapView).toContain('translateY(${sheetDragOffset}px)');
    expect(mapView).toContain("transition: 'none'");
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

describe('iOS focus auto-zoom contract', () => {
  // iOS Safari auto-zooms the page when an input below 16px is focused and
  // leaves the layout stuck wider than the screen (scoore-origin fix).
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const css = read('index.css');

  it('caps the viewport scale so a focus zoom cannot stick', () => {
    expect(html).toContain('width=device-width, initial-scale=1.0, maximum-scale=1.0');
  });

  it('keeps the shared address-search text at 16px on phones', () => {
    expect(css).toMatch(/\.aireon-search-input\s*\{[^}]*font-size:\s*16px/s);
  });

  it('keeps the zone filter input at 16px below the desktop breakpoint', () => {
    const zoneSelector = read('components/ZoneSelectorDropdown.tsx');
    expect(zoneSelector).toContain('text-base lg:text-xs');
  });
});

describe('one-column basemap picker contract', () => {
  const css = read('index.css');
  // @aireon/shared v1.103.0 moved the single-column ROW layout into the shared
  // stylesheet at every width, so that half of the contract is now asserted
  // against the package room actually imports (the `./basemap.css` export)
  // rather than against a local override. room's own file only has to prove it
  // no longer fights that layout.
  const sharedCss = readFileSync(
    new URL('../../node_modules/@aireon/shared/src/basemap/basemap.css', import.meta.url),
    'utf8',
  );

  it('gets a single-column row gallery from the shared stylesheet', () => {
    expect(sharedCss).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(sharedCss).toContain('width: 16rem');
  });

  it('no longer narrows the shared card, which clipped the row labels', () => {
    expect(css).not.toContain('width: 9rem');
  });

  it('keeps the tighter menu cap so the open list cannot reach the legend chip', () => {
    expect(css).toContain('.aireon-bm__menu');
    expect(css).toContain('max-height: min(55dvh, 24rem)');
  });
});

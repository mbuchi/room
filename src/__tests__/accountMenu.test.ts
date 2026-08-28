import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Source contracts for the account menu. room renders the SHARED saved-parcels
// block that roots, roofs and geopool render. That design is ~950 lines of
// `map-shell-user-*` author CSS in @aireon/shared, so it only survives while
// room keeps rendering the shared local shell with the right props.
//
// room was pinned to shared #439 - inside the window between the central
// user-menu runtime landing (#437) and its rollback (#441, v1.196.0) - so its
// menu rendered the Shadow-DOM approximation, which cannot inherit that CSS.
// The pin guard for that lives in parcelDataExport.test.ts; this file guards
// the props.
const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

// These guards are about CODE, not prose: the comments below name the very
// props they forbid. Strip comments first so documenting a trap can never fail
// the guard against it.
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('room account menu renders the shared saved-parcels block', () => {
  const userMenu = read('src/components/UserMenu.tsx');

  it('identifies the owning app at the shared MapUserMenu boundary', () => {
    expect(userMenu).toContain('<MapUserMenu');
    expect(userMenu).toContain('appId="room"');
  });

  it('passes the props the built-in block needs', () => {
    expect(userMenu).toContain('locale={locale');
    expect(userMenu).toContain('labels={{');
    expect(userMenu).toContain('savedParcelsOpenHereLabel');
    expect(userMenu).toContain('onOpenSavedParcel');
  });

  it('passes nothing that would suppress the built-in block', () => {
    // shouldLoadSavedSummary = showSavedParcels && !hasCustomDropdownSummary,
    // and hasCustomDropdownSummary is set by EITHER summary or dropdownSummary.
    // showSavedParcels already defaults to true, so passing it is only ever a
    // way to accidentally turn the block off.
    const code = stripComments(userMenu);
    expect(code).not.toContain('showSavedParcels');
    expect(code).not.toContain('summaryHandlers');
    expect(code).not.toContain('summary=');
    expect(code).not.toContain('dropdownSummary');
    expect(code).not.toContain('dropdownWidth');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mapView = read('components/MapView.tsx');
const header = read('components/ParcelPanelHeader.tsx');
const lock = JSON.parse(read('../package-lock.json'));

describe('parcel data export', () => {
  it('exports RES, feature, canonical identity and polygon data', () => {
    expect(mapView).toContain('appId="room"');
    expect(mapView).toContain('additionalData={{ res: parcelData, feature: selectedParcel.props }}');
    expect(mapView).toContain('geometry={selectedParcel.geometry}');
    expect(mapView).toContain('parcelData?.egrid ?? selectedParcel.egrid ?? selectedParcel.parcelId');
    // v1.159.2 keeps the first-load standard (aireonHtmlPlugin build-time shell
    // + theme bootstrap, self-hosted fonts, an AppAccessGate that no longer
    // blocks the tree on an unbounded app_settings fetch) and fixes the
    // bootstrap to mirror resolveThemePreference: OS-light is no longer treated
    // as a decision, so room's dark default survives the first frame.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('6b3788b5e4ea798c2f8daa546f9e43252255e68d');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});

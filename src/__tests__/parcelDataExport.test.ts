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
    // v1.146.0 — ghost/danger PanelActionButton tones carry the chip surface.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('c7bb500205e141bad6b1a3a0e357f496aaa9f6bc');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});

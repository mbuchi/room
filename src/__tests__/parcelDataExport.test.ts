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
    // v1.158.0 keeps ?opacity= and extends the global loading policy to direct
    // shared skeleton primitives while retaining the BasemapPicker slider.
    expect(lock.packages['node_modules/@aireon/shared'].resolved).toContain('0e1b0a3458c8ffc7c7248586df2dadc6a05b5ff7');
  });

  it('lets the custom header action row wrap on narrow panels', () => {
    expect(header).toContain('mt-2 flex flex-wrap items-center gap-2');
  });
});

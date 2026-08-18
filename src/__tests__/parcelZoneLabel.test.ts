import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Source-contract test, in the same style as parcelDataExport.test.ts: room's
// vitest runs in a node environment, so the panel components cannot be
// imported (the @aireon/shared barrel touches `window` at module load). The
// behavioural rule itself is covered by the shared package and by
// parcelDataService.test.ts on real rows; what has to be guarded HERE is that
// the display surfaces keep reading the resolved `zone` instead of
// re-inlining a municipal read — while the zone-STATISTICS machinery stays
// keyed on the municipal `cz_local`.
//
// Why: the suite rule (aireon-shared/docs/PARCEL_ZONE_STANDARD.md,
// @aireon/shared v1.177.0) is ONE label per parcel from the shared resolver —
// the municipal designation ("Wohnzone, Bauklasse 4", "Dorfzone 2"), with the
// federal category ("Wohnzonen") a filter, never the label. room must not
// re-inline its own read of any zoning column for display, so that the label
// keeps following the shared rule (v1.173 printed the federal category first;
// v1.177 reversed that, and room changed nothing but the pin). room's cohorts
// (RES /zone_stats, ZoneSelectorDropdown, the choropleth highlight in
// mapLayers.ts) are DEFINED by fso + cz_local — rule 4 of the standard says
// those keys are not display and must not change; the control is labelled
// as the municipal zone type, and now happens to show the same words as the
// zone pill on open.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
/** Source minus block + line comments, so a doc comment cannot satisfy or trip a code check. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = read('services/parcelDataService.ts');
const infoPanel = read('components/ZoneInfoPanel.tsx');
const zonePanel = read('components/ZonePanel.tsx');
const dropdown = read('components/ZoneSelectorDropdown.tsx');
const mapLayers = read('lib/mapLayers.ts');
const i18n = read('contexts/I18nContext.tsx');

describe('parcel zone label — display goes through the shared rule', () => {
  it('parcelDataService resolves `zone` from the raw props via @aireon/shared/parcel-zone', () => {
    expect(service).toContain("from '@aireon/shared/parcel-zone'");
    expect(service).toMatch(/zone:\s*resolveZoneLabel\(props\)/);
    // No app-local chain and no raw cz_harmonized read anywhere in the service.
    expect(service.match(/\[[^\]]*'cz_local'[^\]]*\]/g) ?? []).toEqual([]);
    expect(service).not.toMatch(/props\.cz_harmonized/);
  });

  it('the Parcel tab shows ONE zone pill, the resolved one — not cz_local / cz_canton', () => {
    expect(infoPanel).toMatch(/key:\s*'zone',\s*value:\s*parcelData\.zone/);
    expect(infoPanel).not.toMatch(/value:\s*parcelData\.cz_local/);
    expect(infoPanel).not.toMatch(/value:\s*parcelData\.cz_canton/);
  });

  it('the Zone tab does not print a second zone line above the cohort picker', () => {
    // 0.29.0 printed `parcelData.zone` (then the federal category) above the
    // picker because it differed from the cohort. With the municipal
    // designation as the zone the picker's current value IS the zone text, so
    // a line above it would print the same words twice. Dropdown alone.
    expect(code(zonePanel)).not.toMatch(/\{parcelData\.zone\}/);
    expect(code(zonePanel)).not.toContain("t('panel.info.row.zone')");
    expect(zonePanel).toContain('<ZoneSelectorDropdown');
  });

  it('the cohort dropdown never resolves or reads a zone label of its own', () => {
    // No resolver, no raw federal column, no parcel record and no `.zone`
    // property read (the `.zone.` in the `panel.zone.*` i18n keys is not one).
    expect(code(dropdown)).not.toMatch(/resolveZone|cz_harmonized|parcelData|\.zone\b(?!\.)/);
    // Its eyebrow is the honest cohort label, translated in all four locales.
    expect(dropdown).toContain("t('panel.zone.zoning_category')");
    expect(i18n).toContain("'panel.zone.zoning_category': 'Municipal zone type'");
    expect(i18n).toContain("'panel.zone.zoning_category': 'Kommunaler Zonentyp'");
    expect(i18n).toContain("'panel.zone.zoning_category': 'Type de zone communale'");
    expect(i18n).toContain("'panel.zone.zoning_category': 'Tipo di zona comunale'");
  });
});

describe('zone statistics stay keyed on the municipal cz_local (analytics key, not display)', () => {
  it('ZonePanel drives /zone_stats and the dropdown off cz_local', () => {
    expect(zonePanel).toMatch(/fetchZoneStats\(\{\s*fso,\s*cz_local:\s*cz/);
    expect(zonePanel).toMatch(/setActiveCzLocal\(parcelData\.cz_local\)/);
  });

  it('the choropleth highlights the active zone by cz_local', () => {
    expect(mapLayers).toContain("['==', ['get', 'cz_local'], zone.czLocal]");
  });
});

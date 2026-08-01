import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Source contracts for the right pane's flat, one-level tab structure.
 *
 * These read the shipped source rather than rendering, for the same reason the
 * compact-layout suite does: the things worth protecting here are structural
 * (which tabs exist, what is nested inside what, what is gated) and they have
 * no runtime value to assert without standing up MapLibre.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const mapView = read('components/MapView.tsx');
const zonePanel = read('components/ZonePanel.tsx');
const zoneInfoPanel = read('components/ZoneInfoPanel.tsx');
const comparePanel = read('components/ComparePanel.tsx');
const faqPanel = read('components/FaqPanel.tsx');
const i18n = read('contexts/I18nContext.tsx');

const LOCALES = ['en', 'fr', 'de', 'it'] as const;
const TAB_IDS = ['zone', 'parcel', 'market', 'massing', 'faq', 'compare'] as const;

describe('panel tab set', () => {
  it('declares exactly the six flat tab ids, compare last', () => {
    expect(mapView).toContain(
      "const PANEL_TAB_IDS = ['zone', 'parcel', 'market', 'massing', 'faq', 'compare'] as const;",
    );
  });

  it('labels every tab', () => {
    for (const id of TAB_IDS) {
      expect(mapView).toContain(`${id}: 'panel.tabs.${id}'`);
    }
  });

  it('translates every tab label in all four locales', () => {
    for (const locale of LOCALES) {
      // Each locale dict is a `<locale>: {` block; slice it out and check within.
      const start = i18n.indexOf(`\n  ${locale}: {`);
      expect(start, `${locale} dictionary missing`).toBeGreaterThan(-1);
      const nextLocale = LOCALES.map((l) => i18n.indexOf(`\n  ${l}: {`))
        .filter((i) => i > start)
        .sort((a, b) => a - b)[0];
      const block = i18n.slice(start, nextLocale === undefined ? i18n.length : nextLocale);
      for (const id of TAB_IDS) {
        expect(block, `${locale} missing panel.tabs.${id}`).toContain(`'panel.tabs.${id}':`);
      }
      expect(block, `${locale} missing panel.tabs.aria`).toContain("'panel.tabs.aria':");
    }
  });

  it('opens on the zone tab for every new parcel selection', () => {
    expect(mapView).toContain("setPanelTab('zone')");
  });
});

describe('no second layer of tabs', () => {
  it('renders the area-vs-volume scatter inline, not behind an inner tab', () => {
    expect(zonePanel).toContain('<VolumeVsAreaScatter');
    // The retired inner switcher and its state.
    expect(zonePanel).not.toContain("'distributions'");
    expect(zonePanel).not.toContain('panel.zone.tab.');
  });

  it('drops the retired inner-tab translation keys entirely', () => {
    expect(i18n).not.toContain('panel.zone.tab.');
  });

  it('gives the zone tab a single scroll container', () => {
    expect(zonePanel.match(/overflow-y-auto/g) ?? []).toHaveLength(1);
  });
});

describe('parcel tab is only parcel facts', () => {
  it('no longer carries market, massing or comparables', () => {
    expect(zoneInfoPanel).not.toContain('MarketDataSection');
    expect(zoneInfoPanel).not.toContain('BuildableMassingSection');
    expect(zoneInfoPanel).not.toContain('ComparablesPanel');
  });

  it('no longer renders its own identity header — the panel owns it', () => {
    expect(zoneInfoPanel).not.toContain('ParcelIdentityHeader');
    expect(mapView).toContain('<ParcelPanelHeader');
  });
});

describe('compare tab is admin-gated', () => {
  it('resolves the admin flag and filters the tab out for everyone else', () => {
    expect(mapView).toContain('fetchIsAdmin');
    expect(mapView).toContain("(id) => id !== 'compare' || isAdmin");
  });

  it('falls back off the compare tab when the admin flag drops', () => {
    expect(mapView).toContain("tab === 'compare' ? 'zone' : tab");
  });

  it('states the living-space pricing basis next to the comparables', () => {
    expect(comparePanel).toContain('panel.compare.basis_note');
  });
});

describe('faq tab is the in-panel Claire entry point', () => {
  it('offers Ask Claire at every width', () => {
    expect(faqPanel).toContain('onAskClaire');
    expect(faqPanel).toContain('panel.info.ask_claire');
  });

  it('keeps Claire a calm secondary action (panel actions standard R1)', () => {
    expect(faqPanel).not.toContain('from-amber-400');
    expect(faqPanel).not.toContain('to-orange-500');
    expect(faqPanel).toContain('text-amber-500');
  });

  it('does not repeat the Ask Claire button in an actions row', () => {
    // Since "Open in" retired, PrimaryActionsRow's ONLY content is the
    // phone Ask Claire button — which this tab already renders itself. So the
    // FAQ tab must be mounted without an actionsSlot at all; passing one would
    // put two identical Claire CTAs one scroll apart on phones.
    const faqMount = mapView.slice(mapView.indexOf('<FaqPanel'));
    expect(faqMount.slice(0, faqMount.indexOf('/>'))).not.toContain('actionsSlot');
    // Every other tab still gets the row.
    expect(mapView).toContain('actionsSlot={panelActionsRow}');
  });
});

describe('panel header keeps the data-card header standard', () => {
  const header = read('components/ParcelPanelHeader.tsx');

  it('uses the content-sized flex chip row, never a rigid grid (R2)', () => {
    expect(header).toContain('flex flex-wrap gap-2');
    expect(header).toContain('min-w-[min(fit-content,100%)]');
    expect(header).toContain('max-w-full');
    expect(header).not.toContain('grid-cols-2');
  });

  it('keeps six decimals of coordinate precision in display and copy payload', () => {
    expect(header).toContain('lat.toFixed(6)');
    expect(header).toContain('lng.toFixed(6)');
  });

  it('carries at most two icon actions beside close (R3)', () => {
    const actionsBlock = mapView.slice(
      mapView.indexOf('<ParcelPanelHeader'),
      mapView.indexOf('data-tour="zone-charts"'),
    );
    // Count EVERY control in the slot, not just raw <button> tags — the Track
    // toggle is a component, so a `<button>`-only count would silently allow a
    // third action to sneak in. Today: raw-JSON toggle + Track = 2, plus close.
    const iconActions = [
      ...(actionsBlock.match(/<button/g) ?? []),
      ...(actionsBlock.match(/<TrackParcelButton/g) ?? []),
    ];
    expect(iconActions.length).toBeLessThanOrEqual(2);
    expect(actionsBlock.match(/<CloseButton/g) ?? []).toHaveLength(1);
  });
});

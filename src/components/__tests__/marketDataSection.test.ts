import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Source contracts for the Market section's three empty-ish states: loading,
 * uncovered commune, failed lookup.
 *
 * These read the shipped source rather than rendering, for the same reason the
 * panel-tab suite does: what is worth protecting is which branch wins in which
 * order and what each one says, and none of it has a runtime value to assert
 * without standing up the whole panel. The fetch outcomes themselves are
 * covered runtime-side in services/cityMarketService.test.ts.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const section = read('MarketDataSection.tsx');
const panel = read('MarketPanel.tsx');
const i18n = readFileSync(new URL('../../contexts/I18nContext.tsx', import.meta.url), 'utf8');

const LOCALES = ['en', 'fr', 'de', 'it'] as const;

/** Slice out one locale's dictionary block, as the panel-tab suite does. */
function localeBlock(locale: string): string {
  const start = i18n.indexOf(`\n  ${locale}: {`);
  expect(start, `${locale} dictionary missing`).toBeGreaterThan(-1);
  const next = LOCALES.map((l) => i18n.indexOf(`\n  ${l}: {`))
    .filter((i) => i > start)
    .sort((a, b) => a - b)[0];
  return i18n.slice(start, next === undefined ? i18n.length : next);
}

describe('loading state', () => {
  it('seeds `loading` from the same predicate the effect gates on', () => {
    // Passive effects run after the first commit, so a `false` seed would paint
    // the no-data line for a frame before the request had started.
    expect(section).toContain('useState(() => canLookupMarket(bfs, cityName))');
    expect(section).not.toContain('const [loading, setLoading] = useState(false)');
  });

  it('gates the effect, the hidden-section return and the shell on that one predicate', () => {
    expect(section.match(/canLookupMarket\(bfs, cityName\)/g)?.length).toBe(3);
    expect(panel).toContain('canLookupMarket(bfs, cityName)');
    expect(section).not.toContain('Number.isFinite(bfs)) && !cityName');
  });
});

describe('failed lookup is not phrased as missing coverage', () => {
  it('renders its own message with a retry, not the no-data sentence', () => {
    expect(section).toContain("t('market.error')");
    expect(section).toContain("t('market.retry')");
    expect(section).toContain('onClick={retry}');
  });

  it('checks the failure branch before the no-data branch', () => {
    const failed = section.indexOf('failed ? (');
    const noData = section.indexOf("t('market.no_data'");
    expect(failed).toBeGreaterThan(-1);
    expect(noData).toBeGreaterThan(failed);
  });

  it('re-runs the lookup on retry rather than only clearing the message', () => {
    expect(section).toContain('setRetryToken((n) => n + 1)');
    expect(section).toContain('[bfs, cityName, canton, retryToken]');
  });

  it('reads the outcome union instead of collapsing every failure to null', () => {
    expect(section).toContain("res.status === 'ok' ? res.data : null");
    expect(section).toContain("setFailed(res.status === 'error')");
  });
});

describe('translations', () => {
  it('ships the failure message and the retry label in all four locales', () => {
    for (const locale of LOCALES) {
      const block = localeBlock(locale);
      expect(block, `${locale} missing market.error`).toContain("'market.error':");
      expect(block, `${locale} missing market.retry`).toContain("'market.retry':");
    }
  });

  it('keeps the failure message free of a municipality name', () => {
    // "No market data for Zurich" is the coverage sentence. An outage says
    // nothing about the commune, so its message must not name one.
    for (const locale of LOCALES) {
      const block = localeBlock(locale);
      const line = block.slice(block.indexOf("'market.error':"));
      expect(line.slice(0, 200), `${locale} interpolates a city`).not.toContain('{city}');
    }
  });
});

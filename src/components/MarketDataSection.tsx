import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Skeleton, SegmentedTabs } from '@aireon/shared';
import {
  fetchCityMarket,
  type CityMarket,
  type MarketFigures,
} from '../services/cityMarketService';
import { useI18n } from '../contexts/I18nContext';

/**
 * "Market" section for room's parcel-facts panel. Surfaces RealAdvisor
 * city-level market figures (rent + buy, apartments + houses) for the
 * municipality the selected parcel sits in.
 *
 * Self-contained data flow: given the parcel's BFS number + municipality name
 * it fetches `/api/city-market` (cached, degrades to null), so the parent only
 * has to mount it with those two props once `ParcelData` lands. When the fetch
 * returns null (no row / endpoint down) we show a muted "no data" line; while
 * it's in flight we show skeleton rows (suite convention — never a spinner).
 *
 * Two local toggles drive which figure block is shown:
 *   - mode:         rent | buy        (default rent)
 *   - propertyType: apartment | house (default apartment)
 *
 * The headline reads median / 80% range (p10–p90) / price per m². Below it,
 * per-room range bars reproduce the RealAdvisor look: every shown room's
 * [avg×0.8, avg×1.2] band is laid on ONE shared horizontal scale, so pricier
 * rooms sit further right and read longer at a glance. Each band spells out its
 * min and max at the ends and marks the median (under a one-time min/median/max
 * legend) so the range — not just one figure — is unmistakable.
 */

type Mode = 'rent' | 'buy';
type PropertyType = 'apartment' | 'house';

// Room-bucket order per property type — mirrors the RES `by_rooms` keys.
const ROOM_KEYS: Record<PropertyType, string[]> = {
  apartment: ['studio', '2', '3', '4', '5'],
  house: ['4', '5', '6', '7', '8'],
};

interface MarketDataSectionProps {
  /** BFS commune number of the selected parcel (preferred match key). */
  bfs: number | null;
  /** Municipality name — the name fallback + the section's display label. */
  cityName: string | null;
  /** Canton abbreviation, narrowing an ambiguous city name on the server. */
  canton?: string | null;
  /** Active theme — drives the dark-mode chrome + skeleton tint. */
  darkMode?: boolean;
}

const MarketDataSection = ({
  bfs,
  cityName,
  canton = null,
  darkMode = true,
}: MarketDataSectionProps) => {
  const { t } = useI18n();
  const [data, setData] = useState<CityMarket | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('rent');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');

  // (Re)fetch whenever the selected parcel's city changes. Resolves to null on
  // 404 / error, which we render as the muted no-data line.
  useEffect(() => {
    if ((bfs == null || !Number.isFinite(bfs)) && !cityName) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetchCityMarket(bfs, cityName, canton)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bfs, cityName, canton]);

  // Nothing selected → render nothing (the section is hidden entirely).
  if ((bfs == null || !Number.isFinite(bfs)) && !cityName) return null;

  const label = cityName ?? '';
  const figures: MarketFigures | null = data
    ? data[propertyType][mode]
    : null;

  return (
    <Section
      title={`${t('panel.info.section.market')}${label ? ` · ${label}` : ''}`}
      subtitle={data?.scrape_date ?? null}
    >
      {/* ── Toggles: Rent/Buy and Apartments/Houses ─────────────────────── */}
      <div className="space-y-2">
        <SegmentedTabs<Mode>
          tabs={[
            { id: 'rent', label: t('market.toggle.rent') },
            { id: 'buy', label: t('market.toggle.buy') },
          ]}
          value={mode}
          onChange={setMode}
          ariaLabel={t('market.toggle.rent')}
          dark={darkMode}
          size="sm"
          activeTone="accent"
        />
        <SegmentedTabs<PropertyType>
          tabs={[
            { id: 'apartment', label: t('market.toggle.apartments') },
            { id: 'house', label: t('market.toggle.houses') },
          ]}
          value={propertyType}
          onChange={setPropertyType}
          ariaLabel={t('market.toggle.apartments')}
          dark={darkMode}
          size="sm"
          activeTone="accent"
        />
      </div>

      {loading ? (
        <MarketSkeleton darkMode={darkMode} />
      ) : !data || !figures ? (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {t('market.no_data', { city: label })}
        </p>
      ) : (
        <MarketBody
          figures={figures}
          mode={mode}
          propertyType={propertyType}
          listings={data.listings}
        />
      )}
    </Section>
  );
};

/** The headline + per-room bars + footnote + listing count, given one block. */
const MarketBody = ({
  figures,
  mode,
  propertyType,
  listings,
}: {
  figures: MarketFigures;
  mode: Mode;
  propertyType: PropertyType;
  listings: CityMarket['listings'];
}) => {
  const { t } = useI18n();

  // Listing count for the active rent/buy + property combination.
  const listingCount =
    mode === 'rent'
      ? propertyType === 'apartment'
        ? listings.apartments_for_rent
        : listings.houses_for_rent
      : propertyType === 'apartment'
        ? listings.apartments_for_sale
        : listings.houses_for_sale;

  const hasRange = figures.p10 != null && figures.p90 != null;

  return (
    <div className="mt-3 space-y-3">
      {/* ── Headline: median (large) · 80% range · CHF/m²·yr ───────────── */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {figures.median != null ? `CHF ${fmt(figures.median)}` : '—'}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t('market.median')}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {hasRange && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {t('market.range')}:{' '}
              <span className="tabular-nums text-gray-700 dark:text-gray-300">
                {fmt(figures.p10 as number)}–{fmt(figures.p90 as number)}
              </span>
            </span>
          )}
          {figures.price_m2 != null && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              <span className="tabular-nums text-gray-700 dark:text-gray-300">
                CHF {fmt(figures.price_m2)}
              </span>{' '}
              {t('market.per_m2')}
            </span>
          )}
        </div>
      </div>

      {/* ── Per-room range bars (RealAdvisor-style, shared scale) ───────── */}
      <RoomRangeBars byRooms={figures.by_rooms} propertyType={propertyType} />

      {/* ── Indicative footnote with tooltip ───────────────────────────── */}
      <p
        className="text-[10px] leading-relaxed text-gray-400 dark:text-gray-500"
        title={t('market.ranges_indicative')}
      >
        {t('market.ranges_indicative')}
      </p>

      {/* ── Listing count (muted) ──────────────────────────────────────── */}
      {listingCount != null && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {t(
            mode === 'rent' ? 'market.for_rent_count' : 'market.for_sale_count',
            { count: listingCount },
          )}
        </p>
      )}
    </div>
  );
};

/**
 * Per-room ±20% range bars laid on ONE shared horizontal scale.
 *
 * For each non-null room average `v` the band spans [v*0.8, v*1.2] with a marker
 * at the median `v`. scaleMin/scaleMax are taken across every shown room so the
 * bars are directly comparable: a pricier room's band starts further right and
 * runs longer, exactly like the RealAdvisor screenshot. Pure flex/positioned
 * divs — no chart lib.
 *
 * Layout is one row per room, under a one-time min/median/max legend: the min
 * and max of each band are spelled out at the ends of the bar and the median
 * floats directly above its marker (a high-contrast tick on the bar). This
 * kills the old ambiguity where the lone right-hand number read as the band's
 * max instead of the median.
 */
const RoomRangeBars = ({
  byRooms,
  propertyType,
}: {
  byRooms: Record<string, number | null>;
  propertyType: PropertyType;
}) => {
  const { t } = useI18n();

  // Keep the canonical room order, dropping buckets with no value.
  const rooms = ROOM_KEYS[propertyType]
    .map((key) => ({ key, value: byRooms[key] }))
    .filter((r): r is { key: string; value: number } => r.value != null && Number.isFinite(r.value));

  if (rooms.length === 0) return null;

  const lows = rooms.map((r) => r.value * 0.8);
  const highs = rooms.map((r) => r.value * 1.2);
  const scaleMin = Math.min(...lows);
  const scaleMax = Math.max(...highs);
  const span = scaleMax - scaleMin || 1; // guard div-by-zero (single equal row)

  const pct = (val: number) => ((val - scaleMin) / span) * 100;

  return (
    <div>
      {/* Column legend (once) — labels the three figures spelled out below. */}
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        <span className="w-12 flex-shrink-0" aria-hidden="true" />
        <span className="w-14 flex-shrink-0 text-right">{t('market.legend.min')}</span>
        <span className="flex-1 text-center">{t('market.legend.median')}</span>
        <span className="w-14 flex-shrink-0">{t('market.legend.max')}</span>
      </div>

      <div className="space-y-1">
        {rooms.map(({ key, value }) => {
          const low = value * 0.8;
          const high = value * 1.2;
          const leftPct = pct(low);
          const widthPct = Math.max(pct(high) - leftPct, 2); // keep a visible sliver
          const tickPct = pct(value);
          return (
            <div key={key} className="pt-4">{/* reserve space above the bar for the floating median label */}
              <div className="flex items-center gap-2">
                <span className="w-12 flex-shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  {t(`market.room.${key}`)}
                </span>
                <span className="w-14 flex-shrink-0 text-right text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                  {fmt(low)}
                </span>
                <div className="relative h-3 flex-1 rounded-full bg-gray-200/70 dark:bg-gray-800/70">
                  <div
                    className="absolute top-0 h-full rounded-full bg-indigo-500/80 dark:bg-indigo-400/80"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                  {/* median value — floats directly above its marker */}
                  <span
                    className="absolute bottom-full mb-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-gray-900 dark:text-gray-100"
                    style={{ left: `${tickPct}%` }}
                  >
                    {fmt(value)}
                  </span>
                  {/* median marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[15px] w-[2px] rounded-full bg-white shadow-[0_0_0_1px_rgba(30,27,75,0.55)] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                    style={{ left: `calc(${tickPct}% - 1px)` }}
                  />
                </div>
                <span className="w-14 flex-shrink-0 text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                  {fmt(high)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MarketSkeleton = ({ darkMode = true }: { darkMode?: boolean }) => (
  <div className="mt-3 space-y-3">
    <Skeleton dark={darkMode} width={120} height={20} radius={6} />
    <Skeleton dark={darkMode} width={160} height={10} radius={4} delay="60ms" />
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton dark={darkMode} width={40} height={10} radius={4} delay={`${i * 50}ms`} />
          <div className="flex-1">
            <Skeleton dark={darkMode} width="100%" height={12} radius={6} delay={`${i * 50}ms`} />
          </div>
          <Skeleton dark={darkMode} width={48} height={10} radius={4} delay={`${i * 50}ms`} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Section card — mirrors ZoneInfoPanel's local `Section` (same surface tokens)
 * but takes a header `subtitle` (the scrape date, shown small/muted) and a
 * fixed TrendingUp icon, so the Market block reads consistently with the
 * Location / Zoning / Built / Age sections above it.
 */
const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) => (
  <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg p-3">
    <div className="flex items-center justify-between gap-2 mb-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <TrendingUp size={12} className="text-indigo-500/80 dark:text-indigo-400/80 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
          {title}
        </span>
      </div>
      {subtitle && (
        <span className="text-[10px] text-gray-400 dark:text-gray-400 tabular-nums flex-shrink-0">
          {subtitle}
        </span>
      )}
    </div>
    {children}
  </div>
);

/** Same number formatter as ZoneInfoPanel.fmt — thousands-grouped CHF figures. */
function fmt(n: number): string {
  return Math.abs(n) >= 1000
    ? n.toLocaleString('en-CH', { maximumFractionDigits: 0 })
    : n.toFixed(0);
}

export default MarketDataSection;

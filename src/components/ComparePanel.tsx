import { useEffect, useState, type ReactNode } from 'react';
import { ComparablesPanel, rankComparables, type Comparable } from '@aireon/shared';
import type { FocusedParcelHandle } from './ZoneInfoPanel';
import { PanelScroll } from './PanelKit';
import { useI18n } from '../contexts/I18nContext';

/** Widening search radii, in degrees, retried until a for-sale neighbour lands. */
const SEARCH_RADII_DEG = [0.006, 0.012, 0.025];
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 400;

/**
 * "Compare" tab — the nearest for-sale parcels ranked against the selected one.
 *
 * ADMIN ONLY, deliberately. The ranking keys off `estimated_price_m2`, which is
 * a LIVING-SPACE figure, not a land figure: it is meaningful for ordering
 * neighbours but it is not a parcel valuation, and shown to a general user next
 * to room's zoning numbers it reads like one. MapView therefore only offers the
 * tab once `fetchIsAdmin()` resolves true. Keep that gate — if the pricing basis
 * is ever reconciled, drop the gate deliberately rather than by accident.
 *
 * The pool comes from the rendered vector tiles, so it is only as complete as
 * what the map has drawn; the widening-radius retry covers the case where the
 * tiles around the click have not landed yet on the first pass.
 */
const ComparePanel = ({
  focusedParcel,
  queryNearbyParcels,
  onJumpTo,
  darkMode = true,
  actionsSlot,
}: {
  focusedParcel: FocusedParcelHandle | null;
  queryNearbyParcels: (
    lng: number,
    lat: number,
    radiusDeg: number,
    limit?: number,
  ) => Array<{ properties: Record<string, unknown>; lng: number; lat: number }>;
  onJumpTo: (lng: number, lat: number) => void;
  darkMode?: boolean;
  actionsSlot?: ReactNode;
}) => {
  const { t, locale } = useI18n();
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [loading, setLoading] = useState(false);

  const parcelProps = focusedParcel?.props ?? null;
  const lng = focusedParcel?.lng ?? null;
  const lat = focusedParcel?.lat ?? null;

  const refPriceM2 = (() => {
    const v = parcelProps?.estimated_price_m2 ?? parcelProps?.price_m2;
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })();

  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setComparables([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setComparables([]);
    const refProps = { ...(parcelProps ?? {}) };
    const tryQuery = (attempt = 0): void => {
      if (cancelled) return;
      const radius = SEARCH_RADII_DEG[Math.min(attempt, SEARCH_RADII_DEG.length - 1)];
      const pool = queryNearbyParcels(lng, lat, radius, 80);
      const ranked = rankComparables({
        ref: { lng, lat, properties: refProps },
        pool,
        limit: 5,
        onlyForSale: true,
      });
      if (ranked.length > 0 || attempt >= MAX_ATTEMPTS) {
        setComparables(ranked);
        setLoading(false);
      } else {
        timer = setTimeout(() => tryQuery(attempt + 1), RETRY_DELAY_MS);
      }
    };
    tryQuery();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [lng, lat, parcelProps, queryNearbyParcels]);

  return (
    <PanelScroll actionsSlot={actionsSlot} padded={false}>
      <section className="px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">
          {t('panel.compare.heading')}
        </p>
        <ComparablesPanel
          refPriceM2={refPriceM2}
          comparables={comparables}
          loading={loading}
          darkMode={darkMode}
          onJumpTo={onJumpTo}
          locale={locale}
        />
        <p className="mt-3 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
          {t('panel.compare.basis_note')}
        </p>
      </section>
    </PanelScroll>
  );
};

export default ComparePanel;

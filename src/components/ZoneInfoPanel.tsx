import { useEffect, useState } from 'react';
import type * as GeoJSON from 'geojson';
import {
  AlertCircle,
  MapPin,
  Building2,
  Calendar,
  Layers,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import {
  Skeleton,
  ParcelAerialThumbnail,
  ParcelIdentityHeader,
  ComparablesPanel,
  BuildableMassingSection,
  rankComparables,
  type Comparable,
} from '@aireon/shared';
import type { ParcelData } from '../services/parcelDataService';
import MarketDataSection from './MarketDataSection';
import { useI18n } from '../contexts/I18nContext';

const COMPS_HEADING: Record<string, string> = {
  en: 'Nearby comparables (for sale)',
  fr: 'Parcelles à vendre à proximité',
  de: 'Vergleichbare Verkäufe in der Nähe',
  it: 'Parcelle in vendita nelle vicinanze',
};

/**
 * Identity of the parcel the user has currently focused. Mirrors MapView's
 * `SelectedParcel` minus the bag of mapbox feature properties — only the bits
 * the PRM save endpoint needs.
 */
export interface FocusedParcelHandle {
  parcelId: string;
  lng: number;
  lat: number;
  /** Optional raw mapbox properties, used to recover area/municipality fallbacks. */
  props?: Record<string, unknown>;
}

interface ZoneInfoPanelProps {
  parcelData: ParcelData | null;
  isLoading: boolean;
  error: string | null;
  /** The currently-selected parcel — used for the header address fallback.
   *  Saving is handled by the panel-footer SaveToPrmBar, not here. */
  focusedParcel?: FocusedParcelHandle | null;
  /** The clicked parcel POLYGON geometry (vector-tile feature.geometry) — the
   *  lite base fed to the shared 3D buildable-massing simulator. */
  geometry?: GeoJSON.Geometry | null;
  /** Query rendered parcel features around a point — fed to the comparables ranking. */
  queryNearbyParcels?: (lng: number, lat: number, radiusDeg: number, limit?: number) => Array<{ properties: Record<string, unknown>; lng: number; lat: number }>;
  /** Fly the map to a comparable parcel when its card is clicked. */
  onJumpTo?: (lng: number, lat: number) => void;
  /** Active theme — drives the shared aerial thumbnail + comparables chrome. */
  darkMode?: boolean;
}

/**
 * Parcel-facts header for room. Replaces groove's GWR-shaped `InfoPanel`.
 * Renders a compact summary of the selected parcel — address, municipality,
 * zoning codes, area, built volume, construction year — plus the two
 * utilisation-balance fields (`ratio_v` and `free_v`) that immediately tell
 * the user "this parcel is over- / under- / fully built relative to its
 * allowed zoning utilisation".
 *
 * While `parcelDataService` is in flight we render a Skeleton stand-in so
 * the panel slot doesn't collapse and the layout stays stable.
 */
const ZoneInfoPanel = ({
  parcelData,
  isLoading,
  error,
  focusedParcel = null,
  geometry = null,
  queryNearbyParcels,
  onJumpTo,
  darkMode = true,
}: ZoneInfoPanelProps) => {
  const { t, locale } = useI18n();

  // ── Nearby comparables ──────────────────────────────────────────────────
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [compsLoading, setCompsLoading] = useState(false);

  // The selected parcel's raw tile props carry is_sell / estimated_price_m2 /
  // parcel_area / cz_local; lng/lat are the click-derived centroid coords.
  const parcelProps = focusedParcel?.props ?? null;
  const lng = focusedParcel?.lng ?? null;
  const lat = focusedParcel?.lat ?? null;
  const refPriceM2 = (() => {
    const v = (parcelProps?.estimated_price_m2 ?? parcelProps?.price_m2);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })();

  useEffect(() => {
    if (!queryNearbyParcels || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) { setComparables([]); setCompsLoading(false); return; }
    let cancelled = false; let timer: ReturnType<typeof setTimeout> | null = null;
    setCompsLoading(true); setComparables([]);
    const refProps = { ...(parcelProps ?? {}) };
    const tryQuery = (attempt = 0): void => {
      if (cancelled) return;
      const radii = [0.006, 0.012, 0.025];
      const pool = queryNearbyParcels(lng, lat, radii[Math.min(attempt, radii.length - 1)], 80);
      const ranked = rankComparables({ ref: { lng, lat, properties: refProps }, pool, limit: 5, onlyForSale: true });
      if (ranked.length > 0 || attempt >= 4) { setComparables(ranked); setCompsLoading(false); }
      else { timer = setTimeout(() => tryQuery(attempt + 1), 400); }
    };
    tryQuery();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [lng, lat, parcelProps, queryNearbyParcels]);

  // ── Suite-standard parcel identity ─────────────────────────────────────
  // The address is the header title; the municipality is the muted subtitle
  // (room's payload has no zip/postal, so the subtitle is the city fragment
  // alone when available). The EGRID prefers the federal id, falling back to
  // the parcel id, then the focused parcel's id — rendered as a copyable chip
  // by the shared ParcelIdentityHeader. While the address is still loading we
  // pass the click-derived lng/lat as the title so the header isn't empty.
  const headerAddress = parcelData?.address
    ? parcelData.address
    : !isLoading && focusedParcel
      ? formatLngLat(focusedParcel.lng, focusedParcel.lat)
      : null;
  const headerEgrid =
    parcelData?.egrid ?? parcelData?.parcel_id ?? focusedParcel?.parcelId ?? null;
  const showThumb =
    !!focusedParcel &&
    Number.isFinite(focusedParcel.lng) &&
    Number.isFinite(focusedParcel.lat);

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full">
      {(parcelData?.address || isLoading || focusedParcel) && (
        isLoading && !parcelData?.address ? (
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/40">
            <Skeleton dark={darkMode} width={180} height={10} radius={4} />
          </div>
        ) : (
          <ParcelIdentityHeader
            address={headerAddress}
            subtitle={parcelData?.municipality_name ?? null}
            egrid={headerEgrid}
            dark={darkMode}
            className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/40"
            labels={{
              fallbackTitle: t('panel.info.header_fallback'),
              copy: t('panel.info.egrid_copy'),
              copied: t('panel.info.egrid_copied'),
            }}
          >
            {showThumb && (
              <ParcelAerialThumbnail
                lng={focusedParcel!.lng}
                lat={focusedParcel!.lat}
                areaM2={Number(parcelData?.parcel_area) || null}
                dark={darkMode}
                labels={{
                  imageAlt: t('panel.info.satellite_alt'),
                  expand: t('panel.info.satellite_expand'),
                  dialogAria: t('panel.info.satellite_aria'),
                  close: t('panel.info.close'),
                }}
              />
            )}
          </ParcelIdentityHeader>
        )
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && <ZoneInfoSkeleton darkMode={darkMode} />}

        {!isLoading && error && (
          <div className="m-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-500 dark:text-red-400">
                  {t('panel.info.failed_to_load')}
                </p>
                <p className="text-[11px] text-red-500/70 dark:text-red-400/60 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && parcelData && (
          <div className="p-4 space-y-4">
            <Section icon={<MapPin size={12} className="text-red-500/80 dark:text-red-400/80" />} title={t('panel.info.section.location')}>
              <Row label={t('panel.info.row.municipality')} value={parcelData.municipality_name} />
              <Row label={t('panel.info.row.fso')} value={parcelData.fso} mono />
              {/* EGRID now lives in the header as a copyable chip (ParcelIdentityHeader). */}
            </Section>

            <Section icon={<Layers size={12} className="text-amber-500/80 dark:text-amber-400/80" />} title={t('panel.info.section.zoning')}>
              <Row label={t('panel.info.row.cz_local')} value={parcelData.cz_local} mono />
              <Row label={t('panel.info.row.cz_canton')} value={parcelData.cz_canton} mono />
              <Row
                label={t('panel.info.row.allowed_util')}
                value={parcelData.cz_util_now != null ? `${fmt(parcelData.cz_util_now)} m³` : null}
              />
            </Section>

            <Section icon={<Building2 size={12} className="text-teal-500/80 dark:text-teal-400/80" />} title={t('panel.info.section.built')}>
              <Row
                label={t('panel.info.row.parcel_area')}
                value={parcelData.parcel_area != null ? `${fmt(parcelData.parcel_area)} m²` : null}
              />
              <Row
                label={t('panel.info.row.built_volume')}
                value={parcelData.built_volume != null ? `${fmt(parcelData.built_volume)} m³` : null}
              />
              <Row label={t('panel.info.row.gfz')} value={parcelData.gfz != null ? parcelData.gfz.toFixed(2) : null} />
              <Row
                label={t('panel.info.row.height')}
                value={parcelData.bldg_height_m != null ? `${parcelData.bldg_height_m.toFixed(1)} m` : null}
              />
              <Row
                label={t('panel.info.row.floors')}
                value={parcelData.bldg_floors_n != null ? String(parcelData.bldg_floors_n) : null}
              />
            </Section>

            <Section icon={<Calendar size={12} className="text-sky-500/80 dark:text-sky-400/80" />} title={t('panel.info.section.age')}>
              <Row
                label={t('panel.info.row.year_built')}
                value={parcelData.bldg_constr_year != null ? String(parcelData.bldg_constr_year) : null}
              />
            </Section>

            {/* City-level market figures (RealAdvisor rent + buy, apartments +
                houses) for the municipality this parcel sits in. Self-fetches
                from /api/city-market off the parcel's BFS + municipality name;
                hides itself when there's no data. */}
            <MarketDataSection
              bfs={parcelData.fso}
              cityName={parcelData.municipality_name}
              darkMode={darkMode}
            />

            {/* The two ratio fields are the headline — give them a prominent
                bar each so the user can read "this parcel is X% utilised /
                Y m³ headroom" without parsing a table. */}
            <RatioCard
              label={t('panel.info.ratio_v.label')}
              ratio={parcelData.ratio_v}
              hint={
                parcelData.ratio_v == null
                  ? t('panel.info.ratio_v.no_reference')
                  : undefined
              }
            />
            <FreeVolumeCard freeV={parcelData.free_v} />
            <RatioCard
              label={t('panel.info.ratio_s.label')}
              ratio={parcelData.ratio_s}
            />
          </div>
        )}

        {/* 3D buildable-massing simulator. Self-contained: ships its own i18n,
            fetches RES spare_space directly, and renders NOTHING when there is
            no polygon geometry and no spare_space candidate — so it's safe to
            always mount. Hybrid: real spare_space when matched, else a lite
            volume estimated from the clicked parcel ring + area. */}
        {(geometry || (lng != null && lat != null)) && (
          <BuildableMassingSection
            dark={darkMode}
            locale={locale}
            geometry={geometry}
            areaM2={Number(parcelData?.parcel_area) || null}
            egrid={headerEgrid ?? undefined}
            lngLat={lng != null && lat != null ? [lng, lat] : undefined}
            className="px-4 pb-4 border-t border-gray-200 dark:border-slate-700/60"
          />
        )}

        {queryNearbyParcels && onJumpTo && (
          <section className="px-4 py-3 border-t border-gray-200 dark:border-slate-700/60">
            <p className="mb-2 text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-400">
              {COMPS_HEADING[locale] ?? COMPS_HEADING.en}
            </p>
            <ComparablesPanel
              refPriceM2={refPriceM2}
              comparables={comparables}
              loading={compsLoading}
              darkMode={darkMode}
              onJumpTo={onJumpTo}
              locale={locale}
            />
          </section>
        )}

        <ParcelFaq />
      </div>
    </div>
  );
};

/**
 * Compact "Frequently asked questions" disclosure pinned to the bottom of the
 * parcel-facts pane. Native <details>/<summary> — keyboard- and screenreader-
 * accessible with zero deps — styled to match the panel's Section cards. The
 * Q&A text is mirrored byte-for-byte (EN) into the FAQPage JSON-LD in
 * index.html so the visible content backs the structured data. The third
 * question is the binding-utilisation disclaimer, surfaced exactly where the
 * user reads the ratioV / freeV figures.
 */
const ParcelFaq = () => {
  const { t } = useI18n();
  const qas: Array<{ q: string; a: string }> = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
  ];
  return (
    <section className="px-4 py-3 border-t border-gray-200 dark:border-gray-800/50">
      <div className="flex items-center gap-1.5 mb-2">
        <HelpCircle size={12} className="text-gray-400 dark:text-gray-500" />
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('faq.title')}
        </span>
      </div>
      <div className="space-y-1.5">
        {qas.map(({ q, a }) => (
          <details
            key={q}
            className="group bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg overflow-hidden"
          >
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-gray-700 dark:text-gray-200 select-none hover:bg-gray-200/50 dark:hover:bg-gray-800/40 transition-colors">
              <span>{q}</span>
              <ChevronDown
                size={13}
                className="flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-3 pb-2.5 pt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
};

const ZoneInfoSkeleton = ({ darkMode = true }: { darkMode?: boolean }) => (
  <div className="p-4 space-y-4">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/40 rounded-lg p-3 space-y-2"
      >
        <Skeleton dark={darkMode} width={80} height={10} radius={4} delay={`${i * 60}ms`} />
        {[0, 1, 2].map((j) => (
          <div key={j} className="flex items-baseline justify-between gap-3">
            <Skeleton dark={darkMode} width={70} height={10} radius={4} delay={`${i * 60}ms`} />
            <Skeleton dark={darkMode} width={60} height={10} radius={4} delay={`${i * 60}ms`} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg p-3">
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {title}
      </span>
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Row = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-gray-400 dark:text-gray-500">{label}</span>
      <span
        className={`text-[11px] text-gray-800 dark:text-gray-200 text-right truncate ${
          mono ? 'font-mono' : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
};

/**
 * A horizontal fill-bar for the headline ratio fields. `ratio_v`/`ratio_s`
 * arrive from RES as PERCENTAGES of the zone allowance (100 = built exactly to
 * the allowed volume/coverage, >100 = over-built), not 0..1 fractions. The bar
 * caps at 100% for geometry but the label always shows the true percentage, so
 * an over-built parcel still reads honestly.
 */
const RatioCard = ({
  label,
  ratio,
  hint,
}: {
  label: string;
  ratio: number | null;
  hint?: string;
}) => {
  const { t } = useI18n();
  if (ratio == null) {
    return (
      <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint ?? t('panel.info.no_data_for_parcel')}</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, ratio));
  const over = ratio > 100;

  return (
    <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            over ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {Math.round(ratio)}%
          {over && ' ↑'}
        </p>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const FreeVolumeCard = ({ freeV }: { freeV: number | null }) => {
  const { t } = useI18n();
  if (freeV == null) {
    return (
      <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('panel.info.free_v.label')}
        </p>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('panel.info.no_data_for_parcel')}</p>
      </div>
    );
  }
  const positive = freeV >= 0;
  return (
    <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('panel.info.free_v.label')}
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            positive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          }`}
        >
          {positive ? '+' : ''}
          {fmt(freeV)} m³
        </p>
      </div>
      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        {positive ? t('panel.info.free_v.positive') : t('panel.info.free_v.negative')}
      </p>
    </div>
  );
};

function fmt(n: number): string {
  return Math.abs(n) >= 1000 ? n.toLocaleString('en-CH', { maximumFractionDigits: 0 }) : n.toFixed(1);
}

/** Fallback header label when RES hasn't returned an address yet. */
function formatLngLat(lng: number, lat: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default ZoneInfoPanel;

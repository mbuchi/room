import type { ReactNode } from 'react';
import { DataPillGroup, LoadingFeedback, Skeleton, type DataPillItem } from '@aireon/shared';
import type { ParcelData } from '../services/parcelDataService';
import { PanelError, PanelScroll } from './PanelKit';
import { useI18n } from '../contexts/I18nContext';

/**
 * Identity of the parcel the user has currently focused. Mirrors MapView's
 * `SelectedParcel` minus the bag of maplibre feature properties — only the bits
 * the PRM save endpoint and the panel chrome need.
 */
export interface FocusedParcelHandle {
  parcelId: string;
  lng: number;
  lat: number;
  /** Optional raw tile properties, used to recover area/municipality fallbacks. */
  props?: Record<string, unknown>;
}

interface ZoneInfoPanelProps {
  parcelData: ParcelData | null;
  isLoading: boolean;
  error: string | null;
  /** Suite data-card standard primary-actions row, rendered as the LAST
   *  section of the scrollable details. */
  actionsSlot?: ReactNode;
  /** Active theme — drives the loading-skeleton shimmer chrome. */
  darkMode?: boolean;
}

/**
 * "Parcel" tab — the plain facts for the selected parcel: where it is, how it
 * is zoned, what is already built on it, how old that is, and the two
 * utilisation-balance figures (`ratio_v`, `free_v`) that answer "is this parcel
 * over-, under- or fully built relative to its allowed zoning utilisation?".
 *
 * Deliberately nothing else. The identity block (address, municipality, EGRID,
 * Lat/Lng, aerial thumbnail) is now the panel-level `ParcelPanelHeader` shared
 * by every tab, and the three heavyweights this file used to carry — city
 * market figures, the 3D massing simulator and the for-sale comparables — are
 * their own level-1 tabs. What is left is a short, scannable column instead of
 * a 600-line scroll that buried its own headline numbers.
 */
const ZoneInfoPanel = ({
  parcelData,
  isLoading,
  error,
  actionsSlot,
  darkMode = true,
}: ZoneInfoPanelProps) => {
  const { t } = useI18n();

  // ── Data pills (DATA_PILLS_STANDARD.md) ─────────────────────────────────
  // Location/Zoning and Building data pills render directly as DataPillGroup
  // sections with standard eyebrow headings (matching geopool).
  //
  // fso is the section's official identifier, so it gets `mono` + `copyable`
  // and a visible `label` (a bare digit string means nothing on its own).
  // The zone is ONE pill: `parcelData.zone`, the municipal designation
  // resolved by @aireon/shared/parcel-zone (PARCEL_ZONE_STANDARD.md).
  const zoningLocationPills: DataPillItem[] = parcelData
    ? [
        { key: 'municipality', value: parcelData.municipality_name, title: t('panel.info.row.municipality') },
        {
          key: 'fso',
          label: t('panel.info.row.fso'),
          value: parcelData.fso,
          mono: true,
          copyable: true,
        },
        { key: 'zone', value: parcelData.zone, title: t('panel.info.row.zone') },
        {
          key: 'allowed-util',
          value: parcelData.cz_util_now != null ? `${fmt(parcelData.cz_util_now)} m³` : null,
          title: t('panel.info.row.allowed_util'),
        },
      ]
    : [];

  // parcel_area/built_volume/bldg_height_m carry their unit inside the value
  // (m², m³, m), so a `title` tooltip is enough (DATA_PILLS_STANDARD R4).
  // gfz (a bare ratio), bldg_floors_n (a bare count) and bldg_constr_year (a
  // bare year) look identical to each other out of context, so those three
  // get a visible `label` prefix instead.
  const buildingPills: DataPillItem[] = parcelData
    ? [
        {
          key: 'parcel-area',
          value: parcelData.parcel_area != null ? `${fmt(parcelData.parcel_area)} m²` : null,
          title: t('panel.info.row.parcel_area'),
        },
        {
          key: 'built-volume',
          value: parcelData.built_volume != null ? `${fmt(parcelData.built_volume)} m³` : null,
          title: t('panel.info.row.built_volume'),
        },
        {
          key: 'gfz',
          label: t('panel.info.row.gfz'),
          value: parcelData.gfz != null ? parcelData.gfz.toFixed(2) : null,
        },
        {
          key: 'height',
          value: parcelData.bldg_height_m != null ? `${parcelData.bldg_height_m.toFixed(1)} m` : null,
          title: t('panel.info.row.height'),
        },
        {
          key: 'floors',
          label: t('panel.info.row.floors'),
          value: parcelData.bldg_floors_n != null ? String(parcelData.bldg_floors_n) : null,
        },
        {
          key: 'year-built',
          label: t('panel.info.row.year_built'),
          value: parcelData.bldg_constr_year != null ? String(parcelData.bldg_constr_year) : null,
        },
      ]
    : [];

  return (
    <PanelScroll actionsSlot={!isLoading && !error && parcelData ? actionsSlot : undefined}>
      {isLoading && (
        <LoadingFeedback
          label="Loading parcel information…"
          skeleton={<ZoneInfoSkeleton darkMode={darkMode} />}
        />
      )}

      {!isLoading && error && <PanelError title={t('panel.info.failed_to_load')} detail={error} />}

      {!isLoading && !error && parcelData && (
        <>
          <DataPillGroup
            heading={t('panel.info.section.zoning_location')}
            items={zoningLocationPills}
            dark={darkMode}
          />

          <DataPillGroup
            heading={t('panel.info.section.building')}
            items={buildingPills}
            dark={darkMode}
          />

          {/* The two ratio fields are the headline — give them a prominent bar
              each so the user can read "this parcel is X% utilised / Y m³
              headroom" without parsing a table. */}
          <RatioCard
            label={t('panel.info.ratio_v.label')}
            ratio={parcelData.ratio_v}
            hint={parcelData.ratio_v == null ? t('panel.info.ratio_v.no_reference') : undefined}
            darkMode={darkMode}
          />
          <FreeVolumeCard freeV={parcelData.free_v} darkMode={darkMode} />
          <RatioCard label={t('panel.info.ratio_s.label')} ratio={parcelData.ratio_s} darkMode={darkMode} />
        </>
      )}
    </PanelScroll>
  );
};

const ZoneInfoSkeleton = ({ darkMode = true }: { darkMode?: boolean }) => (
  <div className="space-y-4">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className={`rounded-lg px-4 py-3.5 ${
          darkMode ? 'bg-white/[0.035] ring-1 ring-white/[0.06]' : 'bg-slate-50 ring-1 ring-slate-200/80'
        } space-y-2`}
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
  darkMode = true,
}: {
  label: string;
  ratio: number | null;
  hint?: string;
  darkMode?: boolean;
}) => {
  const { t } = useI18n();
  const cardClass = `rounded-lg px-4 py-3.5 ${
    darkMode ? 'bg-white/[0.035] ring-1 ring-white/[0.06]' : 'bg-slate-50 ring-1 ring-slate-200/80'
  }`;

  if (ratio == null) {
    return (
      <div className={cardClass}>
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          {hint ?? t('panel.info.no_data_for_parcel')}
        </p>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, ratio));
  const over = ratio > 100;

  return (
    <div className={cardClass}>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            over ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {Math.round(ratio)}%{over && ' ↑'}
        </p>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const FreeVolumeCard = ({
  freeV,
  darkMode = true,
}: {
  freeV: number | null;
  darkMode?: boolean;
}) => {
  const { t } = useI18n();
  const cardClass = `rounded-lg px-4 py-3.5 ${
    darkMode ? 'bg-white/[0.035] ring-1 ring-white/[0.06]' : 'bg-slate-50 ring-1 ring-slate-200/80'
  }`;

  if (freeV == null) {
    return (
      <div className={cardClass}>
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('panel.info.free_v.label')}
        </p>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          {t('panel.info.no_data_for_parcel')}
        </p>
      </div>
    );
  }
  const positive = freeV >= 0;
  return (
    <div className={cardClass}>
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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

export default ZoneInfoPanel;

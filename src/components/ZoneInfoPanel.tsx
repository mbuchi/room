import type { ReactNode } from 'react';
import { MapPin, Building2 } from 'lucide-react';
import { DataPillGroup, LoadingFeedback, Skeleton, type DataPillItem } from '@aireon/shared';
import type { ParcelData } from '../services/parcelDataService';
import { PanelError, PanelScroll, Section } from './PanelKit';
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
  // The four former Row sections (Location / Zoning / Built / Age) collapse
  // into two DataPillGroup sections, each still wrapped in the card's own
  // Section chrome (icon + eyebrow title), so `heading` is omitted on the
  // group itself — the Section title already labels the row. EGRID and
  // Lat/Lng stay out of both groups; they live in the panel header's
  // copyable chips (ParcelPanelHeader), and no zone badge exists here to
  // duplicate either.
  //
  // fso is the section's official identifier, so it gets `mono` + `copyable`
  // and a visible `label` (a bare digit string means nothing on its own).
  // cz_local/cz_canton are short zone codes — `mono` for the same reason the
  // old Row rendered them in a monospace font, `title` tooltip because the
  // code alone doesn't say "this is the zone". municipality_name is a bare
  // place name, so it also gets a `title` tooltip rather than a label.
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
        { key: 'cz-local', value: parcelData.cz_local, mono: true, title: t('panel.info.row.cz_local') },
        { key: 'cz-canton', value: parcelData.cz_canton, mono: true, title: t('panel.info.row.cz_canton') },
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
  // get a visible `label` prefix instead — same treatment bloom gives its
  // floors/GFA pills.
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
          <Section
            icon={<MapPin size={12} className="text-red-500/80 dark:text-red-400/80" />}
            title={t('panel.info.section.zoning_location')}
          >
            <DataPillGroup items={zoningLocationPills} dark={darkMode} />
          </Section>

          <Section
            icon={<Building2 size={12} className="text-teal-500/80 dark:text-teal-400/80" />}
            title={t('panel.info.section.building')}
          >
            <DataPillGroup items={buildingPills} dark={darkMode} />
          </Section>

          {/* The two ratio fields are the headline — give them a prominent bar
              each so the user can read "this parcel is X% utilised / Y m³
              headroom" without parsing a table. */}
          <RatioCard
            label={t('panel.info.ratio_v.label')}
            ratio={parcelData.ratio_v}
            hint={parcelData.ratio_v == null ? t('panel.info.ratio_v.no_reference') : undefined}
          />
          <FreeVolumeCard freeV={parcelData.free_v} />
          <RatioCard label={t('panel.info.ratio_s.label')} ratio={parcelData.ratio_s} />
        </>
      )}
    </PanelScroll>
  );
};

const ZoneInfoSkeleton = ({ darkMode = true }: { darkMode?: boolean }) => (
  <>
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
  </>
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
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          {hint ?? t('panel.info.no_data_for_parcel')}
        </p>
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
          {Math.round(ratio)}%{over && ' ↑'}
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
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          {t('panel.info.no_data_for_parcel')}
        </p>
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

export default ZoneInfoPanel;

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DataPillGroup, LoadingFeedback, Skeleton, type DataPillItem } from '@aireon/shared';
import { PanelError } from './PanelKit';
import { useI18n } from '../contexts/I18nContext';
import {
  fetchZoneStats,
  getCachedZoneStats,
  type ZoneMetric,
  type ZoneStatsResponse,
  type ZoneSummary,
} from '../services/zoneStatsService';
import type { ParcelData } from '../services/parcelDataService';
import { percentileOfValue } from '../services/statsMath';
import ZoneSelectorDropdown from './ZoneSelectorDropdown';
import PercentileGauge from './charts/PercentileGauge';
import BoxplotDensity from './charts/BoxplotDensity';
import DistributionHistogram from './charts/DistributionHistogram';
import UtilizationOverTime from './charts/UtilizationOverTime';
import VolumeVsAreaScatter from './charts/VolumeVsAreaScatter';

interface ZonePanelProps {
  /** Parcel facts for the user-selected parcel — drives the "you are here" markers. */
  parcelData: ParcelData | null;
  /** Optional override — when the user picks a different zone in the dropdown,
   *  the chart context follows but the selected parcel doesn't change. */
  /**
   * Called whenever zone stats arrive (initial load or zone switch). MapView
   * uses the zone identity + ratio_v percentile breakpoints to recolour the
   * tile-driven density choropleth (and to follow a dropdown zone-switch).
   */
  onZoneStatsLoaded: (stats: ZoneStatsResponse) => void;
  /** Cleared when the panel closes so MapView can wipe the feature-state. */
  onZoneStatsCleared: () => void;
  /** Active theme — drives the loading-skeleton shimmer chrome. */
  darkMode?: boolean;
  /** Suite data-card standard primary-actions row (Ask Claire + "Open in"),
   *  rendered as the LAST section of the scrollable charts so the user
   *  scrolls to the bottom to reach it — not a bar pinned below the panel. */
  actionsSlot?: ReactNode;
}

interface MetricSpec {
  key: ZoneMetric;
  /** i18n key resolved via useI18n().t() at render time. */
  titleKey: string;
  unit?: string;
}

const METRICS: MetricSpec[] = [
  { key: 'ratio_v', titleKey: 'panel.zone.metric.ratio_v.title' },
  { key: 'free_v', titleKey: 'panel.zone.metric.free_v.title', unit: 'm³' },
  { key: 'ratio_s', titleKey: 'panel.zone.metric.ratio_s.title' },
  { key: 'gfz', titleKey: 'panel.zone.metric.gfz.title' },
  { key: 'bldg_height_m', titleKey: 'panel.zone.metric.bldg_height.title', unit: 'm' },
  { key: 'bldg_floors_n', titleKey: 'panel.zone.metric.bldg_floors.title' },
];

/**
 * "Zone" tab — every zone-distribution chart room ships, in ONE scroll:
 * percentile gauge, boxplot + density, six metric histograms, the utilisation
 * time-cohort line, and the parcel-area-vs-built-volume scatter.
 *
 * The scatter used to hide behind a second layer of tabs ("Distributions" /
 * "Area vs. volume") nested inside what was already a tab. Two levels of tabs
 * in a 460px rail meant the scatter was effectively undiscoverable, and the
 * inner tab state reset on every zone switch. It is now simply the last chart
 * in the flow: same charts, one scrollbar, no hidden state.
 *
 * This component also owns the zone-stats fetch lifecycle and the dropdown that
 * switches zones without re-fetching the parcel itself — the map's
 * feature-state repaints off the new payload.
 */
const ZonePanel = ({ parcelData, onZoneStatsLoaded, onZoneStatsCleared, darkMode = true, actionsSlot }: ZonePanelProps) => {
  const { locale, t } = useI18n();
  const [activeCzLocal, setActiveCzLocal] = useState<string | null>(null);
  const [stats, setStats] = useState<ZoneStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when the selected parcel changes (or unmounts).
  useEffect(() => {
    if (!parcelData?.fso || !parcelData.cz_local) {
      setStats(null);
      setActiveCzLocal(null);
      setError(null);
      onZoneStatsCleared();
      return;
    }
    setActiveCzLocal(parcelData.cz_local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelData?.fso, parcelData?.cz_local]);

  // Fetch zone stats whenever (fso, activeCzLocal) changes. Cache-first.
  useEffect(() => {
    if (!parcelData?.fso || !activeCzLocal) return;
    const fso = parcelData.fso;
    const cz = activeCzLocal;

    const cached = getCachedZoneStats({ fso, cz_local: cz });
    if (cached) {
      setStats(cached);
      setError(null);
      onZoneStatsLoaded(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchZoneStats({ fso, cz_local: cz, lang: locale })
      .then((res) => {
        if (cancelled) return;
        setStats(res);
        onZoneStatsLoaded(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStats(null);
        setError(err instanceof Error ? err.message : t('panel.zone.error_generic'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelData?.fso, activeCzLocal, locale]);

  // Compute the parcel's percentile per metric — used by the gauge and as
  // the "you are here" annotation value for the boxplot/histograms. The
  // selectedValues object holds the raw values for the same metrics.
  const { percentile, selectedValues } = useMemo(() => {
    const empty = {
      percentile: 0,
      selectedValues: {} as Partial<Record<ZoneMetric, number | null>>,
    };
    if (!stats || !parcelData) return empty;
    const selectedRatioV = parcelData.ratio_v;
    const ratioVPct =
      selectedRatioV != null
        ? percentileOfValue(stats.distributions.ratio_v ?? [], selectedRatioV)
        : 0;
    return {
      percentile: ratioVPct,
      selectedValues: {
        ratio_v: parcelData.ratio_v,
        free_v: parcelData.free_v,
        ratio_s: parcelData.ratio_s,
        gfz: parcelData.gfz,
        bldg_height_m: parcelData.bldg_height_m,
        bldg_floors_n: parcelData.bldg_floors_n,
      },
    };
  }, [stats, parcelData]);

  const handleZoneChange = (newCz: string) => {
    setActiveCzLocal(newCz);
  };

  const otherZones = stats?.other_zones ?? [];
  // Always include the current zone at the top of the dropdown.
  const dropdownZones = useMemo(() => {
    if (!stats) return [];
    const list = [...otherZones];
    if (!list.some((z) => z.cz_local === stats.zone.cz_local)) {
      list.unshift({ cz_local: stats.zone.cz_local, parcel_count: stats.zone.parcel_count });
    }
    // Move current zone to top.
    list.sort((a, b) => (a.cz_local === stats.zone.cz_local ? -1 : b.cz_local === stats.zone.cz_local ? 1 : 0));
    return list;
  }, [stats, otherZones]);

  // Headline cohort figures for the ratioV distribution — the median and the
  // mean of the zone the charts below are computed over. They used to exist
  // only as the 10px footnote under the boxplot ("n=125 · p50 94.70 · mean
  // 85.29"), which is the last place a reader looks and the first thing they
  // ask for: "what is normal HERE?". They are now data pills at the top of the
  // tab (DATA_PILLS_STANDARD.md) — bare numbers, so each carries a visible
  // `label` prefix (R4) and a `title` spelling out what it measures. Built
  // inline, like ZoneInfoPanel's pill rows: two `toFixed` calls per render.
  const ratioVSummary = stats?.summary.ratio_v;
  const summaryPills: DataPillItem[] =
    ratioVSummary && ratioVSummary.n
      ? [
          {
            key: 'p50',
            label: t('panel.zone.summary.p50_label'),
            value: formatSummaryValue(ratioVSummary.p50),
            title: t('panel.zone.summary.p50_title'),
          },
          {
            key: 'mean',
            label: t('panel.zone.summary.mean_label'),
            value: formatSummaryValue(ratioVSummary.mean),
            title: t('panel.zone.summary.mean_title'),
          },
        ]
      : [];

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
      {/* Zone sub-header: the cohort picker alone. The dropdown selects the
          municipal zone type (`cz_local`) that the statistics below are
          computed over (RES /zone_stats is keyed on fso + cz_local) and is
          labelled as exactly that. Since @aireon/shared v1.177.0 the parcel's
          zone as the user reads it (`parcelData.zone`, the Parcel tab pill) IS
          the municipal designation, so on open the picker already shows the
          parcel's zone text; a separate "Zone" line above it (added in 0.29.0
          when the zone was the federal category and differed from the cohort)
          would print the same words twice and is gone. The municipality lives
          in the panel header's subtitle and the parcel count is printed inside
          the dropdown itself, so neither is repeated here. */}
      {(stats || activeCzLocal) && (
        <div className="shrink-0 px-5 pt-2.5 pb-2.5">
          <ZoneSelectorDropdown
            currentCzLocal={activeCzLocal ?? ''}
            otherZones={dropdownZones}
            onChange={handleZoneChange}
            isLoading={loading}
          />
          {/* The cohort's centre of gravity, in the picker's own block and
              directly beneath it — the two belong together: change the zone
              above and these two numbers change with it. Heading-less on
              purpose (an eyebrow would only repeat what the pills already
              say) and rendered one size up from the standard pill through
              `.room-zone-pills` in index.css, because they are the headline
              figures of the whole tab, not an attribute list. */}
          <DataPillGroup
            className="room-zone-pills mt-2"
            items={summaryPills}
            dark={darkMode}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4 space-y-4">
        {loading && !stats && (
          <LoadingFeedback
            label="Loading zone statistics…"
            skeleton={<ChartsSkeleton darkMode={darkMode} />}
          />
        )}

        {error && !loading && <PanelError title={t('panel.zone.error_title')} detail={error} />}

        {stats && (
          <>
            <PercentileGauge percentile={percentile} darkMode={darkMode} />
            <BoxplotDensity
              title={t('panel.zone.boxplot_title')}
              distribution={stats.distributions.ratio_v ?? []}
              summary={stats.summary.ratio_v ?? emptySummary()}
              selectedValue={selectedValues.ratio_v ?? null}
              darkMode={darkMode}
            />
            {/* ONE column, always. The histograms used to pair up two-per-row
                from the `md` breakpoint on, which in a 460px rail meant each
                chart got ~210px of width: twenty bins and an axis squeezed
                into a strip too narrow to read a shape off. Every
                distribution now spans the full panel width, like the boxplot
                above it. */}
            <div className="grid grid-cols-1 gap-3">
              {METRICS.map((m) => (
                <DistributionHistogram
                  key={m.key}
                  title={t(m.titleKey)}
                  distribution={stats.distributions[m.key] ?? []}
                  selectedValue={selectedValues[m.key] ?? null}
                  unit={m.unit}
                  darkMode={darkMode}
                />
              ))}
            </div>
            <UtilizationOverTime ageCohorts={stats.age_cohorts} darkMode={darkMode} />
            {/* Formerly the "Area vs. volume" inner tab — now just the last
                chart in the same scroll. */}
            <VolumeVsAreaScatter
              parcels={stats.parcels}
              selectedEgrid={parcelData?.egrid ?? null}
              darkMode={darkMode}
            />
          </>
        )}

        {/* Primary-actions row — the LAST section of the scroll flow per the
            suite data-card standard. The negative margins bleed the slot's
            border-t across the scroller's padding (the slot re-applies its
            own inner padding); space-y-4 supplies the top gap. */}
        {actionsSlot && <div className="-mx-5 -mb-4 mt-4">{actionsSlot}</div>}
      </div>
    </div>
  );
};

const ChartsSkeleton = ({ darkMode = true }: { darkMode?: boolean }) => (
  <div className="space-y-4">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className={`rounded-lg px-4 py-3.5 ${
          darkMode ? 'bg-white/[0.035] ring-1 ring-white/6' : 'bg-slate-50 ring-1 ring-slate-200/80'
        } space-y-2`}
      >
        <Skeleton dark={darkMode} width={120} height={10} radius={4} delay={`${i * 70}ms`} />
        <Skeleton dark={darkMode} height={150} radius={6} delay={`${i * 70}ms`} className="w-full" />
      </div>
    ))}
  </div>
);

/** Same scale rule the charts use: 2 decimals under 100, none above. */
function formatSummaryValue(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
}

function emptySummary(): ZoneSummary {
  return {
    min: 0,
    max: 0,
    p5: 0,
    p25: 0,
    p50: 0,
    p75: 0,
    p95: 0,
    mean: 0,
    n: 0,
  };
}

export default ZonePanel;

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@aireon/shared';
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

type Tab = 'distributions' | 'scatter';

/**
 * Scrollable host that composes every zone-distribution chart room ships
 * (gauge, boxplot+density, six histograms, time-cohort line) plus the
 * area-vs-volume scatter in a separate tab. It owns the zone-stats fetch
 * lifecycle and the dropdown that switches zones without re-fetching the
 * parcel itself — the map's feature-state repaints off the new payload.
 */
const ZonePanel = ({ parcelData, onZoneStatsLoaded, onZoneStatsCleared, darkMode = true }: ZonePanelProps) => {
  const { locale, t } = useI18n();
  const [activeCzLocal, setActiveCzLocal] = useState<string | null>(null);
  const [stats, setStats] = useState<ZoneStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('distributions');

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

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/40 space-y-2.5">
        {stats?.zone.municipality_name && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {stats.zone.municipality_name} · {t('panel.zone.parcels_suffix', { count: stats.zone.parcel_count })}
          </p>
        )}
        {(stats || activeCzLocal) && (
          <ZoneSelectorDropdown
            currentCzLocal={activeCzLocal ?? ''}
            otherZones={dropdownZones}
            onChange={handleZoneChange}
            isLoading={loading}
          />
        )}
        {stats && (
          <div className="flex items-center gap-1 rounded-md bg-gray-100/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800/60 p-0.5">
            {(['distributions', 'scatter'] as Tab[]).map((tabId) => (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                className={`flex-1 px-3 py-1 text-[11px] font-medium rounded transition-colors ${
                  tab === tabId
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tabId === 'distributions' ? t('panel.zone.tab.distributions') : t('panel.zone.tab.scatter')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && !stats && <ChartsSkeleton darkMode={darkMode} />}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-500 dark:text-red-400">
                  {t('panel.zone.error_title')}
                </p>
                <p className="text-[11px] text-red-500/70 dark:text-red-400/60 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {stats && tab === 'distributions' && (
          <>
            <PercentileGauge percentile={percentile} darkMode={darkMode} />
            <BoxplotDensity
              title={t('panel.zone.boxplot_title')}
              distribution={stats.distributions.ratio_v ?? []}
              summary={stats.summary.ratio_v ?? emptySummary()}
              selectedValue={selectedValues.ratio_v ?? null}
              darkMode={darkMode}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </>
        )}

        {stats && tab === 'scatter' && (
          <VolumeVsAreaScatter
            parcels={stats.parcels}
            selectedEgrid={parcelData?.egrid ?? null}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
};

const ChartsSkeleton = ({ darkMode = true }: { darkMode?: boolean }) => (
  <div className="space-y-3">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/40 rounded-lg p-3 space-y-2"
      >
        <Skeleton dark={darkMode} width={120} height={10} radius={4} delay={`${i * 70}ms`} />
        <Skeleton dark={darkMode} height={150} radius={6} delay={`${i * 70}ms`} className="w-full" />
      </div>
    ))}
  </div>
);

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

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@swissnovo/shared';
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
   * uses this to paint percentile feature-state on the parcel-fill layer so
   * the choropleth lights up.
   */
  onZoneStatsLoaded: (
    parcels: ZoneStatsResponse['parcels'],
    percentileByEgrid: Map<string, number>,
  ) => void;
  /** Cleared when the panel closes so MapView can wipe the feature-state. */
  onZoneStatsCleared: () => void;
}

interface MetricSpec {
  key: ZoneMetric;
  title: string;
  unit?: string;
}

const METRICS: MetricSpec[] = [
  { key: 'ratio_v', title: 'ratioV (volume use)' },
  { key: 'free_v', title: 'freeV (headroom)', unit: 'm³' },
  { key: 'ratio_s', title: 'ratioS (site coverage)' },
  { key: 'gfz', title: 'GFZ (floor area)' },
  { key: 'bldg_height_m', title: 'Building height', unit: 'm' },
  { key: 'bldg_floors_n', title: 'Number of floors' },
];

type Tab = 'distributions' | 'scatter';

/**
 * Scrollable host that composes every zone-distribution chart room ships
 * (gauge, boxplot+density, six histograms, time-cohort line) plus the
 * area-vs-volume scatter in a separate tab. It owns the zone-stats fetch
 * lifecycle and the dropdown that switches zones without re-fetching the
 * parcel itself — the map's feature-state repaints off the new payload.
 */
const ZonePanel = ({ parcelData, onZoneStatsLoaded, onZoneStatsCleared }: ZonePanelProps) => {
  const { locale } = useI18n();
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
      paintFeatureState(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchZoneStats({ fso, cz_local: cz, lang: locale })
      .then((res) => {
        if (cancelled) return;
        setStats(res);
        paintFeatureState(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStats(null);
        setError(err instanceof Error ? err.message : 'Failed to load zone stats.');
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

  /**
   * Once stats land, walk parcels[] and compute every parcel's `ratio_v`
   * percentile against the zone distribution — that drives the choropleth.
   * We approximate each parcel's ratio_v as (volume / area / mean(zone v/a))
   * weighting so the colour ramp lines up with the boxplot the user sees.
   *
   * Because the parcels[] payload only exposes area/volume/year (not the
   * full set of ratios), we use the distributions.ratio_v ordering as the
   * percentile basis and map by area-rank when ratio_v is unavailable per
   * parcel. The selected parcel always uses the authoritative `parcelData.ratio_v`.
   */
  function paintFeatureState(s: ZoneStatsResponse) {
    const dist = s.distributions.ratio_v ?? [];
    const byEgrid = new Map<string, number>();

    // Each parcel's volume/area is a stand-in for ratio_v when we don't
    // have the per-parcel utilisation reference; rank within the zone's
    // volume distribution as a proxy. The selected parcel's authoritative
    // percentile overrides whatever the proxy says.
    const volumes = s.parcels.map((p) => p.volume).filter((v) => Number.isFinite(v));
    for (const p of s.parcels) {
      if (!p.egrid) continue;
      const proxy = Number.isFinite(p.volume)
        ? percentileOfValue(volumes, p.volume)
        : 0;
      byEgrid.set(p.egrid, proxy);
    }
    if (parcelData?.egrid && parcelData.ratio_v != null) {
      byEgrid.set(parcelData.egrid, percentileOfValue(dist, parcelData.ratio_v));
    }

    onZoneStatsLoaded(s.parcels, byEgrid);
  }

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
      <div className="px-4 py-2.5 border-b border-gray-800/40 space-y-2.5">
        {stats?.zone.municipality_name && (
          <p className="text-[11px] text-gray-500">
            {stats.zone.municipality_name} · {stats.zone.parcel_count} parcels
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
          <div className="flex items-center gap-1 rounded-md bg-gray-900/80 border border-gray-800/60 p-0.5">
            {(['distributions', 'scatter'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-1 text-[11px] font-medium rounded transition-colors ${
                  tab === t
                    ? 'bg-gray-800 text-gray-100'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'distributions' ? 'Distributions' : 'Area vs. volume'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && !stats && <ChartsSkeleton />}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-400">
                  Could not load zone statistics
                </p>
                <p className="text-[11px] text-red-400/60 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {stats && tab === 'distributions' && (
          <>
            <PercentileGauge percentile={percentile} />
            <BoxplotDensity
              title="ratioV — zone distribution"
              distribution={stats.distributions.ratio_v ?? []}
              summary={stats.summary.ratio_v ?? emptySummary()}
              selectedValue={selectedValues.ratio_v ?? null}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {METRICS.map((m) => (
                <DistributionHistogram
                  key={m.key}
                  title={m.title}
                  distribution={stats.distributions[m.key] ?? []}
                  selectedValue={selectedValues[m.key] ?? null}
                  unit={m.unit}
                />
              ))}
            </div>
            <UtilizationOverTime ageCohorts={stats.age_cohorts} />
          </>
        )}

        {stats && tab === 'scatter' && (
          <VolumeVsAreaScatter
            parcels={stats.parcels}
            selectedEgrid={parcelData?.egrid ?? null}
          />
        )}
      </div>
    </div>
  );
};

const ChartsSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-gray-900/60 border border-gray-800/40 rounded-lg p-3 space-y-2"
      >
        <Skeleton dark width={120} height={10} radius={4} delay={`${i * 70}ms`} />
        <Skeleton dark height={150} radius={6} delay={`${i * 70}ms`} className="w-full" />
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

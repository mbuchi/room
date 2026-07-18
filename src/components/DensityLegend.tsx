import { useMemo } from 'react';
import { useGlass } from '@aireon/shared';
import { useI18n } from '../contexts/I18nContext';
import { DENSITY_RAMP, type ActiveZone } from '../lib/mapLayers';

interface DensityLegendProps {
  /** Active zone — supplies the ratio_v percentile breakpoints for the scale. */
  zone: ActiveZone;
  /** The selected parcel's own ratio_v (%), for the "you are here" marker. */
  selectedRatioV: number | null;
  /** Right-edge offset (px) so the legend stays clear of the info pane on md+. */
  rightOffsetPx?: number | null;
  /**
   * When true, renders as an inline block (no absolute positioning, no
   * hidden/block visibility gate) — used inside MapLegendChip on mobile.
   */
  inline?: boolean;
}

const ABSOLUTE_STOPS = [0, 50, 100, 150, 220];

/**
 * Map legend that decodes the density choropleth and answers the headline
 * question — "how densely is this zone built, and where does my parcel sit?".
 *
 * The colour ramp is keyed to the zone's own ratio_v percentile breakpoints
 * (p5…p95) when /zone_stats has landed, so the ends read as the real spread
 * of utilisation in *this* zone. A "You" marker drops onto the bar at the
 * selected parcel's utilisation, and a 100% reference tick marks "fully built
 * to the zone allowance" whenever it falls inside the visible range.
 */
const DensityLegend = ({ zone, selectedRatioV, rightOffsetPx = null, inline = false }: DensityLegendProps) => {
  const { t } = useI18n();
  const { level: glassLevel } = useGlass();
  const glassOn = glassLevel > 0;

  const stops = useMemo(() => {
    const bp = zone.breakpoints;
    return bp && bp.length === 5 && bp.every((n) => Number.isFinite(n)) ? bp : ABSOLUTE_STOPS;
  }, [zone.breakpoints]);

  const lo = stops[0];
  const hi = stops[stops.length - 1];
  const span = hi - lo || 1;
  const posOf = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  const youPos = selectedRatioV != null ? posOf(selectedRatioV) : null;
  const youOver = selectedRatioV != null && selectedRatioV > hi;
  const showAllowance = 100 >= lo && 100 <= hi;

  const gradient = `linear-gradient(to right, ${DENSITY_RAMP.join(', ')})`;
  const fmtPct = (n: number) => `${Math.round(n)}%`;

  return (
    <div
      className={`${inline ? 'w-full' : 'absolute bottom-8 left-4 z-20 hidden md:block w-[268px]'} rounded-xl ${glassOn ? 'glass-control' : 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border border-gray-200 dark:border-gray-800/70 shadow-2xl'} p-3 transition-[right] duration-300`}
      style={!inline && rightOffsetPx != null ? { right: `${rightOffsetPx}px`, left: 'auto' } : undefined}
      data-tour="density-legend"
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
          {t('legend.title')}
        </p>
        <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('legend.metric')}</p>
      </div>

      {/* Gradient bar + markers */}
      <div className="relative mt-1.5 mb-1">
        <div className="h-2.5 w-full rounded-full" style={{ background: gradient }} />

        {/* 100% allowance reference */}
        {showAllowance && (
          <div
            className="absolute -top-0.5 h-3.5 w-px bg-gray-700/70 dark:bg-white/70"
            style={{ left: `${posOf(100)}%` }}
            title={t('legend.allowance_tooltip')}
          />
        )}

        {/* You-are-here marker */}
        {youPos != null && (
          <div
            className="absolute -bottom-[3px] -translate-x-1/2"
            style={{ left: `${youPos}%` }}
          >
            <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-sky-400" />
          </div>
        )}
      </div>

      {/* Scale endpoints */}
      <div className="flex items-center justify-between text-[9px] text-gray-400 dark:text-gray-500 tabular-nums">
        <span>{fmtPct(lo)}</span>
        <span className="text-gray-500 dark:text-gray-400">{t('legend.median')} {fmtPct(stops[2])}</span>
        <span>{fmtPct(hi)}{youOver ? '+' : ''}</span>
      </div>

      {/* You-are-here reading */}
      {selectedRatioV != null && (
        <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400 mr-1 align-middle" />
          {t('legend.you', { value: fmtPct(selectedRatioV) })}
        </p>
      )}
      <p className="mt-1 text-[9px] text-gray-500 dark:text-gray-400 leading-snug">
        {showAllowance && (
          <span className="inline-block h-2 w-px bg-gray-700/70 dark:bg-white/70 mr-1 align-middle" />
        )}
        {t('legend.allowance_hint')}
      </p>
    </div>
  );
};

export default DensityLegend;

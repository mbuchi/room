import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { useI18n } from '../../contexts/I18nContext';

interface DistributionHistogramProps {
  title: string;
  distribution: number[];
  /** Selected parcel's value within this metric, or null if N/A. */
  selectedValue: number | null;
  unit?: string;
  /** Bin count — 20 is the spec default; expose for fine-tuning later. */
  bins?: number;
  darkMode?: boolean;
}

interface HistogramBin {
  /** Bin midpoint, used as the X axis category. */
  x: number;
  /** Inclusive left edge. */
  x0: number;
  /** Exclusive right edge (or inclusive for the final bin). */
  x1: number;
  count: number;
}

function buildHistogram(values: number[], binCount: number): HistogramBin[] {
  const valid = values.filter((n) => Number.isFinite(n));
  if (!valid.length) return [];

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) {
    return [{ x: min, x0: min, x1: min + 1, count: valid.length }];
  }

  const step = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const x0 = min + i * step;
    const x1 = i === binCount - 1 ? max : x0 + step;
    return { x0, x1, x: (x0 + x1) / 2, count: 0 };
  });

  for (const v of valid) {
    let idx = Math.floor((v - min) / step);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return bins;
}

// 180 before the axis band was trimmed to AXIS_HEIGHT: the plot area is
// unchanged, the 16px that recharts spent on empty axis padding is not.
const CHART_HEIGHT = 164;
/** Tick line + 10px label, with nothing to spare (recharts defaults to 30). */
const AXIS_HEIGHT = 20;
/** Slack inside the SVG so an edge tick label / marker is never clipped. */
const EDGE_MARGIN = 10;

/**
 * Compact histogram (~20 bins) with the selected parcel's value drawn as a
 * red ReferenceLine labelled "You". Empty/insufficient distributions render
 * a placeholder so the 6-cell grid in ZonePanel never collapses.
 */
const DistributionHistogram = ({
  title,
  distribution,
  selectedValue,
  unit,
  bins = 20,
  darkMode = true,
}: DistributionHistogramProps) => {
  const { t } = useI18n();
  const data = useMemo(() => buildHistogram(distribution, bins), [distribution, bins]);
  // Neutral structural chrome only; the bar grey + red ReferenceLine encode data.
  const axisStroke = darkMode ? '#4b5563' : '#cbd5e1';
  const tickFill = darkMode ? '#9ca3af' : '#6b7280';
  const gridStroke = darkMode ? '#374151' : '#e5e7eb';
  const tooltipStyle = darkMode
    ? { background: '#0b1220', border: '1px solid #374151', color: '#e5e7eb' }
    : { background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' };

  if (!data.length) {
    return (
      <div
        className={`rounded-lg px-4 py-3.5 ${
          darkMode ? 'bg-white/[0.035] ring-1 ring-white/6' : 'bg-slate-50 ring-1 ring-slate-200/80'
        }`}
      >
        <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          {title}
        </h4>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('panel.zone.no_data')}</p>
      </div>
    );
  }

  const xDomain = domainFor(data, selectedValue);

  return (
    <div
      className={`rounded-lg px-4 py-3.5 ${
        darkMode ? 'bg-white/[0.035] ring-1 ring-white/6' : 'bg-slate-50 ring-1 ring-slate-200/80'
      }`}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h4>
        {selectedValue != null && Number.isFinite(selectedValue) && (
          <span className="text-[11px] font-mono text-red-500 dark:text-red-400">
            {t('panel.zone.chart_you_prefix', { value: format(selectedValue, unit) })}
          </span>
        )}
      </div>
      {/* `-mx-2` bleeds the plot 8px into the card's own padding on each
          side: the chart gets the width back that the margins below spend on
          keeping the edge tick labels and the "You" marker inside the SVG,
          instead of paying for both. */}
      <div className="-mx-2" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 14, right: EDGE_MARGIN, bottom: 0, left: EDGE_MARGIN }}>
            <XAxis
              dataKey="x"
              type="number"
              // NOT ['dataMin', 'dataMax']: `dataKey` is the bin MIDPOINT, so
              // that domain puts the first and last bar centres on the plot
              // edges and clips half of each one away — and a "You" marker
              // outside the sampled range lands outside the SVG entirely
              // (`ifOverflow="extendDomain"` does not extend an explicit
              // domain). Running from the outer bin EDGES, widened to cover
              // the marker and padded by 2%, every bar and every marker is
              // drawn in full.
              domain={xDomain}
              tickFormatter={(v: number) => formatTick(v)}
              // Recharts' default axis height is 30px for a 10px tick font,
              // which leaves ~10px of dead band under the labels — six charts
              // deep in one scroll, that is a chart's worth of empty pixels.
              // AXIS_HEIGHT is the measured minimum that still clears the
              // tick line and the descenders.
              height={AXIS_HEIGHT}
              stroke={axisStroke}
              tick={{ fontSize: 10, fill: tickFill }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                ...tooltipStyle,
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(value: number) => [
                t(value === 1 ? 'panel.zone.tooltip_count_one' : 'panel.zone.tooltip_count_other', { count: value }),
                t('panel.zone.tooltip_count_label'),
              ]}
              labelFormatter={(v: number) => format(v, unit)}
            />
            <Bar dataKey="count" fill="#9ca3af" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            {selectedValue != null && Number.isFinite(selectedValue) && (
              <ReferenceLine
                x={selectedValue}
                stroke="#ef4444"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: t('panel.zone.chart_you'),
                  position: 'top',
                  fill: '#f87171',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/**
 * Bin EDGE to bin EDGE (not midpoint to midpoint), widened to include the
 * selected parcel's value and padded 2% each side so nothing sits on the
 * plot boundary.
 */
function domainFor(bins: HistogramBin[], selectedValue: number | null): [number, number] {
  if (!bins.length) return [0, 1];
  let lo = bins[0].x0;
  let hi = bins[bins.length - 1].x1;
  if (selectedValue != null && Number.isFinite(selectedValue)) {
    lo = Math.min(lo, selectedValue);
    hi = Math.max(hi, selectedValue);
  }
  const pad = (hi - lo || 1) * 0.02;
  return [lo - pad, hi + pad];
}

function formatTick(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
}

function format(v: number, unit?: string): string {
  const f = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
  return unit ? `${f} ${unit}` : f;
}

export default DistributionHistogram;

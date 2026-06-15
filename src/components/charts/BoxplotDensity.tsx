import { useMemo } from 'react';
import {
  Area,
  ComposedChart,
  Customized,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import type { ZoneSummary } from '../../services/zoneStatsService';
import { useI18n } from '../../contexts/I18nContext';

interface BoxplotDensityProps {
  title: string;
  /** Raw values for the metric — outliers already trimmed server-side. */
  distribution: number[];
  /** Min/max/p* summary so we can render the boxplot whiskers honestly. */
  summary: ZoneSummary;
  /** Selected parcel's value, or null when not applicable. */
  selectedValue: number | null;
  unit?: string;
  darkMode?: boolean;
}

// Small Gaussian kernel density estimator, inlined so we don't pull in a
// stats dependency just for one chart. Bandwidth uses Silverman's rule of
// thumb (1.06 * σ * n^-1/5) which is the textbook default for normalish data
// and behaves gracefully on the slightly skewed utilisation distributions
// room plots.
function gaussianKDE(values: number[], gridSize = 80): { x: number; y: number }[] {
  if (values.length < 2) return [];
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  const sigma = Math.sqrt(variance);
  if (sigma === 0) return [];

  const bandwidth = 1.06 * sigma * Math.pow(n, -1 / 5);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the grid by ±2σ so the curve has somewhere to taper into.
  const lo = min - 0.5 * bandwidth;
  const hi = max + 0.5 * bandwidth;
  const step = (hi - lo) / (gridSize - 1);

  const out: { x: number; y: number }[] = [];
  const denom = n * bandwidth * Math.sqrt(2 * Math.PI);
  for (let i = 0; i < gridSize; i++) {
    const x = lo + step * i;
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const z = (x - values[j]) / bandwidth;
      sum += Math.exp(-0.5 * z * z);
    }
    out.push({ x, y: sum / denom });
  }
  return out;
}

const CHART_HEIGHT = 220;
const BOX_TOP = 12;
const BOX_HEIGHT = 18;

/**
 * Boxplot + density curve in one panel. Density area sits underneath, with
 * a 5-number-summary boxplot drawn as a Recharts `Customized` layer so it
 * shares the X scale and stays in sync on resize. The selected parcel's
 * value is a vertical red ReferenceLine — visible against both layers.
 */
const BoxplotDensity = ({
  title,
  distribution,
  summary,
  selectedValue,
  unit,
  darkMode = true,
}: BoxplotDensityProps) => {
  const { t } = useI18n();
  const kde = useMemo(() => gaussianKDE(distribution), [distribution]);
  // Neutral structural chrome only; the red density area encodes the data.
  const axisStroke = darkMode ? '#4b5563' : '#cbd5e1';
  const tickFill = darkMode ? '#9ca3af' : '#6b7280';
  const gridStroke = darkMode ? '#374151' : '#e5e7eb';
  const tooltipStyle = darkMode
    ? { background: '#0b1220', border: '1px solid #374151', color: '#e5e7eb' }
    : { background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' };

  const hasData = distribution.length >= 2 && kde.length > 0;

  if (!hasData) {
    return (
      <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/60 rounded-lg p-3">
        <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
          {title}
        </h4>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('panel.zone.not_enough_data')}</p>
      </div>
    );
  }

  const xDomain: [number, number] = [kde[0].x, kde[kde.length - 1].x];

  return (
    <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/60 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h4>
        {selectedValue != null && (
          <span className="text-[11px] font-mono text-red-500 dark:text-red-400">
            {t('panel.zone.chart_you_prefix', { value: formatValue(selectedValue, unit) })}
          </span>
        )}
      </div>
      <div style={{ width: '100%', height: CHART_HEIGHT }}>
        <ResponsiveContainer>
          <ComposedChart
            data={kde}
            margin={{ top: BOX_TOP + BOX_HEIGHT + 6, right: 10, bottom: 6, left: 0 }}
          >
            <defs>
              <linearGradient id={`kde-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="x"
              type="number"
              domain={xDomain}
              tickFormatter={(v: number) => formatTick(v, unit)}
              stroke={axisStroke}
              tick={{ fontSize: 10, fill: tickFill }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              contentStyle={{
                ...tooltipStyle,
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(value: number) => value.toFixed(4)}
              labelFormatter={(v: number) => formatValue(v, unit)}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill={`url(#kde-${title})`}
              isAnimationActive={false}
            />
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
            {/* Boxplot overlay — uses the chart's X scale via a SVG layer
                positioned over the top margin. */}
            <Customized
              component={(props: unknown) => (
                <Boxplot
                  xAxisMap={(props as { xAxisMap?: Record<string, XAxisLike> }).xAxisMap}
                  summary={summary}
                  darkMode={darkMode}
                />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
        {t('panel.zone.summary_line', {
          n: summary.n,
          p50: formatValue(summary.p50, unit),
          mean: formatValue(summary.mean, unit),
        })}
      </p>
    </div>
  );
};

interface XAxisLike {
  scale: (v: number) => number;
}

interface CustomizedProps {
  xAxisMap?: Record<string, XAxisLike>;
  summary: ZoneSummary;
  darkMode?: boolean;
}

// Recharts' Customized renders its child with a bag of internal props; we
// pull the x-axis scale function out so the box geometry shares the chart's
// coordinate system. The cast is unavoidable — Recharts doesn't ship a
// public type for `xAxisMap`.
const Boxplot = ({ xAxisMap, summary, darkMode = true }: CustomizedProps) => {
  const firstAxisKey = xAxisMap ? Object.keys(xAxisMap)[0] : undefined;
  const xScale =
    firstAxisKey && xAxisMap
      ? (xAxisMap[firstAxisKey] as XAxisLike).scale
      : null;
  if (!xScale) return null;

  // Structural box/whisker neutrals adapt to the theme.
  const whisker = darkMode ? '#6b7280' : '#6b7280';
  const boxStroke = darkMode ? '#9ca3af' : '#6b7280';
  const boxFill = darkMode ? 'rgba(156, 163, 175, 0.18)' : 'rgba(100, 116, 139, 0.14)';
  const median = darkMode ? '#f3f4f6' : '#111827';

  const px = (v: number) => xScale(v);
  const y = BOX_TOP;
  const h = BOX_HEIGHT;
  const cy = y + h / 2;

  return (
    <g>
      {/* whiskers: min -> p5 dashed, p5 -> p25 solid (and mirror on the right) */}
      <line
        x1={px(summary.min)}
        x2={px(summary.p5)}
        y1={cy}
        y2={cy}
        stroke={whisker}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <line
        x1={px(summary.p5)}
        x2={px(summary.p25)}
        y1={cy}
        y2={cy}
        stroke={boxStroke}
        strokeWidth={1}
      />
      <line
        x1={px(summary.p75)}
        x2={px(summary.p95)}
        y1={cy}
        y2={cy}
        stroke={boxStroke}
        strokeWidth={1}
      />
      <line
        x1={px(summary.p95)}
        x2={px(summary.max)}
        y1={cy}
        y2={cy}
        stroke={whisker}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      {/* IQR box */}
      <rect
        x={px(summary.p25)}
        y={y}
        width={Math.max(1, px(summary.p75) - px(summary.p25))}
        height={h}
        fill={boxFill}
        stroke={boxStroke}
        strokeWidth={1}
        rx={2}
      />
      {/* median */}
      <line
        x1={px(summary.p50)}
        x2={px(summary.p50)}
        y1={y}
        y2={y + h}
        stroke={median}
        strokeWidth={1.5}
      />
      {/* whisker caps */}
      {[summary.min, summary.max].map((v, i) => (
        <line
          key={i}
          x1={px(v)}
          x2={px(v)}
          y1={cy - 4}
          y2={cy + 4}
          stroke={whisker}
          strokeWidth={1}
        />
      ))}
    </g>
  );
};

function formatTick(v: number, unit?: string): string {
  const f = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
  return unit ? `${f}` : f;
}

function formatValue(v: number, unit?: string): string {
  const f = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
  return unit ? `${f} ${unit}` : f;
}

export default BoxplotDensity;

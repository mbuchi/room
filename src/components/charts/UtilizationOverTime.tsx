import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ZoneStatsResponse } from '../../services/zoneStatsService';
import { useI18n } from '../../contexts/I18nContext';
import {
  cohortTickYears,
  orderAgeCohorts,
  sampleSizeDotRadius,
} from './orderAgeCohorts';

interface UtilizationOverTimeProps {
  ageCohorts: ZoneStatsResponse['age_cohorts'];
  darkMode?: boolean;
}

const CHART_HEIGHT = 200;

/**
 * Up to seven points: how mean `ratio_v` evolves as the age window narrows.
 * The ladder reads ALL (every year on record) → 60 → 40 → 20 → 15 → 10 → 5
 * left to right, so moving right means more recent construction and a
 * densifying zone draws as a rising line.
 *
 * Two things follow from how thin the narrow windows are (measured across 200
 * zones: ~1,600 parcels in the all-years cohort, ~59 at 20 years, ~9 at 5
 * years, and only about half the zones carry a 5-year cohort at all):
 *
 *   1. Degradation is PER POINT. A cohort with no parcels arrives with
 *      `mean_ratio_v: null`, becomes a gap the line bridges (`connectNulls`),
 *      and the empty state appears only when NO cohort has a finite mean.
 *      Blanking the whole chart on one missing step would blank it for most
 *      zones.
 *   2. Sample size is drawn, not just told: the dot radius steps down with
 *      `n`, so a 5-year mean over two parcels does not carry the same visual
 *      weight as one over eight hundred. `n` stays in the tooltip too.
 */
const UtilizationOverTime = ({ ageCohorts, darkMode = true }: UtilizationOverTimeProps) => {
  const { t } = useI18n();
  // Neutral structural chrome only; the line/dot reds encode the data.
  const axisStroke = darkMode ? '#4b5563' : '#cbd5e1';
  const tickFill = darkMode ? '#9ca3af' : '#6b7280';
  const gridStroke = darkMode ? '#374151' : '#e5e7eb';
  const tooltipStyle = darkMode
    ? { background: '#0b1220', border: '1px solid #374151', color: '#e5e7eb' }
    : { background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' };
  const data = orderAgeCohorts(ageCohorts).map((c) => ({
    // Tick labels come from the cohort KEY: the API's `cohort_label` is an
    // untranslated English sentence ("Last 20 years") and seven of them cannot
    // fit across the panel. The bare number is locale-neutral; the unit is
    // stated once in the subtitle.
    label: cohortTickYears(c.cohort) ?? t('panel.zone.cohort_all'),
    // Normalise every non-finite mean to `null` — recharts gaps `null`, but
    // renders `undefined`/`NaN` as a broken segment.
    ratio_v: Number.isFinite(c.mean_ratio_v) ? (c.mean_ratio_v as number) : null,
    n: c.n ?? 0,
  }));

  // Empty state only when the zone has NO usable cohort at all.
  const hasAnyData = data.some((d) => d.ratio_v !== null);

  return (
    <div
      className={`rounded-lg px-4 py-3.5 ${
        darkMode ? 'bg-white/[0.035] ring-1 ring-white/[0.06]' : 'bg-slate-50 ring-1 ring-slate-200/80'
      }`}
    >
      <div className="mb-2">
        <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('panel.zone.over_time_title')}
        </h4>
        {/* Carries the unit, so a "60" tick is unambiguous without widening it. */}
        <p className="text-[10px] leading-tight text-gray-400 dark:text-gray-500 mt-0.5">
          {t('panel.zone.over_time_subtitle')}
        </p>
      </div>
      {!hasAnyData ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('panel.zone.over_time_no_data')}</p>
      ) : (
        <div style={{ width: '100%', height: CHART_HEIGHT }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 12, bottom: 6, left: 6 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={{ stroke: gridStroke }}
                tickLine={{ stroke: gridStroke }}
                // Seven short ticks fit; without this recharts drops every
                // other one and the ladder reads as four uneven steps.
                interval={0}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={{ stroke: gridStroke }}
                tickLine={{ stroke: gridStroke }}
                tickFormatter={(v: number) => v.toFixed(2)}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  ...tooltipStyle,
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(value, _name, item) => {
                  const payload = item && typeof item === 'object' && 'payload' in item
                    ? (item as { payload?: { n?: number } }).payload
                    : undefined;
                  const n = payload?.n ?? 0;
                  const v = typeof value === 'number' ? value : Number(value);
                  // A gapped window still has a hoverable slot; say it is empty
                  // rather than formatting `null` into a confident 0.000.
                  if (value === null || value === undefined || !Number.isFinite(v)) {
                    return [t('panel.zone.cohort_tooltip_no_data'), t('panel.zone.cohort_label')];
                  }
                  return [
                    t('panel.zone.cohort_tooltip', { value: v.toFixed(3), n }),
                    t('panel.zone.cohort_label'),
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="ratio_v"
                stroke="#ef4444"
                strokeWidth={2}
                dot={renderSampleSizeDot}
                activeDot={{ r: 6 }}
                // Bridge the windows RES had no parcels for instead of ending
                // the line at the first gap.
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/**
 * Dot whose radius encodes the cohort's `n`. Same red as the line — the
 * chrome stays neutral and no new colour is introduced; only the size varies.
 */
const renderSampleSizeDot = (props: unknown) => {
  const { cx, cy, key, payload } = (props ?? {}) as {
    cx?: number;
    cy?: number;
    key?: string;
    payload?: { n?: number };
  };
  // A gapped cohort has no coordinates; recharts still asks for its dot.
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g key={key} />;
  return (
    <circle
      key={key}
      cx={cx}
      cy={cy}
      r={sampleSizeDotRadius(payload?.n ?? 0)}
      fill="#ef4444"
      stroke="#7f1d1d"
      strokeWidth={1}
    />
  );
};

export default UtilizationOverTime;

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
import { orderAgeCohorts } from './orderAgeCohorts';

interface UtilizationOverTimeProps {
  ageCohorts: ZoneStatsResponse['age_cohorts'];
  darkMode?: boolean;
}

const CHART_HEIGHT = 200;

/**
 * Four-point line: how mean `ratio_v` evolves across age cohorts. The cohorts
 * read ALL (current snapshot) → last20 → last40 → last60 left to right — the
 * all-encompassing "now" baseline first, then the age windows in ascending
 * order. (The raw cohort labels render as ALL / 20 / 40 / 60.)
 * Reads at a glance whether the zone is densifying or losing utilisation.
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
    label: c.cohort_label,
    ratio_v: c.mean_ratio_v,
    n: c.n,
  }));

  const allFinite = data.every((d) => Number.isFinite(d.ratio_v));

  return (
    <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/60 rounded-lg p-3">
      <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
        {t('panel.zone.over_time_title')}
      </h4>
      {!allFinite ? (
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
                  const v = typeof value === 'number' ? value : Number(value);
                  const payload = item && typeof item === 'object' && 'payload' in item
                    ? (item as { payload?: { n?: number } }).payload
                    : undefined;
                  const n = payload?.n ?? 0;
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
                dot={{ r: 4, fill: '#ef4444', stroke: '#7f1d1d', strokeWidth: 1 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default UtilizationOverTime;

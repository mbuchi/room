import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  ZoneAgeCohort,
  ZoneStatsResponse,
} from '../../services/zoneStatsService';
import { useI18n } from '../../contexts/I18nContext';

interface UtilizationOverTimeProps {
  ageCohorts: ZoneStatsResponse['age_cohorts'];
}

const CHART_HEIGHT = 200;

type AgeCohorts = ZoneStatsResponse['age_cohorts'];
type CohortKey = keyof AgeCohorts;

/**
 * The canonical left-to-right order for the line: the all-encompassing "now"
 * (ALL) snapshot first as the baseline, then the age windows in ascending
 * order (20 → 40 → 60). The defect this replaces built the array in the raw
 * object/insertion order, which surfaced as 60 / 40 / 20 / ALL and scrambled
 * the trend.
 */
const COHORT_ORDER: CohortKey[] = ['now', 'last20', 'last40', 'last60'];

/**
 * Return the age cohorts as an ordered array (ALL, then 20 / 40 / 60).
 * Pure and side-effect free so the ordering can be unit-tested directly.
 */
export function orderAgeCohorts(
  ageCohorts: AgeCohorts,
): Array<ZoneAgeCohort & { cohort: CohortKey }> {
  return COHORT_ORDER.map((cohort) => ({ ...ageCohorts[cohort], cohort }));
}

/**
 * Four-point line: how mean `ratio_v` evolves across age cohorts. The cohorts
 * read ALL (current snapshot) → last20 → last40 → last60 left to right — the
 * all-encompassing "now" baseline first, then the age windows in ascending
 * order. (The raw cohort labels render as ALL / 20 / 40 / 60.)
 * Reads at a glance whether the zone is densifying or losing utilisation.
 */
const UtilizationOverTime = ({ ageCohorts }: UtilizationOverTimeProps) => {
  const { t } = useI18n();
  const data = orderAgeCohorts(ageCohorts).map((c) => ({
    label: c.cohort_label,
    ratio_v: c.mean_ratio_v,
    n: c.n,
  }));

  const allFinite = data.every((d) => Number.isFinite(d.ratio_v));

  return (
    <div className="bg-gray-900/60 border border-gray-800/60 rounded-lg p-3">
      <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {t('panel.zone.over_time_title')}
      </h4>
      {!allFinite ? (
        <p className="text-xs text-gray-500">{t('panel.zone.over_time_no_data')}</p>
      ) : (
        <div style={{ width: '100%', height: CHART_HEIGHT }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 12, bottom: 6, left: 6 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#4b5563"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
              />
              <YAxis
                stroke="#4b5563"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                tickFormatter={(v: number) => v.toFixed(2)}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: '#0b1220',
                  border: '1px solid #374151',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#e5e7eb',
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

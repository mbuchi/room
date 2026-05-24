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

interface UtilizationOverTimeProps {
  ageCohorts: ZoneStatsResponse['age_cohorts'];
}

const CHART_HEIGHT = 200;

/**
 * Four-point line: how mean `ratio_v` evolves across age cohorts
 * (now → last20 → last40 → last60). Reads at a glance whether the zone
 * is densifying (rising line) or losing utilisation (falling).
 */
const UtilizationOverTime = ({ ageCohorts }: UtilizationOverTimeProps) => {
  const data = [
    { ...ageCohorts.last60, cohort: 'last60' },
    { ...ageCohorts.last40, cohort: 'last40' },
    { ...ageCohorts.last20, cohort: 'last20' },
    { ...ageCohorts.now, cohort: 'now' },
  ].map((c) => ({
    label: c.cohort_label,
    ratio_v: c.mean_ratio_v,
    n: c.n,
  }));

  const allFinite = data.every((d) => Number.isFinite(d.ratio_v));

  return (
    <div className="bg-gray-900/60 border border-gray-800/60 rounded-lg p-3">
      <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Utilisation over time
      </h4>
      {!allFinite ? (
        <p className="text-xs text-gray-500">Not enough cohort data for this zone.</p>
      ) : (
        <div style={{ width: '100%', height: CHART_HEIGHT }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 12, bottom: 6, left: 0 }}>
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
                width={36}
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
                  return [`mean ratioV ${v.toFixed(3)} (n=${n})`, 'Cohort'];
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

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ZoneParcel } from '../../services/zoneStatsService';
import { linearRegression } from '../../services/statsMath';

interface VolumeVsAreaScatterProps {
  parcels: ZoneParcel[];
  /** EGRID of the user-selected parcel — gets the red highlighted dot. */
  selectedEgrid: string | null;
}

const CHART_HEIGHT = 240;

/**
 * Scatter of parcel area (x) vs. built volume (y) across the whole zone,
 * with an OLS regression line so the user can see how the zone's volume
 * scales with parcel size. The selected parcel is drawn as a larger red dot
 * on top — instant visual placement against the cloud.
 */
const VolumeVsAreaScatter = ({ parcels, selectedEgrid }: VolumeVsAreaScatterProps) => {
  const { points, selected, line } = useMemo(() => {
    const pts = parcels
      .filter((p) => Number.isFinite(p.area) && Number.isFinite(p.volume))
      .map((p) => ({
        x: p.area,
        y: p.volume,
        egrid: p.egrid,
      }));

    const sel = selectedEgrid
      ? pts.find((p) => p.egrid === selectedEgrid) ?? null
      : null;

    let lineSeries: { x: number; y: number }[] = [];
    if (pts.length >= 2) {
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const { slope, intercept } = linearRegression(xs, ys);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      lineSeries = [
        { x: xMin, y: slope * xMin + intercept },
        { x: xMax, y: slope * xMax + intercept },
      ];
    }

    return { points: pts, selected: sel, line: lineSeries };
  }, [parcels, selectedEgrid]);

  if (!points.length) {
    return (
      <div className="bg-gray-900/60 border border-gray-800/60 rounded-lg p-3">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Parcel area vs. built volume
        </h4>
        <p className="text-xs text-gray-500">No parcels available for this zone.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800/60 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Parcel area vs. built volume
        </h4>
        <span className="text-[10px] text-gray-500 font-mono">{points.length} parcels</span>
      </div>
      <div style={{ width: '100%', height: CHART_HEIGHT }}>
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 8, right: 14, bottom: 22, left: 8 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="2 4" />
            <XAxis
              dataKey="x"
              type="number"
              name="Area"
              unit=" m²"
              stroke="#4b5563"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
              label={{
                value: 'Parcel area (m²)',
                position: 'insideBottom',
                offset: -10,
                fill: '#6b7280',
                fontSize: 10,
              }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name="Volume"
              unit=" m³"
              stroke="#4b5563"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
              width={56}
            />
            <ZAxis range={[18, 18]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#374151' }}
              contentStyle={{
                background: '#0b1220',
                border: '1px solid #374151',
                borderRadius: 6,
                fontSize: 11,
                color: '#e5e7eb',
              }}
              formatter={(value: number) =>
                Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
              }
            />
            <Scatter
              data={points}
              fill="#9ca3af"
              fillOpacity={0.55}
              isAnimationActive={false}
            />
            {line.length === 2 && (
              <Line
                data={line}
                dataKey="y"
                type="linear"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                legendType="none"
              />
            )}
            {selected && (
              <Scatter
                data={[selected]}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth={1.5}
                shape="circle"
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {selected && (
        <p className="mt-1 text-[10px] text-gray-500 font-mono">
          You: {selected.x.toFixed(0)} m² / {selected.y.toFixed(0)} m³
        </p>
      )}
    </div>
  );
};

export default VolumeVsAreaScatter;

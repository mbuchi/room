import { useMemo } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { humanPercentileReading } from '../../services/statsMath';

interface PercentileGaugeProps {
  /** 0..100 — where this parcel sits in the zone distribution. */
  percentile: number;
  darkMode?: boolean;
}

const W = 260;
const H = 150;
const CX = W / 2;
const CY = H - 10;
const R = 100;

/**
 * Half-circle gauge (0–180°) with a needle at the parcel's percentile. The
 * arc is gradient-shaded from light yellow at the floor to deep red at the
 * ceiling — visually consistent with the choropleth on the map so the user
 * can read "dark = densely utilised" as one idea, both in the panel and on
 * the map. Underneath, a single sentence narrates the rank.
 */
const PercentileGauge = ({ percentile, darkMode = true }: PercentileGaugeProps) => {
  const { locale, t } = useI18n();
  const clamped = Math.max(0, Math.min(100, percentile));

  // Neutral structural chrome adapts to the theme; the gradient arc (a
  // data-encoding scale) does NOT.
  const onSurface = darkMode ? '#f3f4f6' : '#111827';
  const tickLine = darkMode ? '#4b5563' : '#cbd5e1';
  const tickLabel = darkMode ? '#6b7280' : '#6b7280';
  const subLabel = darkMode ? '#9ca3af' : '#6b7280';

  // We build the arc by sampling along the angle so the gradient feels
  // continuous; recharts has no native arc gauge.
  const { arcSegments, needle } = useMemo(() => {
    const segments: { d: string; stroke: string }[] = [];
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const a0 = Math.PI * (1 - t0);
      const a1 = Math.PI * (1 - t1);
      const x0 = CX + R * Math.cos(a0);
      const y0 = CY - R * Math.sin(a0);
      const x1 = CX + R * Math.cos(a1);
      const y1 = CY - R * Math.sin(a1);
      segments.push({
        d: `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`,
        stroke: rampColor((t0 + t1) / 2),
      });
    }

    const needleAngle = Math.PI * (1 - clamped / 100);
    const nx = CX + (R - 6) * Math.cos(needleAngle);
    const ny = CY - (R - 6) * Math.sin(needleAngle);

    return { arcSegments: segments, needle: { x: nx, y: ny } };
  }, [clamped]);

  return (
    <div className="bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/60 rounded-lg p-3">
      <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
        {t('panel.zone.percentile_title')}
      </h4>
      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t('panel.zone.gauge_aria')}>
          {arcSegments.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={s.stroke}
              strokeWidth={14}
              strokeLinecap="butt"
            />
          ))}
          {/* tick marks at 0/25/50/75/100 */}
          {[0, 25, 50, 75, 100].map((p) => {
            const a = Math.PI * (1 - p / 100);
            const tx1 = CX + (R - 22) * Math.cos(a);
            const ty1 = CY - (R - 22) * Math.sin(a);
            const tx2 = CX + (R - 14) * Math.cos(a);
            const ty2 = CY - (R - 14) * Math.sin(a);
            const lx = CX + (R - 34) * Math.cos(a);
            const ly = CY - (R - 34) * Math.sin(a);
            return (
              <g key={p}>
                <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke={tickLine} strokeWidth={1} />
                <text x={lx} y={ly + 3} fontSize={9} fill={tickLabel} textAnchor="middle">
                  {p}
                </text>
              </g>
            );
          })}
          {/* needle */}
          <line
            x1={CX}
            y1={CY}
            x2={needle.x}
            y2={needle.y}
            stroke={onSurface}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={5} fill={onSurface} />
          <text
            x={CX}
            y={CY - R / 2}
            textAnchor="middle"
            fill={onSurface}
            fontSize={24}
            fontWeight={600}
          >
            {Math.round(clamped)}
          </text>
          <text x={CX} y={CY - R / 2 + 16} textAnchor="middle" fill={subLabel} fontSize={10}>
            {t('panel.zone.percentile_label')}
          </text>
        </svg>
        <p className="mt-2 text-[12px] text-gray-600 dark:text-gray-300 text-center leading-snug px-1">
          {humanPercentileReading(clamped, locale)}
        </p>
      </div>
    </div>
  );
};

/**
 * Pick a colour along a light-yellow → deep-red ramp, matching the
 * choropleth on the map so the gauge reads as the same scale.
 */
function rampColor(t: number): string {
  // simple linear interpolation in RGB between the two stops
  const stops: Array<[number, [number, number, number]]> = [
    [0, [0xfe, 0xf3, 0xc7]], // #FEF3C7
    [0.5, [0xf8, 0x7a, 0x4a]], // mid orange-red
    [1, [0x7f, 0x1d, 0x1d]], // #7F1D1D
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (t - lo[0]) / span;
  const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * k);
  const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * k);
  const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

export default PercentileGauge;

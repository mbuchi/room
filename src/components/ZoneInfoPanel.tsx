import { AlertCircle, MapPin, Building2, Calendar, Layers } from 'lucide-react';
import { Skeleton } from '@swissnovo/shared';
import type { ParcelData } from '../services/parcelDataService';
import { useI18n } from '../contexts/I18nContext';

interface ZoneInfoPanelProps {
  parcelData: ParcelData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Parcel-facts header for room. Replaces groove's GWR-shaped `InfoPanel`.
 * Renders a compact summary of the selected parcel — address, municipality,
 * zoning codes, area, built volume, construction year — plus the two
 * utilisation-balance fields (`ratio_v` and `free_v`) that immediately tell
 * the user "this parcel is over- / under- / fully built relative to its
 * allowed zoning utilisation".
 *
 * While `parcelDataService` is in flight we render a Skeleton stand-in so
 * the panel slot doesn't collapse and the layout stays stable.
 */
const ZoneInfoPanel = ({
  parcelData,
  isLoading,
  error,
}: ZoneInfoPanelProps) => {
  const { t } = useI18n();
  return (
    <div className="flex-1 min-h-0 flex flex-col w-full">
      {(parcelData?.address || isLoading) && (
        <div className="px-4 py-2.5 border-b border-gray-800/40">
          {parcelData?.address ? (
            <p className="text-xs text-gray-400 truncate">{parcelData.address}</p>
          ) : (
            <Skeleton dark width={180} height={10} radius={4} />
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && <ZoneInfoSkeleton />}

        {!isLoading && error && (
          <div className="m-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-400">
                  {t('panel.info.failed_to_load')}
                </p>
                <p className="text-[11px] text-red-400/60 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && parcelData && (
          <div className="p-4 space-y-4">
            <Section icon={<MapPin size={12} className="text-red-400/80" />} title="Location">
              <Row label="Municipality" value={parcelData.municipality_name} />
              <Row label="FSO" value={parcelData.fso} mono />
              {parcelData.egrid && <Row label="EGRID" value={parcelData.egrid} mono />}
            </Section>

            <Section icon={<Layers size={12} className="text-amber-400/80" />} title="Zoning">
              <Row label="CZ Local" value={parcelData.cz_local} mono />
              <Row label="CZ Canton" value={parcelData.cz_canton} mono />
              <Row
                label="Allowed util."
                value={parcelData.cz_util_now != null ? `${fmt(parcelData.cz_util_now)} m³` : null}
              />
            </Section>

            <Section icon={<Building2 size={12} className="text-teal-400/80" />} title="Built">
              <Row
                label="Parcel area"
                value={parcelData.parcel_area != null ? `${fmt(parcelData.parcel_area)} m²` : null}
              />
              <Row
                label="Built volume"
                value={parcelData.built_volume != null ? `${fmt(parcelData.built_volume)} m³` : null}
              />
              <Row label="GFZ" value={parcelData.gfz != null ? parcelData.gfz.toFixed(2) : null} />
              <Row
                label="Height"
                value={parcelData.bldg_height_m != null ? `${parcelData.bldg_height_m.toFixed(1)} m` : null}
              />
              <Row
                label="Floors"
                value={parcelData.bldg_floors_n != null ? String(parcelData.bldg_floors_n) : null}
              />
            </Section>

            <Section icon={<Calendar size={12} className="text-sky-400/80" />} title="Age">
              <Row
                label="Year built"
                value={parcelData.bldg_constr_year != null ? String(parcelData.bldg_constr_year) : null}
              />
            </Section>

            {/* The two ratio fields are the headline — give them a prominent
                bar each so the user can read "this parcel is X% utilised /
                Y m³ headroom" without parsing a table. */}
            <RatioCard
              label="ratioV (volume utilisation)"
              ratio={parcelData.ratio_v}
              hint={
                parcelData.ratio_v == null
                  ? 'No reference allowed-utilisation for this zone.'
                  : undefined
              }
            />
            <FreeVolumeCard freeV={parcelData.free_v} />
            <RatioCard
              label="ratioS (site coverage)"
              ratio={parcelData.ratio_s}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ZoneInfoSkeleton = () => (
  <div className="p-4 space-y-4">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-gray-900/60 border border-gray-800/40 rounded-lg p-3 space-y-2"
      >
        <Skeleton dark width={80} height={10} radius={4} delay={`${i * 60}ms`} />
        {[0, 1, 2].map((j) => (
          <div key={j} className="flex items-baseline justify-between gap-3">
            <Skeleton dark width={70} height={10} radius={4} delay={`${i * 60}ms`} />
            <Skeleton dark width={60} height={10} radius={4} delay={`${i * 60}ms`} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </span>
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Row = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span
        className={`text-[11px] text-gray-200 text-right truncate ${
          mono ? 'font-mono' : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
};

/**
 * A horizontal fill-bar for the headline ratio fields — caps at 100% for
 * the bar geometry but always shows the raw number underneath, so an
 * over-built parcel (ratio > 1) still reads honestly.
 */
const RatioCard = ({
  label,
  ratio,
  hint,
}: {
  label: string;
  ratio: number | null;
  hint?: string;
}) => {
  if (ratio == null) {
    return (
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-1.5 text-xs text-gray-500">{hint ?? 'No data for this parcel.'}</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, ratio * 100));
  const over = ratio > 1;

  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            over ? 'text-red-400' : 'text-gray-200'
          }`}
        >
          {ratio.toFixed(2)}
          {over && ' ↑'}
        </p>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const FreeVolumeCard = ({ freeV }: { freeV: number | null }) => {
  if (freeV == null) {
    return (
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          freeV (headroom)
        </p>
        <p className="mt-1.5 text-xs text-gray-500">No data for this parcel.</p>
      </div>
    );
  }
  const positive = freeV >= 0;
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          freeV (headroom)
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            positive ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {positive ? '+' : ''}
          {fmt(freeV)} m³
        </p>
      </div>
      <p className="mt-1 text-[10px] text-gray-500">
        {positive ? 'Allowed volume remaining.' : 'Built volume exceeds allowance.'}
      </p>
    </div>
  );
};

function fmt(n: number): string {
  return Math.abs(n) >= 1000 ? n.toLocaleString('en-CH', { maximumFractionDigits: 0 }) : n.toFixed(1);
}

export default ZoneInfoPanel;

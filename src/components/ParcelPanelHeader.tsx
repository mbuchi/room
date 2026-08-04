import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { Skeleton, ParcelAerialThumbnail, ParcelIdentityHeader } from '@aireon/shared';
import { useI18n } from '../contexts/I18nContext';
import type { ParcelData } from '../services/parcelDataService';
import type { FocusedParcelHandle } from './ZoneInfoPanel';

interface ParcelPanelHeaderProps {
  parcelData: ParcelData | null;
  isLoading: boolean;
  /** The clicked parcel — supplies the aerial thumbnail and the lng/lat chip. */
  focusedParcel: FocusedParcelHandle | null;
  darkMode?: boolean;
  /** Icon actions for the header's own top row (raw-JSON, Track, close). */
  actions?: ReactNode;
}

/**
 * The one identity block for room's right-hand parcel pane.
 *
 * It used to live INSIDE the parcel-facts tab, so every other tab either
 * repeated a header of its own (the zone tab printed "municipality · N
 * parcels") or showed no address at all. Now it is hoisted to the panel shell
 * and rendered once above the tab strip, which means:
 *   - every tab keeps the "which parcel am I reading?" context,
 *   - the tab strip gets a full-width row of its own instead of sharing one
 *     with the close/raw-JSON buttons, and
 *   - the address, the municipality and the two copyable identifiers (EGRID,
 *     Lat/Lng) read as a single block rather than two stacked ones.
 *
 * The block is laid out on TWO rows (panel-actions standard R4): a slim
 * right-aligned row carrying only the action icons, then the identity block
 * (address, municipality, aerial thumbnail) at full width, then the chips.
 *
 * The chip row keeps the suite data-card header standard verbatim (R2: a
 * content-sized `flex flex-wrap` row, never a rigid grid, so a 6-decimal
 * coordinate always renders on ONE line at every panel width; R4: the
 * identifier tier's px-2.5/py-1.5 + text-[10px]/font-mono text-[11px] scale).
 * Those numbers are load-bearing for the one-line guarantee — do not shrink
 * them to buy space.
 */
const ParcelPanelHeader = ({
  parcelData,
  isLoading,
  focusedParcel,
  darkMode = true,
  actions,
}: ParcelPanelHeaderProps) => {
  const { t } = useI18n();

  const lng = focusedParcel?.lng ?? null;
  const lat = focusedParcel?.lat ?? null;

  // While RES is still resolving the address we fall back to the click-derived
  // coordinates so the title is never empty (and never a lone skeleton once
  // something real is available).
  const headerAddress = parcelData?.address
    ? parcelData.address
    : !isLoading && focusedParcel
      ? formatLngLat(focusedParcel.lng, focusedParcel.lat)
      : null;
  const headerEgrid =
    parcelData?.egrid ?? parcelData?.parcel_id ?? focusedParcel?.parcelId ?? null;
  const showThumb =
    !!focusedParcel &&
    Number.isFinite(focusedParcel.lng) &&
    Number.isFinite(focusedParcel.lat);

  return (
    <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800/40">
      {/* Row 1 - the action cluster and nothing else, right-aligned
          (panel-actions standard R4, shared v1.124.0). These icons used to be
          passed into `ParcelIdentityHeader` as children, which dropped them
          into the shared `.aireon-pih-actions` slot BESIDE the title: an
          invisible deviation at the call site, since MapView just hands over an
          `actions` fragment. On the narrow right-hand pane that cost the
          address most of its width. On its own row the cluster costs the title
          nothing, and both the loaded and the loading state now render it in
          the same place so the header does not jump when RES resolves. */}
      {actions && <div className="flex items-center justify-end gap-1">{actions}</div>}
      {isLoading && !parcelData?.address ? (
        <div className="mt-1 flex items-start gap-3">
          <Skeleton dark={darkMode} width={180} height={10} radius={4} />
        </div>
      ) : (
        <>
          {/* Row 2 - the identity block at full width. `.aireon-pih` is itself
              `flex items-start gap-3`, so the only thing this adds is the row
              gap; the aerial thumbnail stays in the shared trailing slot. */}
          <ParcelIdentityHeader
            className="mt-1"
            address={headerAddress}
            subtitle={parcelData?.municipality_name ?? null}
            dark={darkMode}
            labels={{ fallbackTitle: t('panel.info.header_fallback') }}
          >
            {showThumb && (
              <ParcelAerialThumbnail
                lng={focusedParcel!.lng}
                lat={focusedParcel!.lat}
                areaM2={Number(parcelData?.parcel_area) || null}
                dark={darkMode}
                labels={{
                  imageAlt: t('panel.info.satellite_alt'),
                  expand: t('panel.info.satellite_expand'),
                  dialogAria: t('panel.info.satellite_aria'),
                  close: t('panel.info.close'),
                }}
              />
            )}
          </ParcelIdentityHeader>

          {(headerEgrid || (lng != null && lat != null)) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {headerEgrid && (
                <IdentifierChip
                  label="EGRID"
                  value={headerEgrid}
                  copyLabel={t('panel.info.egrid_copy')}
                  copiedLabel={t('panel.info.egrid_copied')}
                />
              )}
              {lng != null && lat != null && (
                <IdentifierChip
                  label={t('panel.info.latlng_label')}
                  value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
                  copyLabel={t('panel.info.latlng_copy')}
                  copiedLabel={t('panel.info.egrid_copied')}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * One copyable identifier chip — label eyebrow, monospace value, and a
 * click-to-copy button (suite data-card standard chip markup, R2/R4). The chip
 * never shrinks below its own content (`min-w-[min(fit-content,100%)]`, capped
 * so a pathological id ellipsizes instead of forcing horizontal overflow) and
 * `flex-1 basis-0` shares the slack when both chips fit one line — a lone chip
 * therefore fills the row by itself.
 */
export const IdentifierChip = ({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = () => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        /* clipboard blocked — no-op */
      });
  };

  return (
    <div className="flex min-w-[min(fit-content,100%)] max-w-full flex-1 basis-0 items-center gap-2 rounded-md px-2.5 py-1.5 bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-black/25 dark:text-slate-300 dark:ring-0">
      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] font-semibold leading-tight">
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? copiedLabel : copyLabel}
        aria-label={copied ? copiedLabel : copyLabel}
        className={`relative inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${
          copied
            ? 'text-emerald-600 dark:text-emerald-300'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-200'
        }`}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {/* A focused button changing its own accessible name is not re-announced,
            so the confirmation goes through a dedicated live region. */}
        <span className="sr-only" role="status" aria-live="polite">
          {copied ? copiedLabel : ''}
        </span>
      </button>
    </div>
  );
};

/** Fallback header label when RES hasn't returned an address yet. */
function formatLngLat(lng: number, lat: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default ParcelPanelHeader;

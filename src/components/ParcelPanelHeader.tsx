import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, MapPin } from 'lucide-react';
import { CloseButton, PANEL_TOUCH_TARGET, ParcelAerialThumbnail, Skeleton } from '@aireon/shared';
import { useI18n } from '../contexts/I18nContext';
import type { ParcelData } from '../services/parcelDataService';
import type { FocusedParcelHandle } from './ZoneInfoPanel';

interface ParcelPanelHeaderProps {
  parcelData: ParcelData | null;
  isLoading: boolean;
  /** The clicked parcel — supplies the aerial thumbnail and the lng/lat chip. */
  focusedParcel: FocusedParcelHandle | null;
  darkMode?: boolean;
  /** App-specific icon actions shown below the address. */
  actions?: ReactNode;
  onClose: () => void;
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
 * The block follows the roofs composition: satellite and address form the
 * identity row, close sits beside the heading, app actions sit below the
 * subtitle, and the two identifier chips finish the fixed header.
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
  onClose,
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
    <div className="flex-shrink-0 border-b border-gray-200 px-5 pb-4 pt-3.5 dark:border-gray-800/40">
      {isLoading && !parcelData?.address ? (
        <div className="flex items-start gap-3">
          <Skeleton dark={darkMode} width={88} height={88} radius={12} />
          <div className="min-w-0 flex-1 space-y-3 pt-1">
            <Skeleton dark={darkMode} width={180} height={14} radius={4} />
            <Skeleton dark={darkMode} width={120} height={10} radius={4} />
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          <CloseButton onClick={onClose} label={t('panel.info.close')} className={PANEL_TOUCH_TARGET} />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
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
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start gap-2">
                <h2
                  className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-slate-950 dark:text-white"
                  title={headerAddress || t('panel.info.header_fallback')}
                >
                  {headerAddress || t('panel.info.header_fallback')}
                </h2>
                <CloseButton onClick={onClose} label={t('panel.info.close')} className={PANEL_TOUCH_TARGET} />
              </div>
              {parcelData?.municipality_name && (
                <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                  <MapPin className="h-[11px] w-[11px] shrink-0" aria-hidden="true" />
                  <span className="truncate">{parcelData.municipality_name}</span>
                </p>
              )}
              {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
            </div>
          </div>

          {(headerEgrid || (lng != null && lat != null)) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
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

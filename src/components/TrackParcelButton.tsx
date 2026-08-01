import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import {
  createPrmRecord,
  deletePrmRecord,
  fetchPrmByParcel,
  PANEL_TOUCH_TARGET,
  PrmAuthRequiredError as AuthRequiredError,
  type PrmRecord,
} from '@aireon/shared';
import type { ParcelData } from '../services/parcelDataService';
import type { FocusedParcelHandle } from './ZoneInfoPanel';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../auth/AuthContext';
import { signal } from '../lib/signal';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaving' | 'error';

interface TrackParcelButtonProps {
  /** The currently-focused parcel; the track target. */
  focusedParcel: FocusedParcelHandle | null;
  /** Parcel facts (for label / area / municipality on the saved record). */
  parcelData: ParcelData | null;
}

/**
 * Suite-standard "Track parcel" toggle: an icon-only Bookmark button on the
 * panel action bar beside the raw-JSON toggle and Close (geopool reference).
 * Replaces the full-width SaveToPrmBar that used to be pinned under the panel.
 * Self-contained: owns its save lifecycle and the "is this already tracked?"
 * probe, mirroring the suite-wide PRM toggle pattern. Signed-out clicks open
 * the suite sign-in modal, so the entry point survives without the old bar's
 * sign-in CTA. Visible chip stays 32x32; PANEL_TOUCH_TARGET carries the 44px
 * hit area (data-card header standard R1).
 */
const TrackParcelButton = ({ focusedParcel, parcelData }: TrackParcelButtonProps) => {
  const { t } = useI18n();
  const { accessToken, isAuthenticated, promptLogin } = useAuth();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedRecord, setSavedRecord] = useState<PrmRecord | null>(null);

  const parcelId = focusedParcel?.parcelId;

  // On focus / auth change, ask the PRM backend whether this parcel is already
  // tracked so the toggle opens in the right state.
  useEffect(() => {
    setStatus('idle');
    setSavedRecord(null);
    if (!parcelId || !isAuthenticated || !accessToken) return;
    let cancelled = false;
    fetchPrmByParcel(accessToken, String(parcelId))
      .then((record) => {
        if (cancelled) return;
        if (record) {
          setSavedRecord(record);
          setStatus('saved');
        }
      })
      .catch(() => {
        /* silent — leave idle so the user can still track */
      });
    return () => {
      cancelled = true;
    };
  }, [parcelId, isAuthenticated, accessToken]);

  if (!focusedParcel?.parcelId) return null;

  const handleSave = async () => {
    if (!isAuthenticated || !accessToken) {
      // Open the suite sign-in modal instead of a full-page redirect to Zitadel.
      promptLogin();
      return;
    }
    setStatus('saving');
    try {
      const area =
        parcelData?.parcel_area ??
        (typeof focusedParcel.props?.area_m2 === 'number'
          ? (focusedParcel.props.area_m2 as number)
          : null);
      const municipality =
        parcelData?.municipality_name ||
        (focusedParcel.props?.['cityname'] as string | undefined) ||
        (focusedParcel.props?.['fso_name_2021'] as string | undefined) ||
        '';
      const label = parcelData?.address || formatLngLat(focusedParcel.lng, focusedParcel.lat);
      const record = await createPrmRecord(accessToken, {
        parcel_id: String(focusedParcel.parcelId),
        parcel_label: label,
        parcel_municipality: municipality,
        parcel_area: Number(area ?? 0),
        parcel_lng: Number(focusedParcel.lng ?? 0),
        parcel_lat: Number(focusedParcel.lat ?? 0),
      });
      setSavedRecord(record);
      setStatus('saved');
      signal.send('Save to PRM', {
        address: parcelData?.address || undefined,
        lat: focusedParcel.lat,
        lng: focusedParcel.lng,
        metaData: { parcel_id: focusedParcel.parcelId, area_m2: area ?? null },
      });
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        promptLogin();
        setStatus('idle');
        return;
      }
      console.error('PRM save failed', err);
      setStatus('error');
    }
  };

  const handleRemove = async () => {
    if (!savedRecord) return;
    if (!isAuthenticated || !accessToken) {
      promptLogin();
      return;
    }
    setStatus('unsaving');
    try {
      await deletePrmRecord(accessToken, savedRecord.id);
      setSavedRecord(null);
      setStatus('idle');
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        promptLogin();
        setStatus('saved');
        return;
      }
      console.error('PRM remove failed', err);
      setStatus('error');
    }
  };

  // `savedRecord` survives a failed DELETE, so it, not the status alone, is
  // what "tracked" means after an error: otherwise the chip would flip to the
  // untracked outline while the record still exists on the backend, and the
  // next click would route to handleSave and duplicate it. With the record
  // still in hand the retry goes back through handleRemove.
  const tracked =
    status === 'saved' || status === 'unsaving' || (status === 'error' && savedRecord !== null);
  const busy = status === 'saving' || status === 'unsaving';
  const label = !isAuthenticated
    ? t('prm.signin_required')
    : status === 'saving'
      ? t('prm.saving')
      : status === 'error'
        ? t('prm.save_failed')
        : tracked
          ? t('prm.saved')
          : t('prm.save');

  return (
    <button
      type="button"
      data-tour="track-parcel"
      onClick={tracked ? handleRemove : handleSave}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={tracked}
      className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:cursor-default ${PANEL_TOUCH_TARGET} ${
        status === 'error'
          ? 'text-red-500 hover:text-red-600 hover:bg-red-500/10'
          : tracked
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
      }`}
    >
      {busy ? (
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
          <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
          <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
        </span>
      ) : tracked ? (
        <BookmarkCheck size={16} aria-hidden />
      ) : (
        <Bookmark size={16} aria-hidden />
      )}
    </button>
  );
};

function formatLngLat(lng: number, lat: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default TrackParcelButton;

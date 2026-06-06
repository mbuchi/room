import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, Loader2, LogIn } from 'lucide-react';
import {
  createPrmRecord,
  fetchPrmByParcel,
  PROOM_APP_URL,
  PrmAuthRequiredError as AuthRequiredError,
  type PrmRecord,
} from '@aireon/shared';
import type { ParcelData } from '../services/parcelDataService';
import type { FocusedParcelHandle } from './ZoneInfoPanel';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../auth/AuthContext';
import { signal } from '../lib/signal';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveToPrmBarProps {
  /** The currently-focused parcel; the save target. */
  focusedParcel: FocusedParcelHandle | null;
  /** Parcel facts (for label / area / municipality on the saved record). */
  parcelData: ParcelData | null;
}

/**
 * Prominent, full-width "Save to PRM" call-to-action pinned to the bottom of
 * the right info pane. Visible on BOTH tabs (zone distribution + parcel facts)
 * so saving the parcel is always one tap away — it used to be a small pill
 * hidden in the facts-tab header. Self-contained: owns its save lifecycle and
 * the "is this already saved?" probe, mirroring the suite-wide PRM pattern
 * (valoo/SaveParcelButton, scoore LocationScore).
 */
const SaveToPrmBar = ({ focusedParcel, parcelData }: SaveToPrmBarProps) => {
  const { t } = useI18n();
  const { accessToken, isAuthenticated, promptLogin } = useAuth();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedRecord, setSavedRecord] = useState<PrmRecord | null>(null);

  const parcelId = focusedParcel?.parcelId;

  // On focus / auth change, ask the PRM backend whether this parcel is already
  // saved so the CTA opens in the right state.
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
        /* silent — leave idle so the user can still save */
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

  // ---- Saved: show the confirmation + an Open-in-proom action ----
  if (status === 'saved') {
    return (
      <div
        data-tour="track-parcel"
        className="flex-shrink-0 border-t border-gray-800/60 bg-gray-950/95 px-3 py-3 print:hidden"
      >
        <div className="flex items-stretch gap-2">
          <div className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 text-sm font-semibold">
            <BookmarkCheck className="h-4 w-4" aria-hidden />
            <span>{t('prm.saved')}</span>
          </div>
          {savedRecord && (
            <a
              href={`${PROOM_APP_URL}/?prm=${encodeURIComponent(savedRecord.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('prm.open_in_proom')}
              aria-label={t('prm.open_in_proom')}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl bg-gray-800/70 hover:bg-gray-700/80 text-gray-200 hover:text-white ring-1 ring-gray-700/60 transition-colors text-xs font-medium"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t('prm.open_in_proom')}</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // ---- Idle / saving / error / signed-out ----
  const signedOut = !isAuthenticated;
  const saving = status === 'saving';
  const error = status === 'error';

  const label = saving
    ? t('prm.saving')
    : signedOut
      ? t('prm.signin_required')
      : error
        ? t('prm.save_failed')
        : t('prm.save');

  return (
    <div
      data-tour="track-parcel"
      className="flex-shrink-0 border-t border-gray-800/60 bg-gray-950/95 px-3 py-3 print:hidden"
    >
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        title={label}
        aria-label={label}
        className={`group w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all duration-150 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 active:scale-[0.99] ${
          saving
            ? 'bg-gray-800/60 text-gray-400 ring-1 ring-gray-700/50'
            : error
              ? 'bg-red-600/90 text-white ring-1 ring-red-500/40 hover:bg-red-500'
              : signedOut
                ? 'bg-gray-800/80 text-gray-100 ring-1 ring-gray-600/60 hover:bg-gray-700/80'
                : 'bg-emerald-600 text-white ring-1 ring-emerald-500/40 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
        }`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : signedOut ? (
          <LogIn className="h-4 w-4" aria-hidden />
        ) : (
          <Bookmark className="h-4 w-4 group-hover:scale-110 transition-transform" aria-hidden />
        )}
        <span>{label}</span>
      </button>
      {!signedOut && !error && (
        <p className="mt-1.5 text-center text-[10px] text-gray-500">{t('prm.bar_hint')}</p>
      )}
    </div>
  );
};

function formatLngLat(lng: number, lat: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default SaveToPrmBar;

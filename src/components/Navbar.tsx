import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, HelpCircle, Images, MapPin, X } from 'lucide-react';
import type { ScreenshotMetadata } from '../services/imageService';
import Logo from './Logo';
import LocateButton, { type LocateErrorCode } from './LocateButton';
import SavedImagesPanel from './SavedImagesPanel';
import ScreenshotFeedback from './ScreenshotFeedback';
import UserMenu from './UserMenu';
import {
  AireonHubLink,
  LocaleSelector,
  OpenWithMenu,
  ReleaseNotesPanel,
  getReleaseNotesStrings,
  useReleaseNotes,
  type MapUserMenuAction,
} from '@aireon/shared';
import { RELEASES, REPO_URL } from '../data/releaseNotes';
import { appTourConfig } from '../tour/tour.config';
import { useTour } from '../tour/TourProvider';
import { useScreenshot } from '../hooks/useScreenshot';
import { geocodeAddress, type GeocodeResult } from '../lib/geocode';
import { signal } from '../lib/signal';
import { useI18n } from '../contexts/I18nContext';

interface NavbarProps {
  onLocationSelect: (center: [number, number], placeName: string) => void;
  onLocate: (coords: [number, number]) => void;
  onLocateError: (code: LocateErrorCode) => void;
  getCaptureMetadata?: () => ScreenshotMetadata;
}

const Navbar = ({ onLocationSelect, onLocate, onLocateError, getCaptureMetadata }: NavbarProps) => {
  const { locale, setLocale, t } = useI18n();
  const [showImages, setShowImages] = useState(false);
  // The last address the user picked — powers the "Open with" cross-app menu so
  // they can open the same spot in another suite app.
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { startTour } = useTour();
  const { capture, isCapturing, toast, dismissToast } = useScreenshot(getCaptureMetadata);
  const rn = useReleaseNotes({
    currentVersion: RELEASES[0].version,
    storageKey: 'room:lastSeenReleaseVersion',
  });

  // Variant-2 navbar: secondary tools live in the user-dropdown "More tools"
  // section instead of crowding the bar. Order mirrors the suite reference:
  // export → exports → changes → tour.
  const tourVariant = appTourConfig.variants.long.length > 0 ? 'long' : 'short';
  const toolbarItems: MapUserMenuAction[] = [
    {
      key: 'export',
      label: t('panel.screenshot.save_image'),
      icon: <Camera size={16} aria-hidden="true" />,
      onClick: capture,
      disabled: isCapturing,
      signedOut: true,
    },
    {
      key: 'exports',
      label: t('nav.my_exports'),
      icon: <Images size={16} aria-hidden="true" />,
      onClick: () => setShowImages(true),
      signedOut: true,
    },
    {
      key: 'changes',
      label: getReleaseNotesStrings(locale).whatsNew,
      icon: <CheckCircle size={16} aria-hidden="true" />,
      dot: rn.hasUnread,
      onClick: rn.openPanel,
      signedOut: true,
    },
    {
      key: 'tour',
      label: t('tour.long_label'),
      icon: <HelpCircle size={16} aria-hidden="true" />,
      onClick: () => startTour(tourVariant),
      signedOut: true,
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/60 shadow-lg">
      <div className="h-full px-5 flex items-center gap-3 sm:gap-4">
        <div className="flex items-center flex-shrink-0 gap-3">
          <AireonHubLink withDivider className="text-gray-100" logoClassName="h-[18px] w-auto" />
          <div data-tour="app-title">
            <Logo />
          </div>
        </div>

        <div className="flex-1 min-w-0 max-w-xl" data-tour="address-search">
          <AddressGeoSearch
            onLocationSelect={onLocationSelect}
            onPick={(lat, lng) => setLastLocation({ lat, lng })}
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Open the address you just searched in another suite app. Appears
              once a result is picked — the cross-app half of the geocoder. */}
          {lastLocation && (
            <OpenWithMenu
              location={lastLocation}
              currentAppId="room"
              dark
              label={t('nav.open_with')}
              onOpen={(appId) =>
                void signal.send('Open address in app', {
                  lat: lastLocation.lat,
                  lng: lastLocation.lng,
                  metaData: { app: appId },
                })
              }
            />
          )}
          <div data-tour="map-tools" className="flex items-center gap-2 sm:gap-3">
            <LocateButton onLocate={onLocate} onError={onLocateError} />
          </div>
          <LocaleSelector
            locale={locale}
            onChange={setLocale}
            ariaLabel={t('nav.select_language')}
          />
          <div data-tour="help-button">
            <UserMenu toolbarItems={toolbarItems} toolbarLabel={t('menu.more_tools')} />
          </div>
        </div>
      </div>

      <SavedImagesPanel isOpen={showImages} onClose={() => setShowImages(false)} />
      {rn.isOpen && (
        <ReleaseNotesPanel
          onClose={rn.closePanel}
          locale={locale}
          releases={RELEASES}
          repoUrl={REPO_URL}
          brandPrefix="r"
          brandSuffix="m"
        />
      )}
      <ScreenshotFeedback isCapturing={isCapturing} toast={toast} onDismiss={dismissToast} />
    </nav>
  );
};

export default Navbar;

// ---------------------------------------------------------------------------
// Inline address search — Mapbox v6 forward geocoding, CH-scoped, debounced.
// Mirrors the AddressGeoSearch component used across the SwissNovo suite.
// ---------------------------------------------------------------------------

interface AddressGeoSearchProps {
  onLocationSelect: (center: [number, number], placeName: string) => void;
  onPick: (lat: number, lng: number) => void;
}

function AddressGeoSearch({ onLocationSelect, onPick }: AddressGeoSearchProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const matches = await geocodeAddress(query, controller.signal);
      if (controller.signal.aborted) return;
      setResults(matches);
      setShowResults(true);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: GeocodeResult) => {
    setText(result.label);
    setShowResults(false);
    setResults([]);
    onPick(result.lat, result.lng);
    onLocationSelect([result.lng, result.lat], result.label);
    void signal.send('Search for Address', {
      address: result.label,
      lat: result.lat,
      lng: result.lng,
    });
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          autoComplete="off"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={t('nav.search_placeholder')}
          aria-label={t('nav.search_placeholder')}
          className="w-full pl-8 pr-7 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus-visible:outline-none focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/30 transition-colors"
        />
        {text && (
          <button
            onClick={() => { setText(''); setResults([]); setShowResults(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showResults && (loading || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-gray-700/50 rounded-xl shadow-xl z-[9999] overflow-hidden">
          {loading ? (
            <div className="p-3 text-center text-xs text-gray-400">{t('nav.searching')}</div>
          ) : (
            <ul className="max-h-56 overflow-auto">
              {results.map((r) => (
                <li
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className="px-3 py-2 text-xs text-gray-300 hover:bg-red-600/10 hover:text-gray-100 cursor-pointer flex items-center gap-2 border-b border-gray-800 last:border-0"
                >
                  <MapPin size={11} className="text-gray-500 flex-shrink-0" />
                  {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

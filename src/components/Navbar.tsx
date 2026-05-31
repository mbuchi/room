import { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, MapPin, X } from 'lucide-react';
import type { ScreenshotMetadata } from '../services/imageService';
import Logo from './Logo';
import LocateButton, { type LocateErrorCode } from './LocateButton';
import ScreenshotButton from './ScreenshotButton';
import SavedImagesPanel from './SavedImagesPanel';
import UserMenu from './UserMenu';
import { ReleaseNotesButton, LocaleSelector } from '@swissnovo/shared';
import { RELEASES, REPO_URL } from '../data/releaseNotes';
import { TourHelpButton } from '../tour/TourHelpButton';
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/60 shadow-lg">
      <div className="h-full px-5 flex items-center gap-3 sm:gap-4">
        <div className="flex items-center flex-shrink-0 gap-3">
          <div data-tour="app-title">
            <Logo />
          </div>
        </div>

        <div className="flex-1 min-w-0 max-w-xl" data-tour="address-search">
          <AddressGeoSearch onLocationSelect={onLocationSelect} />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div data-tour="map-tools" className="flex items-center gap-2 sm:gap-3">
            <LocateButton onLocate={onLocate} onError={onLocateError} />
            <ScreenshotButton getCaptureMetadata={getCaptureMetadata} />
          </div>
          <button
            onClick={() => setShowImages(true)}
            title={t('nav.my_exports')}
            aria-label={t('nav.my_exports')}
            className="group relative flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800/80 border border-gray-700/50 transition-all duration-200 hover:bg-red-600/20 hover:border-red-500/40 active:scale-90"
          >
            <ImageIcon
              size={17}
              className="text-gray-300 transition-all duration-200 group-hover:text-red-400 group-hover:drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]"
            />
          </button>
          <TourHelpButton className="group relative flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800/80 border border-gray-700/50 transition-all duration-200 hover:bg-red-600/20 hover:border-red-500/40 active:scale-90 text-gray-300 hover:text-red-400" />
          <LocaleSelector
            locale={locale}
            onChange={setLocale}
            ariaLabel={t('nav.select_language')}
          />
          <ReleaseNotesButton
            releases={RELEASES}
            repoUrl={REPO_URL}
            storageKey="room:lastSeenReleaseVersion"
            brandPrefix="r"
            brandSuffix="m"
          />
          <UserMenu />
        </div>
      </div>
      <SavedImagesPanel isOpen={showImages} onClose={() => setShowImages(false)} />
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
}

function AddressGeoSearch({ onLocationSelect }: AddressGeoSearchProps) {
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
          className="w-full pl-8 pr-7 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-colors"
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

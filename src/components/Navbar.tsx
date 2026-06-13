import { useState, useCallback } from 'react';
import { Camera, CheckCircle, HelpCircle, Images } from 'lucide-react';
import type { ScreenshotMetadata } from '../services/imageService';
import { type LocateErrorCode, requestGeolocation } from './LocateButton';
import SavedImagesPanel from './SavedImagesPanel';
import ScreenshotFeedback from './ScreenshotFeedback';
import UserMenu from './UserMenu';
import {
  AppNavbar,
  ReleaseNotesPanel,
  getReleaseNotesStrings,
  useReleaseNotes,
  type MapUserMenuAction,
  type AddressSearchResult,
} from '@aireon/shared';
import { RELEASES, REPO_URL } from '../data/releaseNotes';
import { appTourConfig } from '../tour/tour.config';
import { useTour } from '../tour/TourProvider';
import { useScreenshot } from '../hooks/useScreenshot';
import { geocodeAddress } from '../lib/geocode';
import { signal } from '../lib/signal';
import { useI18n } from '../contexts/I18nContext';

interface NavbarProps {
  onLocationSelect: (center: [number, number], placeName: string) => void;
  onLocate: (coords: [number, number]) => void;
  onLocateError: (code: LocateErrorCode) => void;
  getCaptureMetadata?: () => ScreenshotMetadata;
}

/**
 * room's top bar is the suite-shared {@link AppNavbar} (the canonical pattern):
 * hub badge + wordmark · Mapbox address search · MapToolbar + cross-app
 * "Open with" + account menu. room is dark-only, so Save image / My exports /
 * What's new / Tour live in the account-menu "More tools" section (variant-2
 * navbar) and the toolbar shows only Locate · Settings · Language. The app
 * wires its own handlers, labels, account menu and the side panels (saved
 * images, release notes, capture feedback).
 */
const Navbar = ({ onLocationSelect, onLocate, onLocateError, getCaptureMetadata }: NavbarProps) => {
  const { locale, setLocale, t } = useI18n();
  const [showImages, setShowImages] = useState(false);
  // The last address the user picked — AppNavbar tracks it to render the
  // "Open with" menu; we mirror it here so the cross-app telemetry keeps the
  // lat/lng of the spot being opened.
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Locate-me state lifted into the navbar so the shared MapToolbar can render
  // its MapPin button with the canonical disabled-while-locating behaviour.
  const [isLocating, setIsLocating] = useState(false);
  const handleLocate = useCallback(() => {
    if (isLocating) return;
    requestGeolocation(
      onLocate,
      onLocateError,
      () => setIsLocating(true),
      () => setIsLocating(false),
    );
  }, [isLocating, onLocate, onLocateError]);
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
    <>
      <AppNavbar
        appName="room"
        dark
        position="fixed top-0 left-0 right-0 z-50"
        brandTourId="app-title"
        searchTourId="address-search"
        userMenuTourId="help-button"
        search={{
          locale,
          labels: {
            placeholder: t('nav.search_placeholder'),
            loading: t('nav.searching'),
            noResults: t('nav.search_no_results'),
            clear: t('nav.clear_search'),
            resultsCount: (n) => t('nav.search_results_count', { count: n }),
          },
          // room standardises on the suite Mapbox geocoder (CH-scoped). The
          // shared AddressSearch handles debounce + aborting internally; we just
          // forward the abort signal.
          search: (text, { signal: sig }) => geocodeAddress(text, sig),
          onSelect: (r: AddressSearchResult) => {
            setLastLocation({ lat: r.lat, lng: r.lng });
            onLocationSelect([r.lng, r.lat], r.label);
            void signal.send('Search for Address', {
              address: r.label,
              lat: r.lat,
              lng: r.lng,
            });
          },
        }}
        openWith={{
          currentAppId: 'room',
          label: t('nav.open_with'),
          onOpen: (appId) => {
            if (lastLocation) {
              void signal.send('Open address in app', {
                lat: lastLocation.lat,
                lng: lastLocation.lng,
                metaData: { app: appId },
              });
            }
          },
        }}
        toolbar={{
          locale,
          onLocaleChange: setLocale,
          onLocate: handleLocate,
          isLocating,
          labels: {
            saveImage: t('panel.screenshot.save_image'),
            myImages: t('nav.my_exports'),
            toggleLight: t('panel.basemap.light'),
            toggleDark: t('panel.basemap.dark'),
            locateMe: t('map.locate.button'),
            settings: t('map.settings'),
            settingsComingSoon: t('map.settings_coming_soon'),
            selectLanguage: t('nav.select_language'),
            more: t('menu.more_tools'),
          },
        }}
        userMenu={<UserMenu toolbarItems={toolbarItems} toolbarLabel={t('menu.more_tools')} />}
      />

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
    </>
  );
};

export default Navbar;

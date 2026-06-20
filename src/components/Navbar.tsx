import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { Tag, Footprints, Share2, Sun, Moon, History, Info } from 'lucide-react';
import type { ScreenshotMetadata } from '../services/imageService';
import { type LocateErrorCode, requestGeolocation } from './LocateButton';
import SavedImagesPanel from './SavedImagesPanel';
import ScreenshotFeedback from './ScreenshotFeedback';
import UserMenu from './UserMenu';
import {
  AppNavbar,
  NavIconButton,
  ShareCopiedToast,
  SearchHistoryModal,
  getAuthToken,
  getReleaseNotesStrings,
  getShareStrings,
  getSearchHistoryStrings,
  useReleaseNotes,
  useGlass,
  buildGlassSettingsItem,
  type MapUserMenuAction,
  type AddressSearchResult,
} from '@aireon/shared';
import { CURRENT_VERSION } from '../data/releaseMeta';

// Code-split: the large RELEASES array + the changelog panel load only when the
// user opens What's New, keeping the release-notes blob out of the entry bundle.
const ChangelogPanel = lazy(() => import('./ChangelogPanel'));
import { appTourConfig } from '../tour/tour.config';
import { useTour } from '../tour/TourProvider';
import { useScreenshot } from '../hooks/useScreenshot';
import { signal } from '../lib/signal';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../auth/AuthContext';
import { errorLogger } from '../lib/errorLog';

interface NavbarProps {
  onLocationSelect: (center: [number, number], placeName: string) => void;
  onLocate: (coords: [number, number]) => void;
  onLocateError: (code: LocateErrorCode) => void;
  getCaptureMetadata?: () => ScreenshotMetadata;
  /** Active theme — drives the toolbar's Sun/Moon icon and the account-menu chrome. */
  darkMode: boolean;
  /** Flip the light/dark theme. */
  onToggleTheme: () => void;
  /** Open the About modal (swisstopo/MapLibre credits). */
  onAbout: () => void;
}

/**
 * room's top bar is the suite-shared {@link AppNavbar} (the canonical pattern):
 * hub badge + wordmark · Mapbox address search · MapToolbar + cross-app
 * "Open with" + account menu. The MapToolbar wires Save image (Camera) · My
 * exports (Layers) · Theme (Sun/Moon) · Locate · Settings · Language as direct
 * navbar buttons. The account menu's "More tools" section holds only What's new
 * + Tour. The app wires its own handlers, labels, account menu and the side
 * panels (saved images, release notes, capture feedback).
 */
const Navbar = ({ onLocationSelect, onLocate, onLocateError, getCaptureMetadata, darkMode, onToggleTheme, onAbout }: NavbarProps) => {
  const { locale, setLocale, t } = useI18n();
  const { level: glassLevel, setLevel: setGlassLevel } = useGlass();
  const { email } = useAuth();
  const [showImages, setShowImages] = useState(false);
  // Search history is now a one-tap navbar button (moved out of the account
  // menu's built-in row) — it opens the shared SearchHistoryModal.
  const [showHistory, setShowHistory] = useState(false);
  // The modal's authToken prop is a synchronous string; getAuthToken() is async,
  // so resolve it once into state (re-run on sign-in/out so the list refreshes).
  const [authToken, setAuthToken] = useState<string | null>(null);
  // "Share this view" moved out of the navbar into the account menu; it copies
  // the current link and flashes the suite-standard "Link copied" pill.
  const [shareCopied, setShareCopied] = useState(false);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
    currentVersion: CURRENT_VERSION,
    storageKey: 'room:lastSeenReleaseVersion',
  });

  // Resolve the bearer token for the search-history modal; re-run on sign-in /
  // sign-out (email flips) so the list refreshes immediately.
  useEffect(() => {
    let active = true;
    void getAuthToken().then((token) => {
      if (active) setAuthToken(token);
    });
    return () => {
      active = false;
    };
  }, [email]);

  // Copy the current view's link and flash the "Link copied" pill — the same
  // behaviour as a navbar Share button, now driven from the menu row.
  const handleShare = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setShareCopied(true);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      shareTimerRef.current = setTimeout(() => setShareCopied(false), 1800);
    }).catch(() => { /* clipboard blocked — no-op */ });
    void signal.send('Share view', {});
  }, []);

  // Account-menu "More tools" section. The navbar is being decluttered down to
  // the highest-frequency controls (address search + history button), so the
  // lower-frequency chrome now lives here, roughly ordered by use: the quick
  // actions (Share this view, dark-mode toggle) first, then What's new + Tour.
  // Save image / My exports stay navbar buttons (wired into the toolbar below).
  // All are `signedOut: true` so anonymous visitors keep reaching them.
  const tourVariant = appTourConfig.variants.long.length > 0 ? 'long' : 'short';
  const shareStrings = getShareStrings(locale);
  const toolbarItems: MapUserMenuAction[] = [
    {
      key: 'share',
      label: shareStrings.share,
      icon: <Share2 size={16} aria-hidden="true" />,
      onClick: handleShare,
      signedOut: true,
    },
    {
      key: 'theme',
      label: darkMode ? t('nav.toggle_light') : t('nav.toggle_dark'),
      icon: darkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />,
      onClick: onToggleTheme,
      signedOut: true,
      keepOpenOnClick: true,
    },
    {
      key: 'changes',
      label: getReleaseNotesStrings(locale).whatsNew,
      icon: <Tag size={16} aria-hidden="true" />,
      dot: rn.hasUnread,
      onClick: rn.openPanel,
      signedOut: true,
    },
    {
      key: 'tour',
      label: t('tour.long_label'),
      icon: <Footprints size={16} aria-hidden="true" />,
      onClick: () => startTour(tourVariant),
      signedOut: true,
    },
    {
      key: 'about',
      label: t('about.menu'),
      icon: <Info size={16} aria-hidden="true" />,
      onClick: onAbout,
      signedOut: true,
    },
  ];

  return (
    <>
      <AppNavbar
        appName="room"
        dark={darkMode}
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
          // room uses the shared AddressSearch's built-in geo.admin (swisstopo)
          // geocoder — the suite-standard tokenless Swiss federal address search.
          // No `search` override here = the shared geo.admin default.
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
        actionsExtra={
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search history is a one-tap navbar button — the highest-frequency
                secondary control — opening the shared SearchHistoryModal. It was
                moved out of the account menu's built-in row (suppressed below). */}
            <NavIconButton
              icon={<History size={18} aria-hidden="true" />}
              label={getSearchHistoryStrings(locale).menuRow}
              onClick={() => setShowHistory(true)}
              dark={darkMode}
            />
          </div>
        }
        toolbar={{
          locale,
          onLocaleChange: setLocale,
          onCapture: capture,
          isCapturing,
          onShowImages: () => setShowImages(true),
          // Dark-mode toggle moved into the account menu; the toolbar keeps
          // Save image · My exports · Locate · language · appearance (glass gear).
          onLocate: handleLocate,
          isLocating,
          settingsItems: [
            buildGlassSettingsItem({ level: glassLevel, setLevel: setGlassLevel, locale }),
          ],
          labels: {
            saveImage: t('panel.screenshot.save_image'),
            myImages: t('nav.my_exports'),
            toggleLight: t('nav.toggle_light'),
            toggleDark: t('nav.toggle_dark'),
            locateMe: t('map.locate.button'),
            settings: t('map.settings'),
            settingsComingSoon: t('map.settings_coming_soon'),
            selectLanguage: t('nav.select_language'),
            more: t('menu.more_tools'),
          },
        }}
        userMenu={
          <UserMenu
            darkMode={darkMode}
            toolbarItems={toolbarItems}
            toolbarLabel={t('menu.more_tools')}
            // Search history is a navbar button now, so suppress the menu's
            // built-in "My search history" row to avoid duplicating it.
            showSearchHistory={false}
            bugReport={{ logger: errorLogger, email, metaData: { rollout: 'bug-report-expanded' } }}
          />
        }
      />

      <SavedImagesPanel isOpen={showImages} onClose={() => setShowImages(false)} />
      {rn.isOpen && (
        <Suspense fallback={null}>
          <ChangelogPanel onClose={rn.closePanel} locale={locale} />
        </Suspense>
      )}
      {showHistory && (
        <SearchHistoryModal
          locale={locale}
          dark={darkMode}
          authToken={authToken}
          onClose={() => setShowHistory(false)}
        />
      )}
      <ScreenshotFeedback isCapturing={isCapturing} toast={toast} onDismiss={dismissToast} />
      <ShareCopiedToast show={shareCopied} label={shareStrings.copied} dark={darkMode} />
    </>
  );
};

export default Navbar;

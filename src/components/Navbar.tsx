import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Tag,
  Footprints,
  Share2,
  Sun,
  Moon,
  History,
  Info,
  LocateFixed,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Languages,
} from 'lucide-react';
import type { ScreenshotMetadata } from '../services/imageService';
import { type LocateErrorCode, requestGeolocation } from './LocateButton';
import SavedImagesPanel from './SavedImagesPanel';
import ScreenshotFeedback from './ScreenshotFeedback';
import UserMenu from './UserMenu';
import {
  AppNavbar,
  NavIconButton,
  OpenWithMenu,
  ShareCopiedToast,
  SearchHistoryModal,
  LAUNCH_APPS,
  openInApp,
  getAuthToken,
  getReleaseNotesStrings,
  getShareStrings,
  getSearchHistoryStrings,
  useReleaseNotes,
  useGlass,
  buildGlassMenuItem,
  buildGlassSettingsItem,
  type MapUserMenuAction,
  type AddressSearchResult,
} from '@aireon/shared';
import { CURRENT_VERSION } from '../data/releaseMeta';
import { useCompactLayout } from '../hooks/useCompactLayout';

// Compact (<1024px) account-menu sizing: the one merged menu holds every former
// navbar action, so cap the dropdown to the viewport (minus navbar) and let it
// scroll, and give every row/button the 44px touch floor. Applied as a wrapper
// around UserMenu only at compact widths — desktop keeps the stock dropdown.
const COMPACT_USER_MENU_CLASS_NAME = [
  'contents room-compact-user-menu',
  '[&_.map-shell-user-dropdown]:max-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px)-1rem)]',
  '[&_.map-shell-user-dropdown]:overflow-y-auto',
  '[&_.map-shell-user-button]:min-h-11',
  '[&_.map-shell-user-button]:min-w-11',
  '[&_.map-shell-user-manage]:min-h-11',
  '[&_.map-shell-user-manage]:min-w-11',
  '[&_.map-shell-user-saved-refresh]:min-h-11',
  '[&_.map-shell-user-saved-refresh]:min-w-11',
  '[&_.map-shell-user-saved-action]:min-h-11',
  '[&_.map-shell-user-saved-action]:min-w-11',
  '[&_.map-shell-user-saved-total]:min-h-11',
  '[&_.map-shell-user-saved-state]:min-h-11',
  '[&_.map-shell-user-saved-attention]:min-h-11',
  '[&_.map-shell-user-tool-item]:min-h-11',
  '[&_.map-shell-user-menu-item]:min-h-11',
].join(' ');

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
  /** Currently selected parcel — drives the "Open with" cross-app menu so the
   *  menu is enabled for map-click selections, not just address searches. */
  selectedParcel?: { lng: number; lat: number } | null;
  /** Canonical address of the parcel currently open in the info workspace. */
  activeAddress?: string | null;
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
const Navbar = ({ onLocationSelect, onLocate, onLocateError, getCaptureMetadata, darkMode, onToggleTheme, onAbout, selectedParcel, activeAddress }: NavbarProps) => {
  const { locale, setLocale, t } = useI18n();
  const { level: glassLevel, setLevel: setGlassLevel } = useGlass();
  const { email } = useAuth();
  const isCompact = useCompactLayout();
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
  // Remembered for the "Open with" cross-app menu when no parcel is selected
  // (e.g. after an address search with no map click). The selected parcel's
  // lngLat takes priority when available — it's always the freshest state.
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  // The effective location for "Open with": parcel click > address search.
  const openWithLocation = selectedParcel
    ? { lat: selectedParcel.lat, lng: selectedParcel.lng }
    : lastLocation;
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
      // Locate me / GPS — moved out of the navbar toolbar into the account menu
      // (top of "More tools"). `signedOut` keeps it reachable for anonymous
      // visitors, matching the old always-visible toolbar button.
      key: 'locate',
      label: t('map.locate.button'),
      icon: <LocateFixed size={16} aria-hidden="true" />,
      onClick: handleLocate,
      disabled: isLocating,
      signedOut: true,
    },
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

  // Compact (<1024px): the hamburger toolbar and the Open-with / history / info
  // icon cluster disappear from the bar, so every one of those actions becomes
  // a row in the single account menu instead. Prepended before toolbarItems so
  // the highest-frequency actions (Open with, history, capture) come first.
  const compactOnlyTools: MapUserMenuAction[] = [
    ...(openWithLocation
      ? [
          {
            key: 'open-with',
            label: t('nav.open_with'),
            icon: <ExternalLink size={16} aria-hidden="true" />,
            signedOut: true,
            children: LAUNCH_APPS.filter((app) => app.id !== 'room').map((app) => ({
              key: `open-with-${app.id}`,
              label: app.name,
              onClick: () => {
                openInApp(app.id, openWithLocation.lat, openWithLocation.lng);
                void signal.send('Open address in app', {
                  lat: openWithLocation.lat,
                  lng: openWithLocation.lng,
                  metaData: { app: app.id },
                });
              },
            })),
          } as MapUserMenuAction,
        ]
      : []),
    {
      key: 'history',
      label: getSearchHistoryStrings(locale).menuRow,
      icon: <History size={16} aria-hidden="true" />,
      onClick: () => setShowHistory(true),
      signedOut: true,
    },
    {
      key: 'capture',
      label: t('panel.screenshot.save_image'),
      icon: <Camera size={16} aria-hidden="true" />,
      onClick: () => void capture(),
      disabled: isCapturing,
      signedOut: true,
    },
    {
      key: 'exports',
      label: t('nav.my_exports'),
      icon: <ImageIcon size={16} aria-hidden="true" />,
      onClick: () => setShowImages(true),
      signedOut: true,
    },
    {
      key: 'language',
      label: t('nav.select_language'),
      icon: <Languages size={16} aria-hidden="true" />,
      signedOut: true,
      children: (['en', 'fr', 'de', 'it'] as const).map((language) => ({
        key: `language-${language}`,
        label: language.toUpperCase(),
        badge: locale === language ? '✓' : undefined,
        onClick: () => setLocale(language),
        keepOpenOnClick: true,
      })),
    },
    buildGlassMenuItem({ level: glassLevel, setLevel: setGlassLevel, locale }),
  ];

  const menuTools = isCompact ? [...compactOnlyTools, ...toolbarItems] : toolbarItems;

  return (
    <>
      <AppNavbar
        appName="room"
        dark={darkMode}
        hideHubLink={isCompact}
        position="fixed top-0 left-0 right-0 z-50"
        brandTourId="app-title"
        searchTourId="address-search"
        userMenuTourId="help-button"
        search={{
          activeAddress,
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
        actionsExtra={isCompact ? undefined : (
          /* "Open with" is first — opens the current parcel/location in another
             suite app. It uses the selected parcel's lngLat when available
             (map-click), falling back to the last address search result. Two
             navbar icon buttons follow: Search history (opens the shared
             SearchHistoryModal directly; its account-menu row is suppressed in
             UserMenu) and About (info icon, opens the shared AboutModal —
             the suite-standard placement). At compact widths the whole cluster
             folds into the account menu. */
          <>
            {openWithLocation && (
              <OpenWithMenu
                location={openWithLocation}
                currentAppId="room"
                dark={darkMode}
                label={t('nav.open_with')}
                onOpen={(appId) =>
                  void signal.send('Open address in app', {
                    lat: openWithLocation.lat,
                    lng: openWithLocation.lng,
                    metaData: { app: appId },
                  })
                }
              />
            )}
            <NavIconButton
              icon={<History size={18} aria-hidden="true" />}
              label={getSearchHistoryStrings(locale).menuRow}
              onClick={() => setShowHistory(true)}
              dark={darkMode}
            />
            <NavIconButton
              icon={<Info size={18} aria-hidden="true" />}
              label={t('about.menu')}
              onClick={onAbout}
              dark={darkMode}
            />
          </>
        )}
        toolbar={isCompact ? undefined : {
          locale,
          onLocaleChange: setLocale,
          onCapture: capture,
          isCapturing,
          onShowImages: () => setShowImages(true),
          // Dark-mode toggle + Locate moved into the account menu; the toolbar
          // keeps Save image · My exports · language · appearance (glass gear).
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
          <div className={isCompact ? COMPACT_USER_MENU_CLASS_NAME : 'contents'}>
            <UserMenu
              darkMode={darkMode}
              toolbarItems={menuTools}
              toolbarLabel={t('menu.more_tools')}
              // Search history is a navbar button (compact: a menu row we add
              // ourselves), so suppress the menu's built-in "My search history"
              // row to avoid duplicating it.
              showSearchHistory={false}
              bugReport={{ logger: errorLogger, email, metaData: { rollout: 'bug-report-expanded' } }}
            />
          </div>
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

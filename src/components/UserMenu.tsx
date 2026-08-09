import { MapUserMenu, type PrmRecord, type PrmLocale, type MapUserMenuAction, type MapUserMenuProps } from '@aireon/shared';
import { useI18n } from '../contexts/I18nContext';

interface UserMenuProps {
  /** Active theme — drives the account-menu dropdown chrome. */
  darkMode?: boolean;
  /** Secondary tools shown under the "More tools" section of the dropdown (variant-2 navbar). */
  toolbarItems?: MapUserMenuAction[];
  toolbarLabel?: string;
  /** Bug-report config — surfaces a "Report a problem" row in the More-tools group. */
  bugReport?: MapUserMenuProps['bugReport'];
  /** Show the menu's built-in "My search history" row. Pass false when the
   *  navbar already exposes search history as its own button (avoids a dupe). */
  showSearchHistory?: boolean;
}

// Params that name the *previous* selection. They must not survive a jump to a
// different parcel: q/address describe the old address, egrid/parcel_id the old
// parcel. Leaving them behind makes the navbar's "Share this view" copy a link
// whose text contradicts the map, and lets an egrid consumer re-select the old
// parcel over the one we just flew to. Everything else in the URL is view state
// (theme, lang, basemap, view/pitch/bearing, zoom, mode, chrome, tour, welcome,
// motion, toasts) and is deliberately kept.
const STALE_IDENTITY_PARAMS = ['egrid', 'EGRID', 'parcel_id', 'q', 'address'];

export default function UserMenu({ darkMode = true, toolbarItems, toolbarLabel, bugReport, showSearchHistory }: UserMenuProps) {
  const { t, locale } = useI18n();

  const openParcelHere = (rec: PrmRecord) => {
    // Built from the live URL, not from scratch, so the appearance and camera
    // the user is looking at survive the jump (URL_PARAMS_STANDARD.md).
    const url = new URL(window.location.href);
    url.searchParams.set('lat', String(rec.parcel_lat));
    url.searchParams.set('lng', String(rec.parcel_lng));
    STALE_IDENTITY_PARAMS.forEach((name) => url.searchParams.delete(name));
    // Stays a full navigation on purpose: losing history.state is what makes
    // the shared parser read the result as an external deep link and apply the
    // zoom-17 floor, without which the parcel auto-select misses.
    window.location.href = url.toString();
  };

  return (
    <MapUserMenu
      dark={darkMode}
      locale={locale as PrmLocale}
      savedParcelsOpenHereLabel={t('modal.parcels.open_here')}
      onOpenSavedParcel={openParcelHere}
      toolbarItems={toolbarItems}
      toolbarLabel={toolbarLabel}
      showSearchHistory={showSearchHistory}
      bugReport={bugReport}
      labels={{
        signIn: t('menu.sign_in'),
        userMenu: t('menu.user_menu'),
        viewProfile: t('menu.view_profile'),
        savedParcels: t('menu.my_saved_parcels'),
        signOut: t('menu.sign_out'),
        active: t('menu.active'),
        fallbackUser: t('menu.fallback_user'),
      }}
    />
  );
}

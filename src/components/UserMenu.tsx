import { MapUserMenu, type PrmRecord, type PrmLocale, type MapUserMenuAction } from '@aireon/shared';
import { useI18n } from '../contexts/I18nContext';

interface UserMenuProps {
  /** Secondary tools shown under the "More tools" section of the dropdown (variant-2 navbar). */
  toolbarItems?: MapUserMenuAction[];
  toolbarLabel?: string;
}

export default function UserMenu({ toolbarItems, toolbarLabel }: UserMenuProps) {
  const { t, locale } = useI18n();

  const openParcelHere = (rec: PrmRecord) => {
    const params = new URLSearchParams(window.location.search);
    params.set('lat', String(rec.parcel_lat));
    params.set('lng', String(rec.parcel_lng));
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  return (
    <MapUserMenu
      dark
      locale={locale as PrmLocale}
      savedParcelsOpenHereLabel={t('modal.parcels.open_here')}
      onOpenSavedParcel={openParcelHere}
      toolbarItems={toolbarItems}
      toolbarLabel={toolbarLabel}
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

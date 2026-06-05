import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, CircleUser as UserCircle, Bookmark } from 'lucide-react';
import {
  Skeleton,
  Avatar,
  ProfileModal,
  useUserProfile,
  firstNameOf,
  fullNameOf,
  emailOf,
  initialsOf,
  SavedParcelsModal,
  type PrmRecord,
  type PrmLocale,
} from '@aireon/shared';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function UserMenu() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-centre groove on the saved parcel via the existing ?lat&lng deep-link
  // contract handled by MapView's getInitialMapState + parcel auto-select.
  const openParcelHere = (rec: PrmRecord) => {
    setShowSaved(false);
    const params = new URLSearchParams(window.location.search);
    params.set('lat', String(rec.parcel_lat));
    params.set('lng', String(rec.parcel_lng));
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };
  // Called unconditionally before the early returns (React #310 / Rules of Hooks).
  const { avatarUrl } = useUserProfile(user);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-shrink-0">
        <Skeleton dark circle width={36} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        title={t('menu.sign_in')}
        aria-label={t('menu.sign_in')}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        <UserCircle size={20} />
      </button>
    );
  }

  const firstName = firstNameOf(user);
  const displayName = fullNameOf(user);
  const email = emailOf(user);
  const initials = initialsOf(user);

  return (
    <>
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-all hover:ring-2 hover:ring-red-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
        >
          <Avatar url={avatarUrl} initials={initials} size={28} />
          <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate text-gray-200">
            {firstName}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-800/70 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="px-4 py-4 border-b border-gray-800/60">
              <div className="flex items-center gap-3">
                <Avatar url={avatarUrl} initials={initials} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {displayName || firstName || t('menu.fallback_user')}
                  </p>
                  {email && (
                    <p className="text-xs text-gray-400 truncate">{email}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-gray-400">{t('menu.active')}</span>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowProfile(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/70 transition-colors"
              >
                <UserCircle size={16} />
                <span>{t('menu.view_profile')}</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSaved(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/70 transition-colors"
              >
                <Bookmark size={16} />
                <span>{t('menu.my_saved_parcels')}</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                <span>{t('menu.sign_out')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showProfile && user && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} dark={true} />
      )}
      {showSaved && (
        <SavedParcelsModal
          locale={locale as PrmLocale}
          onClose={() => setShowSaved(false)}
          onOpenHere={openParcelHere}
          openHereLabel={t('modal.parcels.open_here')}
        />
      )}
    </>
  );
}

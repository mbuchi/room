import { useEffect, useRef, useState } from 'react';
import { MapPin, X, Shield } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface LocationPermissionModalProps {
  onAllow: () => void;
  onDismiss: () => void;
}

const STORAGE_KEY = 'groove-location-prompted';

const LocationPermissionModal = ({ onAllow, onDismiss }: LocationPermissionModalProps) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const alreadyPrompted = localStorage.getItem(STORAGE_KEY);
    if (alreadyPrompted) return;

    const timer = setTimeout(() => {
      setShouldRender(true);
      requestAnimationFrame(() => setIsVisible(true));
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    animateOut(() => onAllow());
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    animateOut(() => onDismiss());
  };

  const animateOut = (callback: () => void) => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      callback();
    }, 300);
  };

  useEffect(() => {
    if (!shouldRender) return;
    dismissButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-permission-title"
        className={`relative w-full max-w-sm bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6 pb-4">
          <button
            ref={dismissButtonRef}
            onClick={handleDismiss}
            aria-label={t('modal.location.not_now')}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-red-500"
          >
            <X size={16} />
          </button>

          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/20 mb-5">
            <MapPin size={26} className="text-red-400" />
          </div>

          <h2 id="location-permission-title" className="text-lg font-semibold text-gray-100 mb-2">
            {t('modal.location.title')}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {t('modal.location.body')}
          </p>

          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-lg bg-gray-800/60 border border-gray-700/40">
            <Shield size={14} className="text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">
              {t('modal.location.privacy')}
            </span>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-800/60 border border-gray-700/40 hover:bg-gray-800 hover:text-gray-300 transition-all duration-150"
          >
            {t('modal.location.not_now')}
          </button>
          <button
            onClick={handleAllow}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-red-900/30"
          >
            {t('modal.location.allow')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;

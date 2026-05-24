import { useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

// Geolocation error codes the callers receive. They map 1:1 to i18n keys
// under `map.locate.*` so the user-facing message is rendered at the
// translation boundary, not inside this generic helper.
export type LocateErrorCode =
  | 'not_supported'
  | 'permission_denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

interface LocateButtonProps {
  onLocate: (coords: [number, number]) => void;
  onError: (code: LocateErrorCode) => void;
}

export function requestGeolocation(
  onLocate: (coords: [number, number]) => void,
  onError: (code: LocateErrorCode) => void,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if (!navigator.geolocation) {
    onError('not_supported');
    return;
  }

  onStart?.();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { longitude, latitude } = position.coords;
      onLocate([longitude, latitude]);
      onEnd?.();
    },
    (err) => {
      onEnd?.();
      switch (err.code) {
        case err.PERMISSION_DENIED:
          onError('permission_denied');
          break;
        case err.POSITION_UNAVAILABLE:
          onError('unavailable');
          break;
        case err.TIMEOUT:
          onError('timeout');
          break;
        default:
          onError('unknown');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

const LocateButton = ({ onLocate, onError }: LocateButtonProps) => {
  const { t } = useI18n();
  const [isLocating, setIsLocating] = useState(false);

  const handleClick = () => {
    if (isLocating) return;
    requestGeolocation(
      onLocate,
      onError,
      () => setIsLocating(true),
      () => setIsLocating(false),
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLocating}
      className="group relative flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800/80 border border-gray-700/50 transition-all duration-200 hover:bg-red-600/20 hover:border-red-500/40 active:scale-90 disabled:opacity-50 disabled:cursor-wait"
      title={t('map.locate.button')}
      aria-label={t('map.locate.button')}
    >
      {isLocating ? (
        <Loader2 size={18} className="text-gray-300 animate-spin" />
      ) : (
        <Navigation
          size={17}
          className="text-gray-300 transition-all duration-200 group-hover:text-red-400 group-hover:drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]"
        />
      )}
    </button>
  );
};

export default LocateButton;

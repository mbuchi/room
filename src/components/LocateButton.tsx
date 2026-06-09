import { useState } from 'react';
import { Navigation } from 'lucide-react';
import { NavIconButton } from '@aireon/shared';
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
    <NavIconButton
      icon={<Navigation size={18} aria-hidden="true" />}
      label={t('map.locate.button')}
      onClick={handleClick}
      dark
      className={isLocating ? 'animate-pulse' : ''}
    />
  );
};

export default LocateButton;

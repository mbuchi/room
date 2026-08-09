import {
  CompareToggleButton as SharedCompareToggleButton,
  PANEL_TOUCH_TARGET,
} from '@aireon/shared';
import { useCompare, MAX_COMPARE, type CompareParcel } from '../contexts/CompareContext';
import { useI18n } from '../contexts/I18nContext';

interface CompareToggleButtonProps {
  parcel: CompareParcel | null;
  darkMode: boolean;
}

// Thin wrapper around the suite-standard @aireon/shared CompareToggleButton.
// When the tray is full the button is dimmed and the limit is surfaced through
// its title attribute.
export default function CompareToggleButton({
  parcel,
  darkMode,
}: CompareToggleButtonProps) {
  const { has, add, remove, parcels } = useCompare();
  const { t } = useI18n();

  if (!parcel) return null;

  const pinned = has(parcel.id);
  const full = !pinned && parcels.length >= MAX_COMPARE;

  const handleToggle = () => {
    if (pinned) {
      remove(parcel.id);
      return;
    }
    if (full) return;
    add(parcel);
  };

  return (
    <SharedCompareToggleButton
      pinned={pinned}
      onToggle={handleToggle}
      dark={darkMode}
      labels={{
        pin: full ? t('compare.tray_full', { max: MAX_COMPARE }) : t('compare.pin'),
        unpin: t('compare.unpin'),
      }}
      className={`${PANEL_TOUCH_TARGET}${full ? ' opacity-40 cursor-not-allowed' : ''}`}
    />
  );
}

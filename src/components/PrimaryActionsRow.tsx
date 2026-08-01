import { Sparkles } from 'lucide-react';
import type { FocusedParcelHandle } from './ZoneInfoPanel';
import { useI18n } from '../contexts/I18nContext';

/**
 * Suite data-card standard primary-actions row. Phones only (onAskClaire set):
 * a full-width calm "Ask Claire" button — the floating launcher is hidden
 * there, so this is the in-context Claire entry point. Desktop renders
 * nothing: Claire stays on the floating launcher.
 *
 * The cross-app "Open in" drop-up that used to ride beside it was removed
 * suite-wide: the navbar "Open with" menu beside the address search is the
 * single cross-app launch point now.
 *
 * Per the suite standard it is NOT pinned below the scroll area: each tab
 * renders it as the LAST section of its scrollable content (via the
 * `actionsSlot` prop on ZonePanel / ZoneInfoPanel), so the user scrolls to
 * the bottom to reach it. The raw-JSON view intentionally omits it.
 */
const PrimaryActionsRow = ({
  focusedParcel,
  onAskClaire,
}: {
  /** The currently-focused parcel — the row hides without one. */
  focusedParcel: FocusedParcelHandle | null;
  /** Open the Claire assistant (owned by MapView). Set on phones only. */
  onAskClaire?: () => void;
}) => {
  const { t } = useI18n();
  if (!focusedParcel?.parcelId || !onAskClaire) return null;
  return (
    <div className="border-t border-gray-200 dark:border-gray-800/60 bg-white/95 dark:bg-gray-950/95 px-3 py-3 print:hidden">
      <button
        type="button"
        onClick={onAskClaire}
        className="w-full flex items-center justify-center gap-2 min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/[0.07] dark:hover:bg-white/[0.08] transition active:scale-[0.99]"
      >
        <Sparkles size={16} aria-hidden="true" className="shrink-0 text-amber-500" />
        <span className="truncate">{t('panel.info.ask_claire')}</span>
      </button>
    </div>
  );
};

export default PrimaryActionsRow;

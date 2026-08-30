import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Shared chrome for the right-hand pane's tab bodies.
 *
 * Every level-1 tab (Zone / Parcel / Market / Massing / FAQ / Compare) renders
 * exactly ONE `PanelScroll`, which is the tab's only scroll container. Nested
 * scrollers inside a tab are forbidden — two scrollbars in one pane is a
 * standing suite defect, and it also breaks the "scroll to the bottom to reach
 * the primary actions" contract, since the actions row rides at the end of this
 * same scroller.
 */

export const PanelScroll = ({
  children,
  actionsSlot,
  padded = true,
}: {
  children: ReactNode;
  /** Primary-actions row — always the LAST section of the scroll flow. */
  actionsSlot?: ReactNode;
  /** `false` for tabs whose sections bring their own full-bleed padding. */
  padded?: boolean;
}) => (
  <div className={`flex-1 min-h-0 overflow-y-auto ${padded ? 'px-5 py-4 space-y-4' : ''}`}>
    {children}
    {/* The negative margins bleed the slot's border-t across the scroller's own
        padding (the slot re-applies its inner padding); the parent's space-y
        supplies the top gap. Unpadded scrollers need no bleed. */}
    {actionsSlot && <div className={padded ? '-mx-5 -mb-4 mt-4' : 'mt-2'}>{actionsSlot}</div>}
  </div>
);

/** Card surface used by grouped blocks in the pane. */
export const Section = ({
  icon,
  title,
  children,
  darkMode = true,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  darkMode?: boolean;
}) => (
  <div
    className={`rounded-lg px-4 py-3.5 ${
      darkMode ? 'bg-white/[0.035] ring-1 ring-white/6' : 'bg-slate-50 ring-1 ring-slate-200/80'
    }`}
  >
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </span>
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

/** Muted "nothing to show here" line for a tab whose data is unavailable. */
export const PanelEmpty = ({ children }: { children: ReactNode }) => (
  <p className="px-1 py-6 text-center text-xs text-gray-400 dark:text-gray-500">{children}</p>
);

/** Shared error card — same shape the zone and parcel fetches already used. */
export const PanelError = ({ title, detail }: { title: string; detail?: string | null }) => (
  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
    <div className="flex items-start gap-2.5">
      <AlertCircle size={14} className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-medium text-red-500 dark:text-red-400">{title}</p>
        {detail && (
          <p className="text-[11px] text-red-500/70 dark:text-red-400/60 mt-1 leading-relaxed">
            {detail}
          </p>
        )}
      </div>
    </div>
  </div>
);

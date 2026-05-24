import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

import { appTourConfig } from "./tour.config";
import { useTour } from "./TourProvider";
import type { TourVariant } from "./tour.types";

type Props = {
  className?: string;
};

export function TourHelpButton({ className }: Props) {
  const { startTour } = useTour();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hasShort = appTourConfig.variants.short.length > 0;
  const hasLong = appTourConfig.variants.long.length > 0;
  // When only one variant is configured, the dropdown is redundant — clicking
  // the help button starts that tour directly. scoore is in this mode.
  const singleVariant: TourVariant | null =
    hasShort && hasLong ? null : hasLong ? "long" : hasShort ? "short" : null;

  useEffect(() => {
    if (singleVariant) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [singleVariant]);

  function pick(variant: TourVariant) {
    setOpen(false);
    startTour(variant);
  }

  const buttonClass =
    className ??
    "w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors";

  if (singleVariant) {
    const label =
      singleVariant === "long"
        ? appTourConfig.copy.longTourLabel
        : appTourConfig.copy.shortTourLabel;
    return (
      <div ref={wrapRef} className="relative" data-tour="help-button">
        <button
          type="button"
          onClick={() => pick(singleVariant)}
          aria-label={label}
          title={label}
          className={buttonClass}
        >
          <HelpCircle className="w-[18px] h-[18px]" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative" data-tour="help-button">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={appTourConfig.copy.helpButtonLabel}
        title={appTourConfig.copy.helpButtonLabel}
        className={buttonClass}
      >
        <HelpCircle className="w-[18px] h-[18px]" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-[9999] overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("short")}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {appTourConfig.copy.shortTourLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("long")}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800"
          >
            {appTourConfig.copy.longTourLabel}
          </button>
        </div>
      )}
    </div>
  );
}

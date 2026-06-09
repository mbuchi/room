import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Joyride, {
  type CallBackProps,
  STATUS,
  type Step,
} from "react-joyride";

import { appTourConfig } from "./tour.config";
import { TourTooltip } from "./TourTooltip";
import type { TourVariant } from "./tour.types";
import { hasCompletedTour, markTourCompleted } from "./tourStorage";
import { useI18n } from "../contexts/I18nContext";

type TourContextValue = {
  startTour: (variant: TourVariant) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

const SUITE_WORDMARK_RED = "#DC2626";

// groove has no ThemeContext — derive dark mode from the DOM instead.
function detectDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.classList.contains("dark")) return true;
  return document.querySelector(".dark") !== null;
}

// Tooltip styling lives in TourTooltip.tsx (custom tooltipComponent). These
// styles only configure pieces Joyride still owns: the overlay, the spotlight
// cutout, and shared options like zIndex / primaryColor. The overlay is
// theme-aware — a near-black wash in dark mode, a softer slate wash in light.
function buildJoyrideStyles(primaryColor: string, isDarkMode: boolean) {
  return {
    options: {
      zIndex: 10000,
      primaryColor,
      overlayColor: isDarkMode
        ? "rgba(2, 6, 23, 0.62)"
        : "rgba(15, 23, 42, 0.42)",
    },
    spotlight: {
      borderRadius: 14,
      boxShadow: isDarkMode
        ? "0 0 0 1px rgba(255,255,255,0.08), 0 12px 32px rgba(0,0,0,0.45)"
        : "0 0 0 1px rgba(255,255,255,0.65), 0 12px 32px rgba(2,6,23,0.18)",
    },
  };
}

function pickAutoStartVariant(): TourVariant | null {
  const b = appTourConfig.behavior;
  // Long takes precedence — scoore opts out of short entirely.
  if (b.autoStartLongTour && appTourConfig.variants.long.length > 0) return "long";
  if (b.autoStartShortTour && appTourConfig.variants.short.length > 0) return "short";
  return null;
}

function targetExists(selector: string) {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(selector));
}

type Translator = (key: string, vars?: Record<string, string | number>) => string;

function toJoyrideSteps(variant: TourVariant, t: Translator): Step[] {
  return appTourConfig.variants[variant]
    .filter((step) => {
      if (!appTourConfig.behavior.skipMissingTargets) return true;
      return step.optional || targetExists(step.target);
    })
    .map((step) => {
      // Resolve translations via i18nKey when configured. The literal title
      // / body act as English fallbacks (and source-of-truth when no key is
      // configured) — the I18nContext already falls back to English on miss.
      const title = step.i18nKey ? t(`${step.i18nKey}.title`) : step.title;
      const body = step.i18nKey ? t(`${step.i18nKey}.body`) : step.body;
      return {
        target: step.target,
        title,
        content: body,
        placement: step.placement ?? "auto",
        disableBeacon: step.disableBeacon ?? true,
        spotlightClicks: step.spotlightClicks ?? false,
        // Leave undefined so Joyride's global `disableScrolling` prop wins. A
        // per-step boolean (even `false`) overrides the global setting, which
        // would let individual steps scroll the page despite behavior.disableScrolling.
        ...(step.disableScrolling === undefined
          ? {}
          : { disableScrolling: step.disableScrolling }),
      };
    });
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const [run, setRun] = useState(false);
  const [variant, setVariant] = useState<TourVariant>(
    () => pickAutoStartVariant() ?? "long",
  );

  // Latest translator, read imperatively by computeSteps (below).
  const tRef = useRef(t);
  tRef.current = t;

  // The visible step set depends on which data-tour anchors are mounted RIGHT
  // NOW — a live DOM read. Computing it in a render-time useMemo is unsafe under
  // the React Compiler: the compiler memoizes on the values the callback closes
  // over (variant, t) and can't see the DOM read, so it caches the first-render
  // result — computed before the app's anchors mount, hence often empty/partial.
  // Instead we compute imperatively the moment the tour starts, by which point
  // the anchors exist, and store the result in state.
  const [steps, setSteps] = useState<Step[]>([]);
  const computeSteps = useCallback((nextVariant: TourVariant) => {
    setSteps(toJoyrideSteps(nextVariant, tRef.current));
  }, []);

  const joyrideStyles = useMemo(
    () =>
      buildJoyrideStyles(
        appTourConfig.behavior.primaryColor ?? SUITE_WORDMARK_RED,
        detectDarkMode(),
      ),
    [run],
  );

  const startTour = useCallback(
    (nextVariant: TourVariant) => {
      setVariant(nextVariant);
      setRun(false);
      // Recompute steps from the live DOM, then start — batched into one render.
      window.setTimeout(() => {
        computeSteps(nextVariant);
        setRun(true);
      }, 50);
    },
    [computeSteps],
  );

  useEffect(() => {
    const auto = pickAutoStartVariant();
    if (!auto) return;
    if (
      hasCompletedTour(
        appTourConfig.appId,
        appTourConfig.tourVersion,
        auto,
      )
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVariant(auto);
      computeSteps(auto);
      setRun(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [computeSteps]);

  // Re-translate the running tour if the user switches language mid-tour.
  useEffect(() => {
    if (run) computeSteps(variant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  function handleCallback(data: CallBackProps) {
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(data.status)) {
      markTourCompleted(
        appTourConfig.appId,
        appTourConfig.tourVersion,
        variant,
        appTourConfig.behavior.completionTtlDays,
      );
      setRun(false);
    }
  }

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      {/* Keyframe used by TourTooltip's fade-in. Joyride renders the tooltip
          via a portal to document.body, so the animation needs a global
          stylesheet — inlining it here keeps the tour module self-contained. */}
      <style>{`
        @keyframes swissnovoTourFadeIn {
          from { opacity: 0; transform: translateY(6px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
      <Joyride
        steps={steps}
        run={run}
        continuous
        disableScrolling={appTourConfig.behavior.disableScrolling ?? false}
        showProgress={appTourConfig.behavior.showProgress}
        showSkipButton={appTourConfig.behavior.showSkipButton}
        scrollToFirstStep={appTourConfig.behavior.scrollToFirstStep}
        callback={handleCallback}
        tooltipComponent={TourTooltip}
        locale={{
          back: t('tour.back'),
          close: t('tour.done'),
          last: t('tour.done'),
          next: t('tour.next'),
          skip: t('tour.skip'),
        }}
        styles={joyrideStyles}
      />
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used inside <TourProvider>");
  }
  return ctx;
}

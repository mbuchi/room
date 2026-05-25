export type TourVariant = "short" | "long";

export type TourPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "auto"
  | "center";

export type AppTourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
  /**
   * Optional i18n key prefix. When set, the resolved title/body come from
   * `${i18nKey}.title` / `${i18nKey}.body` via the I18n context. The literal
   * `title` / `body` above act as English fallbacks (and source-of-truth when
   * no key is configured).
   */
  i18nKey?: string;
  placement?: TourPlacement;
  optional?: boolean;
  disableBeacon?: boolean;
  spotlightClicks?: boolean;
  /** When true, Joyride won't auto-scroll the page to bring the target into view. */
  disableScrolling?: boolean;
};

export type AppTourConfig = {
  appId: string;
  appName: string;
  tourVersion: string;
  behavior: {
    autoStartShortTour: boolean;
    /** If true, the long tour auto-starts on first visit (gated by storage). */
    autoStartLongTour?: boolean;
    /** Days to remember "completed" for. Defaults to 30 in tourStorage. */
    completionTtlDays?: number;
    /** Disable Joyride's auto-scrolling globally. Default true for SwissNovo —
     *  tours should point at the target from the user's current view rather
     *  than reposition the page (and risk pushing the tooltip off-screen). */
    disableScrolling?: boolean;
    /** Brand accent used for the primary tour button + progress. Defaults to
     *  the suite-wide wordmark red (#DC2626) when unset. */
    primaryColor?: string;
    showProgress: boolean;
    showSkipButton: boolean;
    scrollToFirstStep: boolean;
    skipMissingTargets: boolean;
    restartLongTourFromHelpButton: boolean;
  };
  copy: {
    shortTourLabel: string;
    longTourLabel: string;
    helpButtonLabel: string;
    doneLabel: string;
    nextLabel: string;
    backLabel: string;
    skipLabel: string;
  };
  variants: {
    short: AppTourStep[];
    long: AppTourStep[];
  };
};

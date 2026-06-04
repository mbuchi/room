import type { AppTourConfig } from "./tour.types";

export const appTourConfig: AppTourConfig = {
  appId: "room",
  appName: "room",
  tourVersion: "1.0.0",

  behavior: {
    autoStartShortTour: false,
    autoStartLongTour: true,
    completionTtlDays: 30,
    disableScrolling: true,
    primaryColor: "#DC2626",
    showProgress: true,
    showSkipButton: true,
    scrollToFirstStep: false,
    skipMissingTargets: true,
    restartLongTourFromHelpButton: true,
  },

  // English fallbacks — the live UI strings come from the I18n context
  // (keys under `tour.*` in src/contexts/I18nContext.tsx). These literals are
  // what users see when no I18nProvider is active and what TourProvider falls
  // back to when a translation key is missing.
  copy: {
    shortTourLabel: "Quick tour",
    longTourLabel: "Take the tour",
    helpButtonLabel: "Help",
    doneLabel: "Done",
    nextLabel: "Next",
    backLabel: "Back",
    skipLabel: "Skip",
  },

  variants: {
    short: [],

    // NOTE on step ordering & optionality: the parcel info panel (and its
    // Track-parcel CTA, facts and charts) only mounts AFTER the user clicks a
    // parcel. Those steps are therefore NOT marked optional, so when no parcel
    // is selected (first-visit auto-start) `skipMissingTargets` filters them
    // out and every shown step still spotlights a real, mounted element. Once a
    // parcel is selected and the user replays the tour from Help, the full set
    // appears in order. We deliberately avoid placement:"center" everywhere so
    // each step gets a true spotlight + soft-focus surround.
    long: [
      {
        id: "welcome",
        target: "[data-tour='app-title']",
        title: "Welcome to room",
        body: "room answers one question: how densely is this zone already built? Search or click a parcel and you'll see exactly where it sits on its zone's utilisation distribution.",
        i18nKey: "tour.welcome",
        placement: "bottom",
      },
      {
        id: "search",
        target: "[data-tour='address-search']",
        title: "Find any address",
        body: "Type any Swiss address or place. The map flies there and auto-selects the matching parcel, so the whole density analysis is one search away.",
        i18nKey: "tour.search",
        placement: "bottom",
      },
      {
        id: "map",
        target: "[data-tour='map-view']",
        title: "Click the map to read a parcel",
        body: "Click anywhere on the map to pick a parcel. room instantly shades every parcel in that zone by its built-volume percentile — light = barely used, dark = near full — and opens a panel with that parcel's facts and where it ranks.",
        i18nKey: "tour.map",
        placement: "top",
      },
      {
        id: "parcel-facts",
        target: "[data-tour='zone-info-panel']",
        title: "Read the parcel's facts",
        body: "The Parcel facts tab lists the municipality, zoning category, parcel area, existing building volume, year built and the utilisation figures (ratioV, freeV) — the raw numbers behind the density score.",
        i18nKey: "tour.parcel_facts",
        placement: "left",
      },
      {
        id: "charts",
        target: "[data-tour='zone-charts']",
        title: "Where this parcel ranks",
        body: "The Zone distribution tab plots the whole zone: a boxplot, utilisation histograms, a percentile gauge and a parcel-area-vs-volume scatter — each marked with your parcel, so you can see at a glance whether it's under- or over-built versus its peers.",
        i18nKey: "tour.charts",
        placement: "left",
      },
      {
        id: "track-parcel",
        target: "[data-tour='track-parcel']",
        title: "Track this parcel",
        body: "Found a parcel worth watching? Track it to save it to your proom workspace, where it syncs across the whole SwissNovo suite. Open it later in proom in one click. (Sign in to enable.)",
        i18nKey: "tour.track_parcel",
        placement: "top",
      },
      {
        id: "layers",
        target: "[data-tour='layer-controls']",
        title: "Tune the view",
        body: "Switch basemaps, fade the parcel and building overlays in or out, or flip on the 3D building view to see real heights behind the density shading.",
        i18nKey: "tour.layers",
        placement: "right",
      },
      {
        id: "help",
        target: "[data-tour='help-button']",
        title: "Replay anytime",
        body: "That's the tour. Select a parcel first and replay from this Help button to walk through the panel, charts and tracking steps too.",
        i18nKey: "tour.help",
        placement: "bottom",
      },
    ],
  },
};

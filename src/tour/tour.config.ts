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

    long: [
      {
        id: "welcome",
        target: "[data-tour='app-title']",
        title: "Welcome to room",
        body: "See how densely built any Swiss zone actually is — and where the selected parcel sits on the distribution.",
        i18nKey: "tour.welcome",
        placement: "bottom",
      },
      {
        id: "search",
        target: "[data-tour='address-search']",
        title: "Find any address",
        body: "Search for any Swiss address. The map flies there and selects the matching parcel.",
        i18nKey: "tour.search",
        placement: "bottom",
      },
      {
        id: "map",
        target: "[data-tour='map-view']",
        title: "Density at a glance",
        body: "Click any parcel. The map then shades every other parcel in the same zone by its utilisation percentile — light to dark.",
        i18nKey: "tour.map",
        placement: "center",
      },
      {
        id: "parcel-facts",
        target: "[data-tour='zone-info-panel']",
        title: "Parcel facts",
        body: "Municipality, zoning category, parcel area, existing volume, year built, ratioV, freeV — all for the parcel you clicked.",
        i18nKey: "tour.parcel_facts",
        placement: "left",
        optional: true,
      },
      {
        id: "zone-switcher",
        target: "[data-tour='zone-selector']",
        title: "Compare other zones",
        body: "room auto-selects this parcel's own zoning category. Switch to any other zone in the same municipality to compare.",
        i18nKey: "tour.zone_switcher",
        placement: "left",
        optional: true,
      },
      {
        id: "charts",
        target: "[data-tour='zone-charts']",
        title: "Where you stand",
        body: "Boxplot, six distribution histograms, a percentile gauge, a time-evolution line, and a parcel-area-vs-volume scatter — each marks the selected parcel.",
        i18nKey: "tour.charts",
        placement: "left",
        optional: true,
      },
      {
        id: "layers",
        target: "[data-tour='layer-controls']",
        title: "Tune the view",
        body: "Switch basemaps, adjust parcel and building opacity, or flip on the 3D building view.",
        i18nKey: "tour.layers",
        placement: "right",
      },
      {
        id: "tools",
        target: "[data-tour='map-tools']",
        title: "Locate & capture",
        body: "Jump to your location, or capture the map and its density overlay for reports and exports.",
        i18nKey: "tour.tools",
        placement: "bottom",
      },
      {
        id: "help",
        target: "[data-tour='help-button']",
        title: "Restart anytime",
        body: "You can replay this tour at any moment from this Help button.",
        i18nKey: "tour.help",
        placement: "bottom",
      },
    ],
  },
};

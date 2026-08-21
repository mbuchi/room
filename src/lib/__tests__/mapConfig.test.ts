import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetUrlStateForTests } from "@aireon/shared/url-params";
import { pickDeepLinkFeature } from "@aireon/shared/map-interaction";
import {
  clearConfirmedParcelUrl,
  getParcelAutoSelectTarget,
  parcelUrlIdentity,
  resolvePanelTopic,
  stampConfirmedParcelUrl,
} from "../mapConfig";

interface FakeWindow {
  location: { search: string; pathname: string; hash: string; href: string };
  history: { replaceState: (...args: unknown[]) => void; state: unknown };
}

function stubWindow(
  overrides: Partial<Omit<FakeWindow["location"], "href">> = {},
  historyState: unknown = null,
): FakeWindow {
  const search = overrides.search ?? "";
  const pathname = overrides.pathname ?? "/";
  const hash = overrides.hash ?? "";
  const href = `https://room.aireon.ch${pathname}${search}${hash}`;
  const fake: FakeWindow = {
    location: { search, pathname, hash, href },
    history: { replaceState: vi.fn(), state: historyState },
  };
  vi.stubGlobal("window", fake as unknown as Window & typeof globalThis);
  __resetUrlStateForTests();
  return fake;
}

/** The marker `updateMapUrl` leaves behind, i.e. a URL room wrote itself. */
const SELF_WRITTEN = { aireonSelfWritten: true };

/** room's real tab set, in its real order (MapView PANEL_TAB_IDS). */
const ROOM_TABS = ["zone", "parcel", "market", "massing", "faq", "compare"] as const;
const ROOM_TOPIC_ALIASES = { build: "massing", details: "parcel" } as const;
const resolveRoomTopic = () =>
  resolvePanelTopic(ROOM_TABS, "zone", ROOM_TOPIC_ALIASES);

describe("stampConfirmedParcelUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetUrlStateForTests();
  });

  const lastUrl = (fake: FakeWindow): string => {
    const calls = (fake.history.replaceState as ReturnType<typeof vi.fn>).mock.calls;
    return calls[calls.length - 1][2] as string;
  };

  it("writes coordinates, zoom, egrid and label into the address bar", () => {
    const fake = stubWindow({ search: "?lat=47.1&lng=8.1&zoom=12" });
    stampConfirmedParcelUrl({
      lat: 47.556806,
      lng: 8.894175,
      zoom: 18,
      label: "Bahnhofstrasse 12 8000 Zürich",
      egrid: "CH123456789012",
    });
    const params = new URLSearchParams(lastUrl(fake).split("?")[1]);
    expect(params.get("lat")).toBe("47.556806");
    expect(params.get("lng")).toBe("8.894175");
    expect(params.get("zoom")).toBe("18.00");
    expect(params.get("egrid")).toBe("CH123456789012");
    expect(params.get("q")).toBe("Bahnhofstrasse 12 8000 Zürich");
  });

  it("preserves unrelated query parameters", () => {
    const fake = stubWindow({ search: "?theme=dark&lang=de" });
    stampConfirmedParcelUrl({
      lat: 47.5,
      lng: 8.8,
      zoom: 17,
      egrid: "CH123",
    });
    const params = new URLSearchParams(lastUrl(fake).split("?")[1]);
    expect(params.get("theme")).toBe("dark");
    expect(params.get("lang")).toBe("de");
    expect(params.get("egrid")).toBe("CH123");
  });
});

describe("clearConfirmedParcelUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetUrlStateForTests();
  });

  const lastUrl = (fake: FakeWindow): string => {
    const calls = (fake.history.replaceState as ReturnType<typeof vi.fn>).mock.calls;
    return calls[calls.length - 1][2] as string;
  };

  it("removes parcel identity and search query while keeping camera", () => {
    const fake = stubWindow({
      search: "?lat=47.1&lng=8.1&zoom=18&egrid=CH123&q=Some+Street+1&parcel_id=456",
    });
    clearConfirmedParcelUrl({ lat: 47.3, lng: 8.3, zoom: 16 });
    const params = new URLSearchParams(lastUrl(fake).split("?")[1]);
    expect(params.has("egrid")).toBe(false);
    expect(params.has("parcel_id")).toBe(false);
    expect(params.has("q")).toBe(false);
    expect(params.get("lat")).toBe("47.300000");
    expect(params.get("lng")).toBe("8.300000");
    expect(params.get("zoom")).toBe("16.00");
  });
});

describe("parcelUrlIdentity", () => {
  it("extracts federal EGRID from parcel_id", () => {
    expect(parcelUrlIdentity({ parcel_id: "CH188031547755" })).toEqual({
      egrid: "CH188031547755",
      parcelId: null,
    });
  });

  it("extracts featureId fallback", () => {
    expect(parcelUrlIdentity({}, "CH188031547755")).toEqual({
      egrid: "CH188031547755",
      parcelId: null,
    });
  });

  it("handles non-EGRID parcel_id", () => {
    expect(parcelUrlIdentity({ parcel_id: "9999" })).toEqual({
      egrid: null,
      parcelId: "9999",
    });
  });
});

describe("getParcelAutoSelectTarget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetUrlStateForTests();
  });

  it("selects for an external ?lat/?lng deep link", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&zoom=17.5" });
    const target = getParcelAutoSelectTarget();
    expect(target.enabled).toBe(true);
    expect(target.lat).toBeCloseTo(47.3601, 6);
    expect(target.lng).toBeCloseTo(8.5449, 6);
    expect(target.preferId).toBeNull();
  });

  it("prefers the URL's egrid when several parcels stack under the point", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&egrid=CH499971129161" });
    expect(getParcelAutoSelectTarget().preferId).toBe("CH499971129161");
  });

  it("falls back to ?parcel_id when there is no egrid", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&parcel_id=1234" });
    expect(getParcelAutoSelectTarget().preferId).toBe("1234");
  });

  it("re-opens the panel on a reload that still names a parcel", () => {
    // Self-written URL, but the identity in it asserts a parcel IS open, so a
    // restored tab has to bring the panel back.
    stubWindow(
      { search: "?lat=47.3601&lng=8.5449&egrid=CH499971129161" },
      SELF_WRITTEN,
    );
    expect(getParcelAutoSelectTarget().enabled).toBe(true);
  });

  it("does not conjure a panel on a reload of a bare self-written camera", () => {
    // room rewrites ?lat/?lng on every moveend, so this is the ordinary
    // reload. Nothing was selected; nothing may open.
    stubWindow({ search: "?lat=47.3601&lng=8.5449&zoom=16" }, SELF_WRITTEN);
    expect(getParcelAutoSelectTarget().enabled).toBe(false);
  });

  it("honors ?select=off for clean captures and embeds", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&egrid=CH499971129161&select=off" });
    expect(getParcelAutoSelectTarget().enabled).toBe(false);
  });

  it("selects nothing when the URL names no place at all", () => {
    stubWindow({ search: "?theme=dark" });
    expect(getParcelAutoSelectTarget().enabled).toBe(false);
  });

  it("needs coordinates: an id alone has nothing to hit-test", () => {
    stubWindow({ search: "?egrid=CH499971129161" });
    expect(getParcelAutoSelectTarget().enabled).toBe(false);
  });

  it("demands a real id match on a reload that names a parcel", () => {
    // The drifted-reload case: room rewrites ?lat/?lng on every moveend, so a
    // self-written URL's coordinates are wherever the camera stopped, while
    // ?egrid still names the parcel that is open. The hit-test must not settle
    // for whatever happens to be under those coordinates.
    stubWindow(
      { search: "?lat=47.3601&lng=8.5449&egrid=CH499971129161" },
      SELF_WRITTEN,
    );
    expect(getParcelAutoSelectTarget().requireIdMatch).toBe(true);
  });

  it("keeps the forgiving fallback for an external link", () => {
    // Whoever minted the link meant the coordinates to name the parcel, and
    // room's tileset may spell the id differently.
    stubWindow({ search: "?lat=47.3601&lng=8.5449&egrid=CH499971129161" });
    expect(getParcelAutoSelectTarget().requireIdMatch).toBe(false);
  });

  it("leaves requireIdMatch off when the URL names no parcel", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&zoom=17.5" }, SELF_WRITTEN);
    expect(getParcelAutoSelectTarget().requireIdMatch).toBe(false);
  });
});

describe("a drifted reload does not open the neighbour's parcel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetUrlStateForTests();
  });

  /**
   * What `parcel-hit` renders under the camera centre after the visitor
   * selected CH499971129161 and then panned two blocks away: the named parcel
   * is nowhere near the point any more, only the neighbour is.
   */
  const NEIGHBOUR_ONLY = [
    { properties: { egrid: "CH777777777777", parcel_id: "8811" } },
  ];
  const NAMED_PARCEL_UNDER_POINT = [
    { properties: { egrid: "CH499971129161", parcel_id: "4402" } },
    { properties: { egrid: "CH777777777777", parcel_id: "8811" } },
  ];

  const pickFor = (features: { properties: Record<string, string> }[]) => {
    const target = getParcelAutoSelectTarget();
    return pickDeepLinkFeature(
      features,
      target.preferId,
      undefined,
      target.requireIdMatch,
    );
  };

  it("selects nothing rather than presenting a parcel the link never named", () => {
    stubWindow(
      { search: "?lat=47.3800&lng=8.5300&zoom=17.5&egrid=CH499971129161" },
      SELF_WRITTEN,
    );
    expect(pickFor(NEIGHBOUR_ONLY)).toBeNull();
  });

  it("still selects when the named parcel IS under the point", () => {
    stubWindow(
      { search: "?lat=47.3601&lng=8.5449&zoom=17.5&egrid=CH499971129161" },
      SELF_WRITTEN,
    );
    expect(pickFor(NAMED_PARCEL_UNDER_POINT)?.properties.egrid).toBe(
      "CH499971129161",
    );
  });

  it("an external link keeps opening the topmost feature on an unknown id", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&egrid=CH499971129161" });
    expect(pickFor(NEIGHBOUR_ONLY)?.properties.egrid).toBe("CH777777777777");
  });
});

describe("resolvePanelTopic", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetUrlStateForTests();
  });

  it("defaults to the app's headline tab with no ?topic=", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449" });
    expect(resolveRoomTopic()).toBe("zone");
  });

  it("opens a room tab named directly", () => {
    stubWindow({ search: "?lat=47.3601&lng=8.5449&topic=market" });
    expect(resolveRoomTopic()).toBe("market");
  });

  it("maps the canonical suite ids onto room's own spellings", () => {
    stubWindow({ search: "?topic=build" });
    expect(resolveRoomTopic()).toBe("massing");
    __resetUrlStateForTests();
    stubWindow({ search: "?topic=details" });
    expect(resolveRoomTopic()).toBe("parcel");
  });

  it("is case- and whitespace-tolerant, the way hand-edited URLs arrive", () => {
    stubWindow({ search: "?topic=%20Massing%20" });
    expect(resolveRoomTopic()).toBe("massing");
  });

  it("falls back for a canonical topic room does not have", () => {
    stubWindow({ search: "?topic=rent" });
    expect(resolveRoomTopic()).toBe("zone");
  });

  it("falls back for an unknown id rather than opening a tab that isn't there", () => {
    stubWindow({ search: "?topic=nonsense" });
    expect(resolveRoomTopic()).toBe("zone");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetUrlStateForTests } from "@aireon/shared/url-params";
import {
  clearConfirmedParcelUrl,
  parcelUrlIdentity,
  stampConfirmedParcelUrl,
} from "../mapConfig";

interface FakeWindow {
  location: { search: string; pathname: string; hash: string; href: string };
  history: { replaceState: (...args: unknown[]) => void; state: unknown };
}

function stubWindow(overrides: Partial<Omit<FakeWindow["location"], "href">> = {}): FakeWindow {
  const search = overrides.search ?? "";
  const pathname = overrides.pathname ?? "/";
  const hash = overrides.hash ?? "";
  const href = `https://room.aireon.ch${pathname}${search}${hash}`;
  const fake: FakeWindow = {
    location: { search, pathname, hash, href },
    history: { replaceState: vi.fn(), state: null },
  };
  vi.stubGlobal("window", fake as unknown as Window & typeof globalThis);
  __resetUrlStateForTests();
  return fake;
}

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

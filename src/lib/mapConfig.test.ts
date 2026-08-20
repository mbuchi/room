import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetUrlStateForTests } from '@aireon/shared/url-params';
import {
  clearConfirmedParcelUrl,
  getDeepLinkParcelId,
  stampConfirmedParcelUrl,
} from './mapConfig';

interface FakeWindow {
  location: { search: string; pathname: string; hash: string; href: string };
  history: { replaceState: (...args: unknown[]) => void; state: unknown };
}

// mapConfig.ts is a thin shim over @aireon/shared/url-params
// (URL_PARAMS_STANDARD.md). That module parses `location.search` ONCE and
// caches the result for the page's lifetime, so every test must stub a fresh
// `window` AND reset the shared cache — otherwise the first test's parse wins
// for the whole file. `href` is required too: the shared writer builds on
// `new URL(window.location.href)` rather than hand-rolling the query string.
function stubWindow(overrides: Partial<Omit<FakeWindow['location'], 'href'>> = {}): FakeWindow {
  const search = overrides.search ?? '';
  const pathname = overrides.pathname ?? '/';
  const hash = overrides.hash ?? '';
  const fake: FakeWindow = {
    location: { search, pathname, hash, href: `https://room.aireon.ch${pathname}${search}${hash}` },
    history: { replaceState: vi.fn(), state: null },
  };
  vi.stubGlobal('window', fake as unknown as Window & typeof globalThis);
  __resetUrlStateForTests();
  return fake;
}

const lastUrl = (fake: FakeWindow): string => {
  const calls = (fake.history.replaceState as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1][2] as string;
};

const lastParams = (fake: FakeWindow): URLSearchParams =>
  new URLSearchParams(lastUrl(fake).split('?')[1]);

afterEach(() => {
  vi.unstubAllGlobals();
  __resetUrlStateForTests();
});

// Selecting a parcel is a location CONFIRMATION, so it must reach the address
// bar: the URL is what the user copies, and it is verbatim what the navbar's
// "Share this view" button puts on the clipboard. Before this contract a click
// wrote nothing at all — a click does not move the camera, so the `moveend`
// writer never fired — and a shared link opened on a bare map.
describe('stampConfirmedParcelUrl', () => {
  it('writes the parcel identity, label and camera so the link reproduces the selection', () => {
    const fake = stubWindow({ search: '?lat=47.1&lng=8.1&zoom=12' });
    stampConfirmedParcelUrl({
      lat: 47.376888,
      lng: 8.541694,
      zoom: 18.5,
      label: 'Nüschelerstrasse 30 8001 Zürich',
      egrid: 'CH807306144108',
    });
    const params = lastParams(fake);
    expect(params.get('lat')).toBe('47.376888');
    expect(params.get('lng')).toBe('8.541694');
    expect(params.get('zoom')).toBe('18.50');
    expect(params.get('egrid')).toBe('CH807306144108');
    expect(params.get('q')).toBe('Nüschelerstrasse 30 8001 Zürich');
  });

  // ~25% of an urban tile is addressless (courtyards, roads, unbuilt land) and
  // fullParcelAddress returns null for those. An empty ?q= would claim a label
  // the parcel does not have; ?egrid= alone still identifies it.
  it('omits the label for an addressless parcel instead of writing an empty one', () => {
    const fake = stubWindow({ search: '' });
    stampConfirmedParcelUrl({ lat: 47.5, lng: 8.9, zoom: 17, label: null, egrid: 'CH899977779164' });
    const params = lastParams(fake);
    expect(params.has('q')).toBe(false);
    expect(params.get('egrid')).toBe('CH899977779164');
    expect(params.get('lat')).toBe('47.500000');
  });

  // Coordinates always ride along: the deep-link auto-select only runs when the
  // URL has ?lat/?lng, so an egrid-only link would restore nothing.
  it('always writes coordinates alongside the identity', () => {
    const fake = stubWindow({ search: '' });
    stampConfirmedParcelUrl({ lat: 47.5, lng: 8.9, zoom: 17, label: 'A 1', egrid: 'CH1' });
    const params = lastParams(fake);
    expect(params.get('lat')).toBe('47.500000');
    expect(params.get('lng')).toBe('8.900000');
  });

  // Selecting a second parcel must not leave the first one's identity behind: a
  // stale egrid outranks the coordinates on read, so the link would restore the
  // WRONG parcel (URL_PARAMS_STANDARD.md, "Address precedence").
  it('replaces a previous selection instead of accumulating identities', () => {
    const fake = stubWindow({ search: '?lat=47.1&lng=8.1&egrid=CH000000000000&q=Old+Street+1' });
    stampConfirmedParcelUrl({
      lat: 47.2,
      lng: 8.2,
      zoom: 17,
      label: 'New Street 2',
      egrid: 'CH999999999999',
    });
    const params = lastParams(fake);
    expect(params.getAll('egrid')).toEqual(['CH999999999999']);
    expect(params.getAll('q')).toEqual(['New Street 2']);
  });

  // `address` is the legacy alias of `q` and the reader is firstOf('q','address'),
  // so a stale alias left in place would out-rank the label just written.
  it('drops the legacy ?address= alias so the label it just wrote is the one read back', () => {
    const fake = stubWindow({ search: '?address=Stale+Label' });
    stampConfirmedParcelUrl({ lat: 47.2, lng: 8.2, zoom: 17, label: 'Fresh Label', egrid: null });
    const params = lastParams(fake);
    expect(params.has('address')).toBe(false);
    expect(params.get('q')).toBe('Fresh Label');
  });

  it('preserves unrelated params so mode/theme/lang/basemap survive a selection', () => {
    const fake = stubWindow({ search: '?mode=embed&theme=dark&lang=de&basemap=aerial', hash: '#x' });
    stampConfirmedParcelUrl({ lat: 47.2, lng: 8.2, zoom: 17, label: 'A 1', egrid: 'CH1' });
    const url = lastUrl(fake);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('mode')).toBe('embed');
    expect(params.get('theme')).toBe('dark');
    expect(params.get('lang')).toBe('de');
    expect(params.get('basemap')).toBe('aerial');
    expect(url.endsWith('#x')).toBe(true);
  });

  // replaceState, never pushState: repeated selections must not turn Back into
  // a selection replay stack. The self-written marker is what lets the shared
  // parser tell an external deep link from the app's own write.
  it('replaces the history entry and marks the write as self-written', () => {
    const fake = stubWindow({ search: '' });
    stampConfirmedParcelUrl({ lat: 47.2, lng: 8.2, zoom: 17, label: 'A 1', egrid: 'CH1' });
    const calls = (fake.history.replaceState as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toMatchObject({ aireonSelfWritten: true });
  });

  it('never throws when history.replaceState is blocked', () => {
    const fake = stubWindow({ search: '' });
    fake.history.replaceState = () => {
      throw new Error('replaceState blocked');
    };
    expect(() =>
      stampConfirmedParcelUrl({ lat: 47.5, lng: 8.9, zoom: 17, label: 'A', egrid: 'CH1' }),
    ).not.toThrow();
  });
});

describe('clearConfirmedParcelUrl', () => {
  // Closing the panel must retract the claim. Otherwise the URL — and every
  // "Share this view" link built from it — keeps naming a parcel that is not on
  // screen, and reloading re-opens a panel the user just dismissed.
  it('drops every parcel identifier and the label but keeps the camera', () => {
    const fake = stubWindow({
      search: '?lat=47.1&lng=8.1&zoom=18&egrid=CH123&q=Some+Street+1&parcel_id=456',
    });
    clearConfirmedParcelUrl({ lat: 47.3, lng: 8.3, zoom: 16 });
    const params = lastParams(fake);
    expect(params.has('egrid')).toBe(false);
    expect(params.has('parcel_id')).toBe(false);
    expect(params.has('q')).toBe(false);
    expect(params.has('address')).toBe(false);
    expect(params.get('lat')).toBe('47.300000');
    expect(params.get('lng')).toBe('8.300000');
    expect(params.get('zoom')).toBe('16.00');
  });

  it('also clears the uppercase ?EGRID= spelling', () => {
    const fake = stubWindow({ search: '?lat=47.1&lng=8.1&EGRID=CH123' });
    clearConfirmedParcelUrl({ lat: 47.3, lng: 8.3, zoom: 16 });
    const params = lastParams(fake);
    expect(params.has('EGRID')).toBe(false);
    expect(params.has('egrid')).toBe(false);
  });

  it('leaves unrelated view params alone', () => {
    const fake = stubWindow({ search: '?lat=47.1&lng=8.1&egrid=CH123&mode=kiosk&lang=de' });
    clearConfirmedParcelUrl({ lat: 47.3, lng: 8.3, zoom: 16 });
    const params = lastParams(fake);
    expect(params.get('mode')).toBe('kiosk');
    expect(params.get('lang')).toBe('de');
  });
});

// Read-back: room only writes ?egrid= because it also honors it on load. When
// several polygons stack under the deep-link point, the id names which one the
// sender meant instead of leaving it to whichever feature MapLibre returns first.
describe('getDeepLinkParcelId', () => {
  it('reports the ?egrid= an inbound link carries', () => {
    stubWindow({ search: '?lat=47.1&lng=8.1&egrid=CH807306144108' });
    expect(getDeepLinkParcelId()).toBe('CH807306144108');
  });

  it('accepts the uppercase ?EGRID= alias other suite surfaces emit', () => {
    stubWindow({ search: '?lat=47.1&lng=8.1&EGRID=CH807306144108' });
    expect(getDeepLinkParcelId()).toBe('CH807306144108');
  });

  it('falls back to ?parcel_id= when no egrid is present', () => {
    stubWindow({ search: '?lat=47.1&lng=8.1&parcel_id=CH899977779164' });
    expect(getDeepLinkParcelId()).toBe('CH899977779164');
  });

  it('is null for a bare camera link, so the hit test keeps its top hit', () => {
    stubWindow({ search: '?lat=47.1&lng=8.1&zoom=18' });
    expect(getDeepLinkParcelId()).toBeNull();
  });
});

import { isValidElement, type ReactElement } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let LoadingFeedback: unknown;
let MarketSkeleton: unknown;
type BoundaryElement = ReactElement<{ skeleton: ReactElement<{ className: string }> }>;
type OverlayHostElement = ReactElement<{ className: string; children: BoundaryElement; 'data-screenshot-ignore': string }>;
let MarketDataLoadingFeedback: (props: { darkMode: boolean }) => BoundaryElement;
let createScreenshotLoadingFeedback: (label: string) => OverlayHostElement;

beforeAll(async () => {
  const storage = { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: () => null, length: 0 };
  vi.stubGlobal('window', { localStorage: storage, location: { href: 'http://localhost/', origin: 'http://localhost' } });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  ({ LoadingFeedback } = await import('@aireon/shared'));
  ({ MarketDataLoadingFeedback, MarketSkeleton } = await import('../MarketDataSection'));
  ({ createScreenshotLoadingFeedback } = await import('../ScreenshotFeedback'));
});

describe('MarketDataLoadingFeedback', () => {
  it('keeps the complete market-data skeleton behind the shared policy boundary', () => {
    const element = MarketDataLoadingFeedback({ darkMode: true });

    expect(element.type).toBe(LoadingFeedback);
    expect(isValidElement(element.props.skeleton)).toBe(true);
    expect(element.props.skeleton.type).toBe(MarketSkeleton);
  });

  it('keeps the capture overlay fixed outside the shared relative feedback layer', () => {
    const host = createScreenshotLoadingFeedback('Creating image…');
    const feedback = host.props.children;

    expect(host.props['data-screenshot-ignore']).toBe('true');
    expect(host.props.className).toContain('fixed inset-0');
    expect(host.props.className).toContain('pointer-events-none');
    expect(feedback.type).toBe(LoadingFeedback);
    expect(feedback.props.skeleton.props.className).toContain('fixed inset-0');
    expect(feedback.props.skeleton.props.className).toContain('pointer-events-auto');
  });
});

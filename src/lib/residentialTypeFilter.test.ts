import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RESIDENTIAL_TYPE_FILTER,
  RESIDENTIAL_TYPE_FILTERS,
  RESIDENTIAL_TYPE_STORAGE_KEY,
  loadResidentialTypeFilter,
  residentialTypeCondition,
} from './residentialTypeFilter';

afterEach(() => vi.unstubAllGlobals());

describe('residentialTypeCondition', () => {
  it('returns no residential condition for all', () => {
    expect(residentialTypeCondition('all')).toBeNull();
  });

  it('partitions values below two into single-unit', () => {
    expect(residentialTypeCondition('single-unit')).toEqual([
      '<',
      ['to-number', ['get', 'bldg_flats'], 0],
      2,
    ]);
  });

  it('partitions values of two or more into multi-unit', () => {
    expect(residentialTypeCondition('multi-unit')).toEqual([
      '>=',
      ['to-number', ['get', 'bldg_flats'], 0],
      2,
    ]);
  });

  it('exposes the three canonical modes in UI order', () => {
    expect(RESIDENTIAL_TYPE_FILTERS).toEqual(['all', 'single-unit', 'multi-unit']);
  });
});

describe('loadResidentialTypeFilter', () => {
  it('defaults to All without a browser', () => {
    expect(loadResidentialTypeFilter()).toBe(DEFAULT_RESIDENTIAL_TYPE_FILTER);
    expect(loadResidentialTypeFilter()).toBe('all');
  });

  it.each(['all', 'single-unit', 'multi-unit'] as const)(
    'restores persisted %s without rewriting it',
    (stored) => {
      const setItem = vi.fn();
      vi.stubGlobal('window', {
        localStorage: { getItem: () => stored, setItem },
      } as unknown as Window & typeof globalThis);
      expect(loadResidentialTypeFilter()).toBe(stored);
      expect(setItem).not.toHaveBeenCalled();
    },
  );

  it('ignores the pre-All preference namespace so returning users reset to All once', () => {
    const getItem = vi.fn((key: string) =>
      key === 'room:residentialTypeFilter' ? 'single-unit' : null,
    );
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      localStorage: { getItem, setItem },
    } as unknown as Window & typeof globalThis);

    expect(loadResidentialTypeFilter()).toBe('all');
    expect(RESIDENTIAL_TYPE_STORAGE_KEY).toBe('room:residentialTypeFilter:v2');
    expect(getItem).toHaveBeenCalledWith(RESIDENTIAL_TYPE_STORAGE_KEY);
    expect(getItem).not.toHaveBeenCalledWith('room:residentialTypeFilter');
  });

  it.each([
    ['apartments', 'multi-unit'],
    ['houses', 'single-unit'],
    ['none', 'all'],
    ['unexpected', 'all'],
  ] as const)('migrates %s to %s', (legacy, expected) => {
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => legacy,
        setItem,
      },
    } as unknown as Window & typeof globalThis);
    expect(loadResidentialTypeFilter()).toBe(expected);
    expect(setItem).toHaveBeenCalledWith(RESIDENTIAL_TYPE_STORAGE_KEY, expected);
  });

  it('uses All for missing storage without creating a saved preference', () => {
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null, setItem },
    } as unknown as Window & typeof globalThis);
    expect(loadResidentialTypeFilter()).toBe('all');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('keeps the migrated choice when canonical storage is read-only', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'apartments',
        setItem: () => { throw new Error('read-only'); },
      },
    } as unknown as Window & typeof globalThis);
    expect(loadResidentialTypeFilter()).toBe('multi-unit');
  });

  it('falls back to All when reading storage throws', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('blocked'); },
      },
    } as unknown as Window & typeof globalThis);
    expect(loadResidentialTypeFilter()).toBe('all');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RESIDENTIAL_TYPE_FILTER,
  RESIDENTIAL_TYPE_FILTERS,
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
  it('defaults to single-unit without a browser', () => {
    expect(loadResidentialTypeFilter()).toBe(DEFAULT_RESIDENTIAL_TYPE_FILTER);
    expect(loadResidentialTypeFilter()).toBe('single-unit');
  });

  it.each([
    ['apartments', 'multi-unit'],
    ['none', 'single-unit'],
    ['all', 'all'],
    ['houses', 'single-unit'],
    ['unexpected', 'single-unit'],
  ])('migrates %s to %s', (legacy, expected) => {
    let stored = legacy;
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => { stored = value; },
      },
    } as unknown as Window & typeof globalThis);
    expect(loadResidentialTypeFilter()).toBe(expected);
    expect(stored).toBe(expected);
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
});

import { describe, it, expect } from 'vitest';
import { percentileOfValue, linearRegression } from './statsMath';

describe('percentileOfValue', () => {
  it('ranks a value as the share of the distribution strictly below it', () => {
    expect(percentileOfValue([10, 20, 30, 40], 25)).toBe(50);
    expect(percentileOfValue([10, 20, 30, 40], 5)).toBe(0);
    expect(percentileOfValue([10, 20, 30, 40], 100)).toBe(100);
  });
  it('is safe on empty / non-finite input', () => {
    expect(percentileOfValue([], 5)).toBe(0);
    expect(percentileOfValue([1, 2, 3], Number.NaN)).toBe(0);
  });
});

describe('linearRegression', () => {
  it('recovers a perfect line', () => {
    const { slope, intercept, r2 } = linearRegression([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(slope).toBeCloseTo(2, 6);
    expect(intercept).toBeCloseTo(0, 6);
    expect(r2).toBeCloseTo(1, 6);
  });
  it('degrades safely on too-few points', () => {
    const r = linearRegression([1], [5]);
    expect(r.r2).toBe(0);
  });
});

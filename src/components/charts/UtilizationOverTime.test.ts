import { describe, it, expect } from 'vitest';
import { orderAgeCohorts } from './UtilizationOverTime';
import type { ZoneStatsResponse } from '../../services/zoneStatsService';

type AgeCohorts = ZoneStatsResponse['age_cohorts'];

// Build the cohorts in the DEFECT order (60 / 40 / 20 / ALL) so the test
// proves orderAgeCohorts re-orders them rather than preserving the order it
// happens to receive.
const cohorts: AgeCohorts = {
  last60: { cohort_label: '60', mean_ratio_v: 0.6, n: 60 },
  last40: { cohort_label: '40', mean_ratio_v: 0.5, n: 40 },
  last20: { cohort_label: '20', mean_ratio_v: 0.4, n: 20 },
  now: { cohort_label: 'ALL', mean_ratio_v: 0.3, n: 100 },
};

describe('orderAgeCohorts', () => {
  it('orders cohorts as ALL (now) then ascending 20 / 40 / 60', () => {
    const ordered = orderAgeCohorts(cohorts);
    expect(ordered.map((c) => c.cohort)).toEqual([
      'now',
      'last20',
      'last40',
      'last60',
    ]);
  });

  it('keeps each cohort label aligned with the ascending window order', () => {
    const ordered = orderAgeCohorts(cohorts);
    expect(ordered.map((c) => c.cohort_label)).toEqual(['ALL', '20', '40', '60']);
  });

  it('carries the cohort payload through unchanged', () => {
    const ordered = orderAgeCohorts(cohorts);
    expect(ordered[0]).toMatchObject({
      cohort: 'now',
      cohort_label: 'ALL',
      mean_ratio_v: 0.3,
      n: 100,
    });
  });
});

import type {
  ZoneAgeCohort,
  ZoneStatsResponse,
} from '../../services/zoneStatsService';

type AgeCohorts = ZoneStatsResponse['age_cohorts'];
type CohortKey = keyof AgeCohorts;

// The chart reads from the current all-zone snapshot into increasingly older
// age windows, regardless of the raw object key order returned by the API.
const COHORT_ORDER: CohortKey[] = ['now', 'last20', 'last40', 'last60'];

export function orderAgeCohorts(
  ageCohorts: AgeCohorts,
): Array<ZoneAgeCohort & { cohort: CohortKey }> {
  return COHORT_ORDER.map((cohort) => ({ ...ageCohorts[cohort], cohort }));
}

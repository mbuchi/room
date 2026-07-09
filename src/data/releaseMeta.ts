// Small static metadata module read by always-mounted chrome (navbar /
// account-menu version badge). It deliberately holds ONLY scalars so the big
// RELEASES array in ./releaseNotes never ships in the entry bundle — the full
// changelog data is code-split and loaded lazily when the user opens What's New.
// Keep CURRENT_VERSION in sync with the newest entry in ./releaseNotes.
export const CURRENT_VERSION = '0.17.2';
export const REPO_URL = 'https://github.com/mbuchi/room';

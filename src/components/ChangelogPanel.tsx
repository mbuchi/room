import { ReleaseNotesPanel, type Locale } from '@aireon/shared';
import { RELEASES } from '../data/releaseNotes';
import { REPO_URL } from '../data/releaseMeta';

// Lazy boundary for the changelog. This module statically imports the large
// RELEASES array, so when it is loaded via React.lazy/import() the bundler
// splits RELEASES into this component's async chunk — keeping it out of the
// always-mounted navbar's entry bundle.
interface ChangelogPanelProps {
  onClose: () => void;
  locale: Locale;
}

const ChangelogPanel = ({ onClose, locale }: ChangelogPanelProps) => (
  <ReleaseNotesPanel
    onClose={onClose}
    locale={locale}
    releases={RELEASES}
    repoUrl={REPO_URL}
    brandPrefix="r"
    brandSuffix="m"
  />
);

export default ChangelogPanel;

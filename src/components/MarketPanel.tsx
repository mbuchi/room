import type { ReactNode } from 'react';
import type { ParcelData } from '../services/parcelDataService';
import MarketDataSection from './MarketDataSection';
import { PanelEmpty, PanelScroll } from './PanelKit';
import { useI18n } from '../contexts/I18nContext';

/**
 * "Market" tab — city-level RealAdvisor figures (rent + buy, apartments +
 * houses) for the municipality the selected parcel sits in.
 *
 * This used to be one card buried between the parcel's Age section and the
 * ratio cards, where a reader scanning the zoning numbers had to scroll past it
 * and a reader looking for prices had no idea it existed. As its own level-1
 * tab it is discoverable and, because the tab body only mounts on selection,
 * `/api/city-market` is no longer fetched for users who never look at it.
 *
 * `MarketDataSection` is self-fetching and hides itself when the parcel has no
 * BFS and no municipality name, so this shell supplies the "no data" line for
 * that case rather than rendering an empty tab.
 */
const MarketPanel = ({
  parcelData,
  darkMode = true,
  actionsSlot,
}: {
  parcelData: ParcelData | null;
  darkMode?: boolean;
  actionsSlot?: ReactNode;
}) => {
  const { t } = useI18n();
  const bfs = parcelData?.fso ?? null;
  const cityName = parcelData?.municipality_name ?? null;
  const hasTarget = (bfs != null && Number.isFinite(bfs)) || !!cityName;

  return (
    <PanelScroll actionsSlot={actionsSlot}>
      {hasTarget ? (
        <MarketDataSection bfs={bfs} cityName={cityName} darkMode={darkMode} />
      ) : (
        <PanelEmpty>{t('panel.market.empty')}</PanelEmpty>
      )}
    </PanelScroll>
  );
};

export default MarketPanel;

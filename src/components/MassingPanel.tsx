import type { ReactNode } from 'react';
import type * as GeoJSON from 'geojson';
import { BuildableMassingSection } from '@aireon/shared';
import type { ParcelData } from '../services/parcelDataService';
import type { FocusedParcelHandle } from './ZoneInfoPanel';
import { PanelEmpty, PanelScroll } from './PanelKit';
import { useI18n } from '../contexts/I18nContext';

/**
 * "Massing" tab — the shared 3D buildable-massing simulator.
 *
 * It used to sit at the bottom of the parcel-facts scroll, which made the
 * app's densest single feature the thing you found by accident after the ratio
 * cards — and, because it was always mounted, every parcel click paid for a
 * second MapLibre instance and a RES `spare_space` lookup whether or not
 * anyone scrolled that far. MapView lazy-loads this module, so that work now
 * happens only when the tab is opened.
 *
 * `BuildableMassingSection` is self-contained (own i18n, own fetch) and renders
 * nothing when it has neither polygon geometry nor a spare_space candidate, so
 * the shell supplies the "no data" line for that case.
 */
const MassingPanel = ({
  parcelData,
  focusedParcel,
  geometry,
  darkMode = true,
  actionsSlot,
}: {
  parcelData: ParcelData | null;
  focusedParcel: FocusedParcelHandle | null;
  geometry: GeoJSON.Geometry | null;
  darkMode?: boolean;
  actionsSlot?: ReactNode;
}) => {
  const { t, locale } = useI18n();

  const lng = focusedParcel?.lng ?? null;
  const lat = focusedParcel?.lat ?? null;
  const egrid = parcelData?.egrid ?? parcelData?.parcel_id ?? focusedParcel?.parcelId ?? null;
  const hasTarget = !!geometry || (lng != null && lat != null);

  return (
    <PanelScroll actionsSlot={actionsSlot} padded={false}>
      {hasTarget ? (
        <BuildableMassingSection
          dark={darkMode}
          locale={locale}
          geometry={geometry}
          areaM2={Number(parcelData?.parcel_area) || null}
          egrid={egrid ?? undefined}
          lngLat={lng != null && lat != null ? [lng, lat] : undefined}
          className="px-4 py-3"
        />
      ) : (
        <PanelEmpty>{t('panel.massing.empty')}</PanelEmpty>
      )}
    </PanelScroll>
  );
};

export default MassingPanel;

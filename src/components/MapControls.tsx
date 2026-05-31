import type { CSSProperties } from 'react';
import { Layers, Map, Box } from 'lucide-react';
import { basemapOptions } from '../lib/mapConfig';
import { useI18n } from '../contexts/I18nContext';

// Map basemap option ids → i18n keys. Falls back to the English name from
// mapConfig if a key is missing.
const BASEMAP_KEY: Record<string, string> = {
  dark: 'panel.basemap.dark',
  streets: 'panel.basemap.streets',
  satellite: 'panel.basemap.satellite',
  'satellite-streets': 'panel.basemap.satellite_streets',
  light: 'panel.basemap.light',
  outdoors: 'panel.basemap.outdoors',
  'navigation-day': 'panel.basemap.navigation_day',
  'navigation-night': 'panel.basemap.navigation_night',
};

interface MapControlsProps {
  selectedBasemap: string;
  isBasemapMenuOpen: boolean;
  onToggleBasemapMenu: () => void;
  onBasemapChange: (id: string) => void;
  parcelOpacity: number;
  onParcelOpacityChange: (value: number) => void;
  buildingOpacity: number;
  onBuildingOpacityChange: (value: number) => void;
  is3DMode: boolean;
  onToggle3D: () => void;
  panelOpen: boolean;
  /** Right-edge offset in pixels for md+ when the panel is open. */
  rightOffsetPx?: number | null;
}

const MapControls = ({
  selectedBasemap,
  isBasemapMenuOpen,
  onToggleBasemapMenu,
  onBasemapChange,
  parcelOpacity,
  onParcelOpacityChange,
  buildingOpacity,
  onBuildingOpacityChange,
  is3DMode,
  onToggle3D,
  panelOpen,
  rightOffsetPx = null,
}: MapControlsProps) => {
  const { t } = useI18n();
  const selected = basemapOptions.find((b) => b.id === selectedBasemap);
  const basemapLabel = (id: string, fallback: string) => {
    const key = BASEMAP_KEY[id];
    if (!key) return fallback;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const selectedLabel = selected
    ? basemapLabel(selected.id, selected.name)
    : t('panel.basemap.fallback');
  return (
    <>
      <div className="absolute top-[72px] left-4 z-10" data-tour="layer-controls">
        <div className="rounded-lg shadow-lg overflow-hidden bg-gray-900/90 backdrop-blur-sm border border-gray-700/50">
          <button
            onClick={onToggleBasemapMenu}
            className="flex items-center gap-2.5 px-4 py-3 transition-colors w-full text-left font-medium text-gray-200 hover:bg-gray-800/80"
          >
            <Layers size={16} className="text-gray-400" />
            <span className="text-sm">
              {selectedLabel}
            </span>
            <svg
              className={`w-4 h-4 ml-auto transition-transform text-gray-500 ${isBasemapMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isBasemapMenuOpen && (
            <div className="border-t border-gray-700/50 max-h-72 overflow-y-auto">
              {basemapOptions.map((basemap) => (
                <button
                  key={basemap.id}
                  onClick={() => onBasemapChange(basemap.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    selectedBasemap === basemap.id
                      ? 'bg-red-600/20 text-red-400 font-medium'
                      : 'text-gray-300 hover:bg-gray-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Map size={14} className="opacity-60" />
                    <span>{basemapLabel(basemap.id, basemap.name)}</span>
                    {selectedBasemap === basemap.id && (
                      <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute top-[72px] z-10 transition-[right] duration-300 right-4 md:[right:var(--md-right,1rem)]"
        style={
          (panelOpen && rightOffsetPx != null
            ? ({ '--md-right': `${rightOffsetPx}px` } as CSSProperties & Record<string, string>)
            : undefined)
        }
      >
        <div className="rounded-lg shadow-lg p-4 min-w-[240px] bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{t('panel.layers.parcel')}</span>
              <span className="text-[10px] font-semibold text-red-400 tabular-nums">{Math.round(parcelOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={parcelOpacity}
              onChange={(e) => onParcelOpacityChange(parseFloat(e.target.value))}
              aria-label={t('panel.layers.parcel')}
              className="w-full slider-groove"
            />
          </div>

          <div className="border-t border-gray-700/40 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{t('panel.layers.building')}</span>
              <span className="text-[10px] font-semibold text-red-400 tabular-nums">{Math.round(buildingOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={buildingOpacity}
              onChange={(e) => onBuildingOpacityChange(parseFloat(e.target.value))}
              aria-label={t('panel.layers.building')}
              className="w-full slider-groove"
            />
          </div>

          <div className="border-t border-gray-700/40 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-300">{t('panel.layers.3d_view')}</span>
              </div>
              <button
                onClick={onToggle3D}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                  is3DMode ? 'bg-red-600' : 'bg-gray-600'
                }`}
                role="switch"
                aria-checked={is3DMode}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    is3DMode ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapControls;

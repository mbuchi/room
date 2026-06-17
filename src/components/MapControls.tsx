import type { CSSProperties } from 'react';
import { Box } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface MapControlsProps {
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
  return (
    <>
      <div
        className="absolute aireon-map-control-top aireon-z-map-control transition-[right] duration-300 aireon-map-control-right md:[right:var(--md-right,1rem)]"
        style={
          (panelOpen && rightOffsetPx != null
            ? ({ '--md-right': `${rightOffsetPx}px` } as CSSProperties & Record<string, string>)
            : undefined)
        }
      >
        <div className="rounded-lg shadow-lg p-4 min-w-[240px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('panel.layers.parcel')}</span>
              <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 tabular-nums">{Math.round(parcelOpacity * 100)}%</span>
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

          <div className="border-t border-gray-200 dark:border-gray-700/40 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('panel.layers.building')}</span>
              <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 tabular-nums">{Math.round(buildingOpacity * 100)}%</span>
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

          <div className="border-t border-gray-200 dark:border-gray-700/40 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-gray-400 dark:text-gray-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('panel.layers.3d_view')}</span>
              </div>
              <button
                onClick={onToggle3D}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                  is3DMode ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'
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

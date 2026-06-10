import type { CSSProperties } from 'react';
import { Plus, Minus, Compass } from 'lucide-react';
import type { Map } from 'maplibre-gl';
import { useI18n } from '../contexts/I18nContext';

interface ZoomControlProps {
  getMap: () => Map | null;
  isDarkMode: boolean;
  className?: string;
  /** Pixel offset from the right edge. `null` keeps the default `right-4`. Ignored when `align="left"`. */
  rightOffsetPx?: number | null;
  /** Which edge to pin the control to. Defaults to `'right'`. */
  align?: 'left' | 'right';
}

const ZoomControl = ({ getMap, isDarkMode, className = '', rightOffsetPx = null, align = 'right' }: ZoomControlProps) => {
  const { t } = useI18n();
  const handleZoomIn = () => getMap()?.zoomIn({ duration: 250 });
  const handleZoomOut = () => getMap()?.zoomOut({ duration: 250 });
  const handleResetNorth = () => getMap()?.easeTo({ bearing: 0, pitch: 0, duration: 500 });

  const panel = isDarkMode
    ? 'bg-slate-900/95 border-slate-700/60 text-slate-200'
    : 'bg-white/95 border-slate-200/80 text-slate-700';
  const hover = isDarkMode
    ? 'hover:bg-slate-800/70 hover:text-emerald-400 active:bg-slate-800'
    : 'hover:bg-slate-50 hover:text-sky-600 active:bg-slate-100';
  const divider = isDarkMode ? 'border-slate-700/60' : 'border-slate-200/80';

  // On md+ the room panel takes up the right edge, so we shift via the
  // `--md-right` CSS var (consumed by the wrapper's md:[right:var(...)] class).
  // Below md the wrapper's `right-4` keeps controls usable on phones. We set
  // ONLY the var here — an inline `right` would beat the md: class and pin the
  // control in place even when the panel opens.
  const isLeft = align === 'left';
  const offsetStyle: CSSProperties | undefined =
    !isLeft && rightOffsetPx != null
      ? ({ '--md-right': `${rightOffsetPx}px` } as CSSProperties & Record<string, string>)
      : undefined;

  // Left-pinned controls sit on the opposite edge from the right-side info
  // panel, so they need no panel-clearing offset. Right-pinned controls keep
  // the `--md-right` shift behaviour described above.
  const edgeClass = isLeft ? 'left-4' : 'right-4 md:[right:var(--md-right,1rem)]';

  return (
    <div
      className={`absolute z-10 ${edgeClass} ${className}`}
      style={offsetStyle}
    >
      <div className={`flex flex-col rounded-xl shadow-xl backdrop-blur-sm border overflow-hidden ${panel}`}>
        <button type="button" onClick={handleZoomIn} aria-label={t('panel.zoom.in')} title={t('panel.zoom.in')} className={`w-9 h-9 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${hover}`}>
          <Plus size={16} strokeWidth={2.25} />
        </button>
        <div className={`border-t ${divider}`} />
        <button type="button" onClick={handleZoomOut} aria-label={t('panel.zoom.out')} title={t('panel.zoom.out')} className={`w-9 h-9 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${hover}`}>
          <Minus size={16} strokeWidth={2.25} />
        </button>
        <div className={`border-t ${divider}`} />
        <button type="button" onClick={handleResetNorth} aria-label={t('panel.zoom.reset_north')} title={t('panel.zoom.reset_north')} className={`w-9 h-9 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${hover}`}>
          <Compass size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default ZoomControl;

import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface ZoneOption {
  cz_local: string;
  parcel_count: number;
}

interface ZoneSelectorDropdownProps {
  currentCzLocal: string;
  otherZones: ZoneOption[];
  onChange: (cz_local: string) => void;
  /** Optional UI hint while a new zone is being fetched. */
  isLoading?: boolean;
}

/**
 * Searchable dropdown listing the current zoning category at the top with
 * every other zone in the same FSO underneath. Used by ZonePanel to switch
 * the chart context without re-fetching parcel data — the map's
 * `feature-state` is repainted off the selected zone's parcels[].
 *
 * The municipality-wide list can run 20+ items so the filter input stays
 * visible whenever the menu is open.
 */
const ZoneSelectorDropdown = ({
  currentCzLocal,
  otherZones,
  onChange,
  isLoading = false,
}: ZoneSelectorDropdownProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return otherZones;
    return otherZones.filter((z) => z.cz_local.toLowerCase().includes(q));
  }, [otherZones, query]);

  const selectedCount =
    otherZones.find((z) => z.cz_local === currentCzLocal)?.parcel_count ?? null;

  return (
    <div ref={wrapperRef} className="relative" data-tour="zone-selector">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-900/80 border border-gray-700/60 hover:border-red-500/40 transition-colors text-left disabled:opacity-60"
      >
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
            {t('panel.zone.zoning_category')}
          </p>
          <p className="mt-0.5 text-sm font-mono text-gray-100 truncate">
            {currentCzLocal || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedCount != null && (
            <span className="text-[10px] text-gray-500 font-mono">{t('panel.zone.parcels_suffix', { count: selectedCount })}</span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 left-0 right-0 rounded-lg bg-gray-900 border border-gray-700/70 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
            <Search size={12} className="text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('panel.zone.filter_zones_placeholder')}
              aria-label={t('panel.zone.filter_zones_placeholder')}
              className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-500">{t('panel.zone.no_matching_zones')}</p>
            )}
            {filtered.map((z) => {
              const active = z.cz_local === currentCzLocal;
              return (
                <button
                  key={z.cz_local}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    if (z.cz_local !== currentCzLocal) onChange(z.cz_local);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? 'bg-red-600/15 text-red-300'
                      : 'text-gray-300 hover:bg-gray-800/80'
                  }`}
                >
                  <span className="font-mono truncate">{z.cz_local}</span>
                  <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                    {z.parcel_count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneSelectorDropdown;

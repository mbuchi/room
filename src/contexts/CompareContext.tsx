// "Compare parcels" lets the user pin 2 or 3 parcels into a comparison
// tray that lives at the bottom of the map. Pinned parcels are stored in
// localStorage so the tray survives a refresh.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface CompareParcel {
  /** Stable parcel ID (parcel_id, egrid, or composite fallback). */
  id: string;
  /** Human-readable label — address or municipality fallback. */
  label: string;
  lng: number;
  lat: number;
  properties: Record<string, unknown>;
  enrichment?: {
    city?: string;
    postalCode?: string;
    constructionZone?: string;
  } | null;
  /** ISO timestamp the parcel was added to the tray. */
  addedAt: string;
}

export const MAX_COMPARE = 3;

interface CompareContextValue {
  parcels: CompareParcel[];
  has: (id: string) => boolean;
  add: (parcel: CompareParcel) => 'added' | 'full' | 'duplicate';
  remove: (id: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (next: boolean) => void;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

const STORAGE_KEY = 'room:compare';

function loadParcels(): CompareParcel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is CompareParcel =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as CompareParcel).id === 'string' &&
        typeof (p as CompareParcel).lat === 'number' &&
        typeof (p as CompareParcel).lng === 'number',
    );
  } catch {
    return [];
  }
}

function persist(parcels: CompareParcel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parcels));
  } catch {
    /* quota exceeded or storage disabled — silent */
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [parcels, setParcels] = useState<CompareParcel[]>(loadParcels);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    persist(parcels);
  }, [parcels]);

  const has = useCallback(
    (id: string) => parcels.some((p) => p.id === id),
    [parcels],
  );

  const add = useCallback<CompareContextValue['add']>(
    (parcel) => {
      if (parcels.some((p) => p.id === parcel.id)) return 'duplicate';
      if (parcels.length >= MAX_COMPARE) return 'full';
      setParcels((list) => [...list, parcel]);
      return 'added';
    },
    [parcels],
  );

  const remove = useCallback((id: string) => {
    setParcels((list) => list.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => {
    setParcels([]);
    setOpen(false);
  }, []);

  return (
    <CompareContext.Provider value={{ parcels, has, add, remove, clear, open, setOpen }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within a CompareProvider');
  return ctx;
}

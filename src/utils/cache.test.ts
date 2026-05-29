import { describe, it, expect, afterEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDBCache } from './cache';

const realIndexedDB = (globalThis as { indexedDB?: unknown }).indexedDB;

afterEach(() => {
  (globalThis as { indexedDB?: unknown }).indexedDB = realIndexedDB;
  vi.restoreAllMocks();
});

describe('IndexedDBCache — must never hang the caller', () => {
  it('returns null / no-ops when indexedDB is unavailable', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
    const c = new IndexedDBCache<{ x: number }>('no-idb', 'store');
    expect(await c.get('k')).toBeNull();
    await expect(c.set('k', { x: 1 })).resolves.toBeUndefined();
  });

  it('does NOT hang when an upgrade is blocked (the v1→v2 regression)', async () => {
    // Simulate a blocked upgrade: open() returns a request that only ever
    // fires `onblocked` (an old-version connection is held in another tab).
    // Before the fix this left openDB pending forever, hanging the data fetch.
    const open = vi.fn(() => {
      const req: Record<string, ((...a: unknown[]) => void) | null> = {
        onblocked: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      setTimeout(() => req.onblocked && req.onblocked(), 0);
      return req as unknown as IDBOpenDBRequest;
    });
    (globalThis as { indexedDB?: unknown }).indexedDB = { open } as unknown as IDBFactory;

    const c = new IndexedDBCache<{ x: number }>('blocked-db', 'store');
    // These must RESOLVE quickly, not hang.
    expect(await c.get('k')).toBeNull();
    await expect(c.set('k', { x: 1 })).resolves.toBeUndefined();
    expect(open).toHaveBeenCalled();
  });

  it('stays disabled after a blocked open — no repeated open attempts', async () => {
    const open = vi.fn(() => {
      const req: Record<string, ((...a: unknown[]) => void) | null> = { onblocked: null };
      setTimeout(() => req.onblocked && req.onblocked(), 0);
      return req as unknown as IDBOpenDBRequest;
    });
    (globalThis as { indexedDB?: unknown }).indexedDB = { open } as unknown as IDBFactory;
    const c = new IndexedDBCache<{ x: number }>('blocked-db-2', 'store');
    await c.get('a');
    await c.get('b');
    await c.get('c');
    // First open is attempted; once disabled we don't re-open on every read.
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('IndexedDBCache — happy path (real IndexedDB via fake-indexeddb)', () => {
  it('creates ALL sibling stores and round-trips a value', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = new IDBFactory();
    const c = new IndexedDBCache<{ v: number }>('room-cache-test', 'zone-stats', {
      stores: ['parcel-data', 'zone-stats'],
    });
    await c.set('k', { v: 42 });
    expect(await c.get('k')).toEqual({ v: 42 });

    // Both sibling stores must exist — the original "second store silently
    // never created" bug.
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = (globalThis as { indexedDB: IDBFactory }).indexedDB.open('room-cache-test');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    expect([...db.objectStoreNames].sort()).toEqual(['parcel-data', 'zone-stats']);
    db.close();
  });

  it('missing key returns null', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = new IDBFactory();
    const c = new IndexedDBCache<{ v: number }>('room-cache-test-2', 'store');
    expect(await c.get('absent')).toBeNull();
  });
});

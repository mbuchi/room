/**
 * Client-side cache primitives ported from the scoore app. Two flavours:
 *
 *   - `LocalStorageCache<T>` — small, synchronous, TTL-only. Good for tiny
 *     responses (a few KB). Not used by room directly today, but kept here so
 *     the cache module matches the scoore surface and is available for cheap
 *     future cases (e.g. geocoder hints).
 *
 *   - `IndexedDBCache<T>` — asynchronous, optional TTL, optional byte-budget
 *     with LRU eviction. The right tool for room's two slow endpoints
 *     (`/api/zone-stats` and `/api/parcel-data`) whose responses can run to
 *     a few hundred KB each and which we want to keep across reloads.
 *
 * The implementation mirrors `scoore/src/utils/cache.ts` so the behaviour is
 * identical across the suite — eviction order is "least recently accessed",
 * reads `touch()` the entry, and every failure path is silent so a broken
 * IndexedDB never breaks a user-facing fetch.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class LocalStorageCache<T> {
  private prefix: string;
  private ttlMs: number;

  constructor(prefix: string, ttlMinutes: number = 60) {
    this.prefix = prefix;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  get(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      if (now - entry.timestamp > this.ttlMs) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  set(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch {
      // Silently fail if storage is unavailable or full
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

interface IDBCacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  /** Last time this entry was read or written — drives LRU eviction. */
  lastAccessed: number;
  /** Approximate serialized size of `data` in bytes. */
  size: number;
  /** Time-to-live in ms. `0` means the entry never expires. */
  ttlMs: number;
}

export interface IndexedDBCacheOptions {
  /** Time-to-live in minutes. `0` or omitted means entries never expire. */
  ttlMinutes?: number;
  /** Maximum total cache size in bytes. Once exceeded, the least-recently-used
   *  entries are evicted. Omitted means unbounded. */
  maxBytes?: number;
  /**
   * Every object store that lives in this database. ALL of them are created
   * in a single `onupgradeneeded` pass.
   *
   * This matters because IndexedDB only fires `onupgradeneeded` when the DB
   * version increases. With two `IndexedDBCache` instances sharing one db
   * name, the first to open creates its own store at v1; the second opens the
   * already-existing v1 DB, so its upgrade callback never runs and its store
   * is never created — every read/write then throws `NotFoundError` and is
   * swallowed, leaving that cache silently dead. Listing all sibling stores
   * here (and bumping DB_VERSION) makes whichever instance opens first create
   * the complete schema. Omitted → just this instance's own store.
   */
  stores?: string[];
}

// Bumped from 1 → 2 to repair installs whose `room-cache` DB was created with
// only one of its two stores (see `stores` above). The 1→2 upgrade creates
// any missing store without wiping existing data. Bumped 2 → 3 to add the
// `city-market` store (cityMarketService) — same idempotent create-missing
// upgrade, existing parcel-data / zone-stats entries are preserved.
//
// CRITICAL: a version bump means `open()` runs an upgrade, and an upgrade can
// be **blocked** by another still-open connection on the OLD version (a second
// tab, or a not-yet-torn-down page). A blocked open never fires `onsuccess` —
// so `openDB()` MUST NOT be allowed to hang, because callers `await` it on the
// critical path of the data fetch (see parcelDataService / zoneStatsService).
// If it hung, the parcel/zone fetch would never even reach the network and the
// info pane would spin forever. Hence the `onblocked` + timeout fallbacks below
// and the `onversionchange` self-close so we never block a future upgrade.
const DB_VERSION = 3;
// A healthy open resolves in single-digit ms; only a genuinely blocked upgrade
// takes longer. Past this we give up on the persistent cache for the session
// and let every read/write fall through to the network — never hang.
const OPEN_TIMEOUT_MS = 3000;

export class IndexedDBCache<T> {
  private dbName: string;
  private storeName: string;
  private stores: string[];
  private ttlMs: number;
  private maxBytes: number;
  private db: IDBDatabase | null = null;
  /** Once an open fails / blocks / times out we disable the cache for the
   *  session so we don't re-pay the timeout on every read. */
  private disabled = false;
  /** In-flight open, shared across concurrent get/set calls. */
  private openPromise: Promise<IDBDatabase | null> | null = null;

  constructor(dbName: string, storeName: string, options: IndexedDBCacheOptions = {}) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.stores = options.stores && options.stores.length ? options.stores : [storeName];
    this.ttlMs =
      options.ttlMinutes && options.ttlMinutes > 0
        ? options.ttlMinutes * 60 * 1000
        : 0;
    this.maxBytes = options.maxBytes ?? Infinity;
  }

  private byteLength(data: T): number {
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length;
    } catch {
      return 0;
    }
  }

  /**
   * Open the DB, NEVER hanging. Resolves to the connection, or to `null` when
   * the cache is unavailable (no IndexedDB, open error, or — the regression
   * this guards — a blocked upgrade that would otherwise never resolve). A
   * `null` result is a normal "cache disabled" signal that callers treat as a
   * miss/no-op, so the data fetch always proceeds.
   */
  private openDB(): Promise<IDBDatabase | null> {
    if (this.db) return Promise.resolve(this.db);
    if (this.disabled) return Promise.resolve(null);
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise<IDBDatabase | null>((resolve) => {
      let settled = false;
      const give_up = () => {
        if (settled) return;
        settled = true;
        this.disabled = true;
        this.openPromise = null;
        resolve(null);
      };

      let request: IDBOpenDBRequest;
      try {
        // Throws synchronously if `indexedDB` is undefined (SSR / locked-down
        // browsers); the catch turns that into a graceful "cache disabled".
        request = indexedDB.open(this.dbName, DB_VERSION);
      } catch {
        give_up();
        return;
      }

      // Blocked upgrade (an older-version connection is still open elsewhere):
      // don't wait — abandon the cache so the fetch proceeds via the network.
      request.onblocked = () => give_up();
      // Backstop for environments where `onblocked` doesn't fire.
      const timer = setTimeout(give_up, OPEN_TIMEOUT_MS);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const store of this.stores) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'key' });
          }
        }
      };

      request.onsuccess = (event) => {
        clearTimeout(timer);
        const db = (event.target as IDBOpenDBRequest).result;
        if (settled) {
          // We already gave up (timed out); discard this late connection.
          try { db.close(); } catch { /* ignore */ }
          return;
        }
        settled = true;
        // Close politely when another tab needs a higher version, so WE never
        // become the connection that blocks a future upgrade.
        db.onversionchange = () => {
          try { db.close(); } catch { /* ignore */ }
          this.db = null;
          this.openPromise = null;
        };
        this.db = db;
        this.openPromise = null;
        resolve(db);
      };

      request.onerror = () => {
        clearTimeout(timer);
        give_up();
      };
    });

    return this.openPromise;
  }

  async get(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      if (!db) return null;
      const entry = await new Promise<IDBCacheEntry<T> | undefined>((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const request = tx.objectStore(this.storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
      });

      if (!entry) return null;

      // ttlMs === 0 means the entry never expires.
      if (entry.ttlMs > 0 && Date.now() - entry.timestamp > entry.ttlMs) {
        await this.delete(key);
        return null;
      }

      // Touch the entry so LRU eviction keeps frequently-used keys.
      this.touch(key).catch(() => {
        /* non-critical */
      });
      return entry.data;
    } catch {
      return null;
    }
  }

  /** Update an entry's lastAccessed timestamp without rewriting its data. */
  private async touch(key: string): Promise<void> {
    const db = await this.openDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        const entry: IDBCacheEntry<T> | undefined = request.result;
        if (entry) {
          entry.lastAccessed = Date.now();
          store.put(entry);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async set(key: string, data: T): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db) return;
      const now = Date.now();
      const entry: IDBCacheEntry<T> = {
        key,
        data,
        timestamp: now,
        lastAccessed: now,
        size: this.byteLength(data),
        ttlMs: this.ttlMs,
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const request = tx.objectStore(this.storeName).put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      if (this.maxBytes !== Infinity) {
        await this.enforceSizeLimit();
      }
    } catch {
      // Silently fail if IndexedDB is unavailable
    }
  }

  /** Evict least-recently-used entries until total size is within `maxBytes`. */
  private async enforceSizeLimit(): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db) return;
      const entries = await new Promise<IDBCacheEntry<T>[]>((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const request = tx.objectStore(this.storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });

      let total = entries.reduce((sum, e) => sum + (e.size || 0), 0);
      if (total <= this.maxBytes) return;

      // Oldest access first — these are evicted until we are back under budget.
      const ordered = entries
        .slice()
        .sort((a, b) => (a.lastAccessed || a.timestamp) - (b.lastAccessed || b.timestamp));

      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        for (const entry of ordered) {
          if (total <= this.maxBytes) break;
          store.delete(entry.key);
          total -= entry.size || 0;
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Eviction failures must never break a user-facing request.
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db) return;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Silently fail
    }
  }

  /** Remove every entry in this store. */
  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db) return;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Silently fail
    }
  }
}

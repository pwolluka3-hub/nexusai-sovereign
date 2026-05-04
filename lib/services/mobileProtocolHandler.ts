/**
 * Mobile Protocol Handler
 * Handles execution from file:// protocol on Android
 * Provides fallbacks for storage, service workers, and CORS
 */

export interface ProtocolConfig {
  isFileProtocol: boolean;
  storageMode: 'localStorage' | 'memory' | 'indexeddb';
  hasServiceWorker: boolean;
  corsEnabled: boolean;
  cspStrict: boolean;
}

/**
 * Detect runtime protocol and browser capabilities
 */
export function detectProtocolEnvironment(): ProtocolConfig {
  if (typeof window === 'undefined') {
    return {
      isFileProtocol: false,
      storageMode: 'memory',
      hasServiceWorker: false,
      corsEnabled: false,
      cspStrict: false,
    };
  }

  const protocol = window.location.protocol;
  const isFileProtocol = protocol === 'file:';

  // Test localStorage availability
  let storageMode: 'localStorage' | 'memory' | 'indexeddb' = 'memory';
  try {
    const testKey = `nexus:test:${Date.now()}`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    storageMode = 'localStorage';
  } catch {
    // localStorage blocked
    try {
      if ('indexedDB' in window) {
        storageMode = 'indexeddb';
      }
    } catch {
      // indexeddb also blocked
    }
  }

  // Test service worker
  const hasServiceWorker = isFileProtocol ? false : 'serviceWorker' in navigator;

  // Test CORS (file:// origins always fail CORS)
  const corsEnabled = !isFileProtocol;

  // Check CSP
  const cspStrict = detectStrictCSP();

  return {
    isFileProtocol,
    storageMode,
    hasServiceWorker,
    corsEnabled,
    cspStrict,
  };
}

/**
 * Detect if CSP is enforced strictly
 */
function detectStrictCSP(): boolean {
  try {
    // Try to execute a script - if CSP blocks it, we'll catch an error
    // For now, just return false (user can configure if needed)
    return false;
  } catch {
    return true;
  }
}

/**
 * Hybrid storage that works on file:// protocol
 */
class HybridStorage {
  private memoryStore = new Map<string, string>();
  private storageMode: 'localStorage' | 'memory' | 'indexeddb';

  constructor(storageMode: 'localStorage' | 'memory' | 'indexeddb') {
    this.storageMode = storageMode;
  }

  setItem(key: string, value: string): void {
    // Always store in memory as fallback
    this.memoryStore.set(key, value);

    // Try persistent storage based on mode
    if (this.storageMode === 'localStorage') {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        console.warn(`[HybridStorage] localStorage.setItem failed for ${key}, using memory`);
      }
    } else if (this.storageMode === 'indexeddb') {
      this.setItemIndexedDB(key, value);
    }
  }

  getItem(key: string): string | null {
    // Check persistent storage first
    if (this.storageMode === 'localStorage') {
      try {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          this.memoryStore.set(key, value);
          return value;
        }
      } catch {
        // Fall through to memory
      }
    } else if (this.storageMode === 'indexeddb') {
      const value = this.getItemIndexedDBSync(key);
      if (value) return value;
    }

    // Fall back to memory
    return this.memoryStore.get(key) || null;
  }

  removeItem(key: string): void {
    this.memoryStore.delete(key);

    if (this.storageMode === 'localStorage') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    } else if (this.storageMode === 'indexeddb') {
      this.removeItemIndexedDB(key);
    }
  }

  clear(): void {
    this.memoryStore.clear();

    if (this.storageMode === 'localStorage') {
      try {
        window.localStorage.clear();
      } catch {
        // Ignore
      }
    }
  }

  private setItemIndexedDB(key: string, value: string): void {
    if (typeof indexedDB === 'undefined') return;

    try {
      const request = indexedDB.open('nexusai', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['storage'], 'readwrite');
        transaction.objectStore('storage').put({ key, value });
      };
    } catch (error) {
      console.warn('[HybridStorage] indexeddb.setItem failed:', error);
    }
  }

  private getItemIndexedDBSync(key: string): string | null {
    // IndexedDB is async, so we return null for sync access
    // Consider using async variant if needed
    return null;
  }

  private removeItemIndexedDB(key: string): void {
    if (typeof indexedDB === 'undefined') return;

    try {
      const request = indexedDB.open('nexusai', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['storage'], 'readwrite');
        transaction.objectStore('storage').delete(key);
      };
    } catch (error) {
      console.warn('[HybridStorage] indexeddb.removeItem failed:', error);
    }
  }
}

let hybridStorage: HybridStorage | null = null;

/**
 * Get hybrid storage instance
 */
export function getHybridStorage(): HybridStorage {
  if (!hybridStorage) {
    const config = detectProtocolEnvironment();
    hybridStorage = new HybridStorage(config.storageMode);
  }
  return hybridStorage;
}

/**
 * Fetch wrapper that handles file:// protocol limitations
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = detectProtocolEnvironment();

  // If file:// protocol, warn about CORS limitations
  if (config.isFileProtocol) {
    console.warn(
      '[MobileProtocolHandler] Running on file:// - CORS requests may fail. ' +
      'Consider running on http:// or https:// origin for full functionality.'
    );

    // Try to use proxy or fallback
    if (!config.corsEnabled) {
      // For file:// protocol, some requests may need server-side proxy
      // Redirect through /api/proxy if available
      if (url.startsWith('http')) {
        try {
          const proxiedUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
          return fetch(proxiedUrl, options);
        } catch {
          // Fall through to direct fetch (may fail)
        }
      }
    }
  }

  return fetch(url, options);
}

/**
 * Initialize mobile-safe environment
 */
export async function initializeMobileEnvironment(): Promise<ProtocolConfig> {
  const config = detectProtocolEnvironment();

  console.log('[MobileProtocolHandler] Environment config:', {
    protocol: window.location.protocol,
    storageMode: config.storageMode,
    serviceWorker: config.hasServiceWorker ? 'available' : 'unavailable',
    cors: config.corsEnabled ? 'enabled' : 'restricted',
    csp: config.cspStrict ? 'strict' : 'relaxed',
  });

  // Set up storage
  getHybridStorage();

  // Warn if running from file://
  if (config.isFileProtocol) {
    console.warn(
      '[MobileProtocolHandler] Running from file:// protocol. ' +
      'Some features may be unavailable. ' +
      'For best experience, run from http:// or https:// origin.'
    );

    // Store warning in memory storage
    try {
      getHybridStorage().setItem(
        'nexus:warning:file-protocol',
        JSON.stringify({
          timestamp: Date.now(),
          message: 'App running from file:// - limitations apply',
        })
      );
    } catch {
      // Ignore storage failures
    }
  }

  return config;
}

/**
 * Get storage mode details
 */
export function getStorageModeInfo(): string {
  const config = detectProtocolEnvironment();
  const modeInfo: Record<string, string> = {
    localStorage: 'Browser local storage (10MB limit)',
    indexeddb: 'IndexedDB (100MB+ available)',
    memory: 'Memory only (lost on refresh)',
  };
  return modeInfo[config.storageMode] || 'Unknown';
}

/**
 * Check if API calls will work
 */
export function canMakeExternalCalls(): boolean {
  const config = detectProtocolEnvironment();
  return config.corsEnabled;
}

/**
 * Provide fallback messaging for file:// limitations
 */
export function getFileProtocolWarning(): string | null {
  const config = detectProtocolEnvironment();

  if (!config.isFileProtocol) return null;

  return `
    NexusAI is running from a file:// origin. Some features may be limited:
    - API calls may fail (CORS restrictions)
    - Storage is memory-only (lost on refresh)
    - Service workers are unavailable
    
    For full functionality, please run from http:// or https:// origin.
  `.trim();
}

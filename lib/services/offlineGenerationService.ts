export function isOfflineMode(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

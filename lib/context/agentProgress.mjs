export const PROCESS_UPDATE_PREFIX = 'Quick update:';
const LEGACY_PROCESS_UPDATE_PREFIX = 'Process update:';

export function buildProcessUpdate(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed) return `${PROCESS_UPDATE_PREFIX} I am working on it now.`;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith(PROCESS_UPDATE_PREFIX.toLowerCase()) ||
    lower.startsWith(LEGACY_PROCESS_UPDATE_PREFIX.toLowerCase())
  ) {
    return trimmed;
  }
  return `${PROCESS_UPDATE_PREFIX} ${trimmed}`;
}

export function isProcessUpdateMessage(message) {
  const lower = String(message || '').trim().toLowerCase();
  return (
    lower.startsWith(PROCESS_UPDATE_PREFIX.toLowerCase()) ||
    lower.startsWith(LEGACY_PROCESS_UPDATE_PREFIX.toLowerCase())
  );
}

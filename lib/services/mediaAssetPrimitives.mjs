const EPHEMERAL_MEDIA_SENTINELS = new Set([
  'web-speech-generated',
  'google-tts-generated',
  'browser-generated',
]);

export function isEphemeralMediaReference(url) {
  if (!url || typeof url !== 'string') return true;
  const normalized = url.trim();
  if (!normalized) return true;
  if (EPHEMERAL_MEDIA_SENTINELS.has(normalized)) return true;
  return normalized.startsWith('blob:');
}

export function isDurableMediaReference(url) {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim();
  if (!normalized) return false;
  if (isEphemeralMediaReference(normalized)) return false;
  return (
    normalized.startsWith('https://') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('/')
  );
}

export function shouldAssembleFinalMedia({ imageUrl, videoUrl, voiceUrl, musicUrl }) {
  const hasVisual = Boolean(videoUrl || imageUrl);
  const hasAudioLayer = Boolean(voiceUrl || musicUrl);
  return hasVisual && hasAudioLayer;
}

export function inferExtensionFromMimeType(mimeType, fallback = 'bin') {
  if (!mimeType || typeof mimeType !== 'string') return fallback;
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('mpeg')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('json')) return 'json';
  return fallback;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { canMirrorKvToLocalStorage, isSensitiveKvKey, readFile, writeBinaryFile } from '../lib/services/puterService.ts';

function createLocalStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test('isSensitiveKvKey treats provider api keys as sensitive', () => {
  assert.equal(isSensitiveKvKey('groq_key'), true);
  assert.equal(isSensitiveKvKey('elevenlabs_key'), true);
  assert.equal(isSensitiveKvKey('openrouter_key'), true);
});

test('isSensitiveKvKey treats token-like keys as sensitive', () => {
  assert.equal(isSensitiveKvKey('access_token'), true);
  assert.equal(isSensitiveKvKey('refresh-token'), true);
  assert.equal(isSensitiveKvKey('secret_value'), true);
});

test('isSensitiveKvKey leaves normal preference keys non-sensitive', () => {
  assert.equal(isSensitiveKvKey('ai_model'), false);
  assert.equal(isSensitiveKvKey('image_provider'), false);
  assert.equal(isSensitiveKvKey('nexus_theme'), false);
});

test('canMirrorKvToLocalStorage allows known-safe preference keys', () => {
  assert.equal(canMirrorKvToLocalStorage('ai_model'), true);
  assert.equal(canMirrorKvToLocalStorage('disable_puter_fallback'), true);
  assert.equal(canMirrorKvToLocalStorage('image_provider'), true);
  assert.equal(canMirrorKvToLocalStorage('provider_status_openrouter'), true);
});

test('canMirrorKvToLocalStorage blocks secrets and private identity fields', () => {
  assert.equal(canMirrorKvToLocalStorage('groq_key'), false);
  assert.equal(canMirrorKvToLocalStorage('provider_access_token'), false);
  assert.equal(canMirrorKvToLocalStorage('provider_username'), false);
});

test('readFile falls back to local persisted copy when Puter fs misses', async () => {
  const previousWindow = globalThis.window;
  const localStorage = createLocalStorage();
  localStorage.setItem('nexus:auth:session', 'true');
  localStorage.setItem('nexus:file:/NexusAI/system/chat-history/messages.json', JSON.stringify([{ role: 'user', content: 'remember me' }]));

  globalThis.window = {
    localStorage,
    puter: {
      fs: {
        read: async () => {
          const error = new Error('subject_does_not_exist');
          error.code = 'subject_does_not_exist';
          throw error;
        },
      },
    },
  };

  try {
    const history = await readFile('/NexusAI/system/chat-history/messages.json', true);
    assert.deepEqual(history, [{ role: 'user', content: 'remember me' }]);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test('writeBinaryFile skips oversized localStorage mirrors without Puter auth', async () => {
  const previousWindow = globalThis.window;
  const localStorage = createLocalStorage();
  const oversizedBlob = new Blob(['x'.repeat(800000)], { type: 'audio/webm' });

  globalThis.window = { localStorage };

  try {
    const saved = await writeBinaryFile('/NexusAI/content/assets/audio/large.webm', oversizedBlob);

    assert.equal(saved, false);
    assert.equal(localStorage.getItem('nexus:file:/NexusAI/content/assets/audio/large.webm'), null);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

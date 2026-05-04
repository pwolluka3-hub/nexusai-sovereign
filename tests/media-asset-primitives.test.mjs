import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferExtensionFromMimeType,
  isDurableMediaReference,
  isEphemeralMediaReference,
  shouldAssembleFinalMedia,
} from '../lib/services/mediaAssetPrimitives.mjs';

test('isEphemeralMediaReference flags browser-only sentinels and blob URLs', () => {
  assert.equal(isEphemeralMediaReference('web-speech-generated'), true);
  assert.equal(isEphemeralMediaReference('browser-generated'), true);
  assert.equal(isEphemeralMediaReference('blob:https://example.com/123'), true);
  assert.equal(isEphemeralMediaReference('https://cdn.example.com/final.mp4'), false);
});

test('isDurableMediaReference accepts hosted, relative, and data URLs', () => {
  assert.equal(isDurableMediaReference('https://cdn.example.com/asset.mp4'), true);
  assert.equal(isDurableMediaReference('/audio/presets/calm-ambient.mp3'), true);
  assert.equal(isDurableMediaReference('data:audio/mp3;base64,ZmFrZQ=='), true);
  assert.equal(isDurableMediaReference('blob:https://example.com/123'), false);
});

test('shouldAssembleFinalMedia only assembles when both visual and audio layers exist', () => {
  assert.equal(shouldAssembleFinalMedia({ imageUrl: '/image.png', voiceUrl: '/voice.mp3' }), true);
  assert.equal(shouldAssembleFinalMedia({ videoUrl: '/video.mp4', musicUrl: '/music.mp3' }), true);
  assert.equal(shouldAssembleFinalMedia({ imageUrl: '/image.png' }), false);
  assert.equal(shouldAssembleFinalMedia({ voiceUrl: '/voice.mp3' }), false);
});

test('inferExtensionFromMimeType maps common asset types', () => {
  assert.equal(inferExtensionFromMimeType('image/png'), 'png');
  assert.equal(inferExtensionFromMimeType('video/webm'), 'webm');
  assert.equal(inferExtensionFromMimeType('audio/mpeg'), 'mp3');
  assert.equal(inferExtensionFromMimeType('application/octet-stream', 'bin'), 'bin');
});

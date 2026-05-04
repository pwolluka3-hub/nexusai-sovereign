import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPostWithHashtags,
  getPublisherMediaBlockReason,
  isPublicPublisherMediaUrl,
} from '../lib/services/publishingReadinessService.ts';

test('publishing readiness accepts only public media URLs for provider publishing', () => {
  assert.equal(isPublicPublisherMediaUrl(undefined), true);
  assert.equal(isPublicPublisherMediaUrl('https://cdn.example.com/video.mp4'), true);
  assert.equal(isPublicPublisherMediaUrl('http://cdn.example.com/image.png'), false);
  assert.equal(isPublicPublisherMediaUrl('blob:https://app.example.com/asset'), false);
  assert.equal(isPublicPublisherMediaUrl('data:image/png;base64,abc'), false);
});

test('publisher media block reason explains browser-only media', () => {
  assert.match(
    getPublisherMediaBlockReason('data:image/png;base64,abc') || '',
    /browser session/i
  );
  assert.equal(getPublisherMediaBlockReason('https://cdn.example.com/image.png'), null);
});

test('formatPostWithHashtags appends normalized hashtags once', () => {
  assert.equal(
    formatPostWithHashtags('Launch starts now.', ['Brand', '#Launch']),
    'Launch starts now.\n\n#Brand #Launch'
  );
});

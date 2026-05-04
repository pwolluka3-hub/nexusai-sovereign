import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LTX_MODEL,
  buildLtxRequestPayload,
  buildVideoProviderAttemptOrder,
  isReachableOpenLtxEndpoint,
  normalizeLtxDuration,
  normalizeLtxEndpointSlug,
  pickMoreRelevantVideoError,
} from '../lib/services/videoGenerationService.ts';

test('cloud video generation skips open fallback when no reachable open endpoint exists', () => {
  assert.deepEqual(buildVideoProviderAttemptOrder('ltx23', true, false), ['ltx23']);
});

test('open video provider falls back to cloud when the open endpoint is unreachable', () => {
  assert.deepEqual(buildVideoProviderAttemptOrder('ltx23-open', true, false), ['ltx23']);
  assert.deepEqual(buildVideoProviderAttemptOrder('ltx23-open', true, true), ['ltx23-open', 'ltx23']);
});

test('open endpoint reachability treats loopback as local-only', () => {
  assert.equal(
    isReachableOpenLtxEndpoint('http://127.0.0.1:8000/generate', 'localhost'),
    true
  );
  assert.equal(
    isReachableOpenLtxEndpoint('http://127.0.0.1:8000/generate', 'extractedproject-theta.vercel.app'),
    false
  );
  assert.equal(
    isReachableOpenLtxEndpoint('https://ltx.example.com/generate', 'extractedproject-theta.vercel.app'),
    true
  );
});

test('video error selection preserves a useful provider error over a generic fetch miss', () => {
  const specificError = new Error('LTX video error (401): unauthorized');
  const genericError = new Error('Failed to fetch');

  assert.equal(pickMoreRelevantVideoError(null, genericError), genericError);
  assert.equal(pickMoreRelevantVideoError(specificError, genericError), specificError);
});

test('LTX cloud default uses the current fal LTX 2.3 text-to-video endpoint', () => {
  assert.equal(DEFAULT_LTX_MODEL, 'fal-ai/ltx-2.3/text-to-video/fast');
  assert.equal(normalizeLtxEndpointSlug('fal-ai/ltx-video-v2.3'), DEFAULT_LTX_MODEL);
});

test('LTX payload normalizes unsupported duration and aspect ratios', () => {
  const payload = buildLtxRequestPayload({
    prompt: 'A cinematic brand intro video',
    aspectRatio: '1:1',
    durationSeconds: 11,
    seed: 77,
    imageUrl: 'https://example.com/reference.png',
  });

  assert.equal(payload.aspect_ratio, '9:16');
  assert.equal(payload.duration, 10);
  assert.equal(payload.resolution, '720p');
  assert.equal(payload.generate_audio, true);
  assert.equal(payload.seed, 77);
  assert.equal(payload.image_url, 'https://example.com/reference.png');
  assert.equal(Object.hasOwn(payload, 'camera_angle'), false);
  assert.equal(Object.hasOwn(payload, 'quality_profile'), false);
});

test('fast LTX duration can use longer supported clip lengths', () => {
  assert.equal(normalizeLtxDuration(19, 'fal-ai/ltx-2.3/text-to-video/fast'), 18);
  assert.equal(normalizeLtxDuration(19, 'fal-ai/ltx-2.3/text-to-video'), 10);
});

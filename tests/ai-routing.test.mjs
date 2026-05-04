import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackProviders } from '../lib/services/providerFallback.ts';
import { pickRecommendedModel } from '../lib/services/providerModelSelection.mjs';

test('buildFallbackProviders keeps Puter fallback chain when Puter is preferred', () => {
  assert.deepEqual(
    buildFallbackProviders('puter', ['puter', 'groq', 'openrouter']),
    ['puter', 'groq', 'openrouter']
  );
});

test('buildFallbackProviders excludes Puter by default when a non-Puter provider is preferred', () => {
  assert.deepEqual(
    buildFallbackProviders('groq', ['puter', 'groq', 'openrouter']),
    ['groq', 'openrouter']
  );
});

test('buildFallbackProviders excludes Puter when explicit disable is enabled', () => {
  assert.deepEqual(
    buildFallbackProviders('groq', ['puter', 'groq', 'openrouter'], { disablePuterFallback: true }),
    ['groq', 'openrouter']
  );
});

test('buildFallbackProviders preserves the preferred non-Puter provider when it is the only routed option', () => {
  assert.deepEqual(
    buildFallbackProviders('openrouter', ['puter', 'openrouter'], { disablePuterFallback: true }),
    ['openrouter']
  );
});

test('getRecommendedModel prefers a stronger default model for normal chat', () => {
  const providers = [
    {
      id: 'puter',
      status: 'healthy',
      apiKeyConfigured: true,
      models: [
        { id: 'gpt-4o-mini', deprecated: false },
        { id: 'gpt-4o', deprecated: false },
        { id: 'claude-sonnet-4-5', deprecated: false },
      ],
    },
  ];

  assert.deepEqual(
    pickRecommendedModel('chat', providers),
    { providerId: 'puter', modelId: 'gpt-4o' }
  );
});

test('getRecommendedModel keeps analysis on the reasoning-heavy path', () => {
  const providers = [
    {
      id: 'puter',
      status: 'healthy',
      apiKeyConfigured: true,
      models: [
        { id: 'claude-opus-4', deprecated: false },
        { id: 'gpt-4o', deprecated: false },
      ],
    },
  ];

  assert.deepEqual(
    pickRecommendedModel('analysis', providers),
    { providerId: 'puter', modelId: 'claude-opus-4' }
  );
});

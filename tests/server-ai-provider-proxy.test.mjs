import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOpenAICompatiblePayload,
  getServerConfiguredProviderIds,
  normalizeProxyMessages,
} from '../lib/server/aiProviderProxy.ts';

test('server provider status reads configured env keys without exposing secrets', () => {
  const providers = getServerConfiguredProviderIds({
    GROQ_API_KEY: 'gsk_test',
    OPENROUTER_API_KEY: '',
  });

  assert.deepEqual(providers, ['groq']);
});

test('proxy message normalization keeps valid chat messages only', () => {
  const messages = normalizeProxyMessages([
    { role: 'system', content: 'system' },
    { role: 'user', content: 'hello' },
    { role: 'tool', content: 'ignored' },
  ]);

  assert.deepEqual(messages, [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'hello' },
  ]);
});

test('OpenAI-compatible payload preserves multimodal content shape', () => {
  const payload = buildOpenAICompatiblePayload('openai/gpt-4o', [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this.' },
        { type: 'image_url', image_url: { url: 'https://example.com/image.png' } },
      ],
    },
  ]);

  assert.equal(payload.model, 'openai/gpt-4o');
  assert.deepEqual(payload.messages[0].content[1], {
    type: 'image_url',
    image_url: { url: 'https://example.com/image.png' },
  });
});

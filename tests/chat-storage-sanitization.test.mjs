import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeChatMessageForStorage,
  sanitizeChatMessagesForStorage,
} from '../lib/services/chatStorageSanitizer.mjs';

test('sanitizeChatMessageForStorage strips inline media payloads from saved messages', () => {
  const inlineAudio = `data:audio/webm;base64,${'A'.repeat(5000)}`;
  const message = {
    id: 'message-1',
    role: 'assistant',
    content: `Voice: ${inlineAudio}`,
    timestamp: new Date(0).toISOString(),
    media: [
      {
        type: 'audio',
        url: inlineAudio,
        mimeType: 'audio/webm',
        provider: 'music-engine',
        prompt: `Prompt ${inlineAudio}`,
      },
      {
        type: 'image',
        url: 'https://cdn.example.com/image.png',
        provider: 'image-engine',
      },
    ],
  };

  const sanitized = sanitizeChatMessageForStorage(message);

  assert.equal(sanitized.content.includes('data:audio'), false);
  assert.equal(sanitized.content.includes('[attached media omitted from saved chat]'), true);
  assert.equal(sanitized.media.length, 1);
  assert.equal(sanitized.media[0].url, 'https://cdn.example.com/image.png');
});

test('sanitizeChatMessageForStorage keeps large attachments as metadata only', () => {
  const message = {
    id: 'message-2',
    role: 'user',
    content: 'Analyze this file',
    timestamp: new Date(0).toISOString(),
    attachments: [
      {
        name: 'large-video.mp4',
        mimeType: 'video/mp4',
        data: 'B'.repeat(300000),
        size: 225000,
      },
    ],
  };

  const sanitized = sanitizeChatMessageForStorage(message);

  assert.equal(sanitized.attachments.length, 1);
  assert.equal(sanitized.attachments[0].data, '');
  assert.equal(sanitized.attachments[0].processed, true);
  assert.match(sanitized.attachments[0].summary, /omitted from saved chat/);
});

test('sanitizeChatMessagesForStorage preserves message count', () => {
  const sanitized = sanitizeChatMessagesForStorage([
    {
      id: 'message-3',
      role: 'assistant',
      content: 'Done',
      timestamp: new Date(0).toISOString(),
    },
  ]);

  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].content, 'Done');
});

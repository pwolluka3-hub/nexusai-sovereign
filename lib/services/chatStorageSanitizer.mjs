const MAX_STORED_CHAT_CONTENT_LENGTH = 20000;
const MAX_STORED_MEDIA_URL_LENGTH = 2048;
const MAX_STORED_ATTACHMENT_DATA_LENGTH = 250000;
const INLINE_MEDIA_REFERENCE_PATTERN = /^(data:|blob:|web-speech-generated$|google-tts-generated$|browser-generated$)/i;
const INLINE_MEDIA_DATA_PATTERN = /data:(?:audio|video|image|application)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi;

function sanitizeChatContentForStorage(content) {
  const cleaned = String(content || '').replace(INLINE_MEDIA_DATA_PATTERN, '[attached media omitted from saved chat]');
  if (cleaned.length <= MAX_STORED_CHAT_CONTENT_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_STORED_CHAT_CONTENT_LENGTH)}\n\n[message truncated for saved chat]`;
}

function isPersistableChatMediaUrl(url) {
  return Boolean(
    url &&
    url.length <= MAX_STORED_MEDIA_URL_LENGTH &&
    !INLINE_MEDIA_REFERENCE_PATTERN.test(url)
  );
}

export function sanitizeChatMessageForStorage(message) {
  const media = message.media
    ?.filter((asset) => isPersistableChatMediaUrl(asset.url))
    .map((asset) => ({
      ...asset,
      prompt: asset.prompt ? sanitizeChatContentForStorage(asset.prompt) : asset.prompt,
      thumbnailUrl: asset.thumbnailUrl && isPersistableChatMediaUrl(asset.thumbnailUrl)
        ? asset.thumbnailUrl
        : undefined,
    }));

  const attachments = message.attachments?.map((attachment) => {
    if (!attachment.data || attachment.data.length <= MAX_STORED_ATTACHMENT_DATA_LENGTH) {
      return attachment;
    }

    return {
      ...attachment,
      data: '',
      processed: true,
      summary: attachment.summary || 'Attachment content was omitted from saved chat to protect browser storage.',
    };
  });

  return {
    ...message,
    content: sanitizeChatContentForStorage(message.content),
    ...(media && media.length > 0 ? { media } : { media: undefined }),
    ...(attachments && attachments.length > 0 ? { attachments } : { attachments: undefined }),
  };
}

export function sanitizeChatMessagesForStorage(messages) {
  return messages.map(sanitizeChatMessageForStorage);
}

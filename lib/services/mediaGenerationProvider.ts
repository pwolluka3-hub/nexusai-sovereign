/**
 * Provider Agnostic Media Generation Service
 * Handles image, video, and audio generation across multiple providers
 * - Fallback chains if primary provider fails
 * - Multi-provider support (Stability, Runway, ElevenLabs, etc.)
 * - Graceful degradation
 */

import { getProviderKey, isProviderAvailable } from '@/lib/config/envValidation';

export type MediaType = 'image' | 'video' | 'audio';
export type ImageProvider = 'stability' | 'replicate' | 'ideogram';
export type VideoProvider = 'runway' | 'replicate' | 'gtm';
export type AudioProvider = 'elevenlabs' | 'openai';

export interface GenerationRequest {
  type: MediaType;
  description: string;
  provider?: string; // If not specified, auto-select best available
}

export interface GenerationResult {
  success: boolean;
  data?: Blob | ArrayBuffer | string; // Blob for image/video, string for URL or audio
  dataUrl?: string;
  provider: string;
  error?: string;
  fallbackUsed?: boolean;
}

/**
 * Image generation with provider fallback
 */
export async function generateImage(
  description: string,
  preferredProvider?: ImageProvider
): Promise<GenerationResult> {
  const providers: ImageProvider[] = preferredProvider
    ? [preferredProvider, 'stability', 'replicate', 'ideogram']
    : ['stability', 'replicate', 'ideogram'];

  for (const provider of providers) {
    try {
      if (isProviderAvailable(provider)) {
        const result = await generateImageWithProvider(provider, description);
        if (result.success) {
          return result;
        }
      }
    } catch (error) {
      console.warn(`[MediaGen] Image generation with ${provider} failed:`, error);
      continue;
    }
  }

  // All providers failed
  return {
    success: false,
    provider: 'none',
    error: 'No image providers configured or all providers failed',
  };
}

/**
 * Generate image with specific provider
 */
async function generateImageWithProvider(
  provider: ImageProvider,
  description: string
): Promise<GenerationResult> {
  const apiKey = getProviderKey(provider);

  if (provider === 'stability') {
    return generateImageStability(description, apiKey);
  } else if (provider === 'replicate') {
    return generateImageReplicate(description, apiKey);
  } else if (provider === 'ideogram') {
    return generateImageIdeogram(description, apiKey);
  }

  return {
    success: false,
    provider,
    error: `Unknown provider: ${provider}`,
  };
}

/**
 * Stability API image generation
 */
async function generateImageStability(
  description: string,
  apiKey: string
): Promise<GenerationResult> {
  try {
    const response = await fetch('https://api.stability.ai/v1/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: description,
        model: 'stable-diffusion-v3.5-large',
        samples: 1,
        guidance_scale: 7.5,
        steps: 30,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json() as { artifacts?: Array<{ base64: string }> };
    const base64 = data.artifacts?.[0]?.base64;

    if (!base64) throw new Error('No image data in response');

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    return {
      success: true,
      data: blob,
      provider: 'stability',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'stability',
      error: String(error),
    };
  }
}

/**
 * Replicate API image generation
 */
async function generateImageReplicate(
  description: string,
  apiKey: string
): Promise<GenerationResult> {
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version:
          '6359cbf9f8c1e99667e8635c5e1c5d18e97f4e7d5ba3e5c6d5c4b3a2f1e0d',
        input: {
          prompt: description,
          num_outputs: 1,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json() as { output?: string[] };
    const imageUrl = data.output?.[0];

    if (!imageUrl) throw new Error('No image URL in response');

    return {
      success: true,
      dataUrl: imageUrl,
      provider: 'replicate',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'replicate',
      error: String(error),
    };
  }
}

/**
 * Ideogram API image generation
 */
async function generateImageIdeogram(
  description: string,
  apiKey: string
): Promise<GenerationResult> {
  try {
    const response = await fetch(
      'https://api.ideogram.ai/generate',
      {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_request: {
            prompt: description,
            aspect_ratio: '1:1',
            model: 'V_2_TURBO',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      data?: Array<{ url: string }>;
    };
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) throw new Error('No image URL in response');

    return {
      success: true,
      dataUrl: imageUrl,
      provider: 'ideogram',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'ideogram',
      error: String(error),
    };
  }
}

/**
 * Video generation with provider fallback
 */
export async function generateVideo(
  description: string,
  preferredProvider?: VideoProvider
): Promise<GenerationResult> {
  const providers: VideoProvider[] = preferredProvider
    ? [preferredProvider, 'runway', 'replicate']
    : ['runway', 'replicate'];

  for (const provider of providers) {
    try {
      if (isProviderAvailable(provider)) {
        const result = await generateVideoWithProvider(provider, description);
        if (result.success) {
          return result;
        }
      }
    } catch (error) {
      console.warn(`[MediaGen] Video generation with ${provider} failed:`, error);
      continue;
    }
  }

  return {
    success: false,
    provider: 'none',
    error: 'No video providers configured or all providers failed',
  };
}

/**
 * Generate video with specific provider
 */
async function generateVideoWithProvider(
  provider: VideoProvider,
  description: string
): Promise<GenerationResult> {
  // Video generation is async and long-running
  // Return a queued status and polling URL for client
  if (provider === 'runway') {
    return generateVideoRunway(description);
  } else if (provider === 'replicate') {
    return generateVideoReplicate(description);
  }

  return {
    success: false,
    provider,
    error: `Unknown video provider: ${provider}`,
  };
}

/**
 * Runway video generation stub
 */
async function generateVideoRunway(
  description: string
): Promise<GenerationResult> {
  // Runway API integration
  // This is complex as it requires job polling
  console.warn('[MediaGen] Runway integration requires custom implementation');
  return {
    success: false,
    provider: 'runway',
    error: 'Runway integration pending',
  };
}

/**
 * Replicate video generation stub
 */
async function generateVideoReplicate(
  description: string
): Promise<GenerationResult> {
  console.warn('[MediaGen] Replicate video integration requires custom implementation');
  return {
    success: false,
    provider: 'replicate',
    error: 'Replicate video integration pending',
  };
}

/**
 * Audio/voice generation with provider fallback
 */
export async function generateAudio(
  text: string,
  options?: { voice?: string; preferredProvider?: AudioProvider }
): Promise<GenerationResult> {
  const providers: AudioProvider[] = options?.preferredProvider
    ? [options.preferredProvider, 'elevenlabs', 'openai']
    : ['elevenlabs', 'openai'];

  for (const provider of providers) {
    try {
      if (isProviderAvailable(provider)) {
        const result = await generateAudioWithProvider(
          provider,
          text,
          options?.voice
        );
        if (result.success) {
          return result;
        }
      }
    } catch (error) {
      console.warn(`[MediaGen] Audio generation with ${provider} failed:`, error);
      continue;
    }
  }

  return {
    success: false,
    provider: 'none',
    error: 'No audio providers configured or all providers failed',
  };
}

/**
 * Generate audio with specific provider
 */
async function generateAudioWithProvider(
  provider: AudioProvider,
  text: string,
  voice?: string
): Promise<GenerationResult> {
  const apiKey = getProviderKey(provider);

  if (provider === 'elevenlabs') {
    return generateAudioElevenLabs(text, apiKey, voice);
  } else if (provider === 'openai') {
    return generateAudioOpenAI(text, apiKey, voice);
  }

  return {
    success: false,
    provider,
    error: `Unknown provider: ${provider}`,
  };
}

/**
 * ElevenLabs voice generation
 */
async function generateAudioElevenLabs(
  text: string,
  apiKey: string,
  voice = 'alloy'
): Promise<GenerationResult> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const blob = await response.blob();

    return {
      success: true,
      data: blob,
      provider: 'elevenlabs',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'elevenlabs',
      error: String(error),
    };
  }
}

/**
 * OpenAI TTS
 */
async function generateAudioOpenAI(
  text: string,
  apiKey: string,
  voice = 'alloy'
): Promise<GenerationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text,
        voice: voice,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const blob = await response.blob();

    return {
      success: true,
      data: blob,
      provider: 'openai',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'openai',
      error: String(error),
    };
  }
}

/**
 * Get available providers for a media type
 */
export function getAvailableProvidersForType(type: MediaType): string[] {
  const providers: Record<MediaType, string[]> = {
    image: ['stability', 'replicate', 'ideogram'],
    video: ['runway', 'replicate'],
    audio: ['elevenlabs', 'openai'],
  };

  return providers[type].filter((p) => isProviderAvailable(p));
}

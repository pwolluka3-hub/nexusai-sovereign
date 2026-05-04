'use client';

import type { Platform } from '@/lib/types';

export interface PlatformAdaptedContent {
  platform: Platform;
  text: string;
  hashtags: string[];
  durationHint?: string;
}

function clampText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  instagram: 2200,
  tiktok: 2200,
  linkedin: 3000,
  facebook: 63206,
  threads: 500,
  youtube: 5000,
  pinterest: 500,
};

export function adaptContentForPlatform(
  text: string,
  hashtags: string[],
  platform: Platform
): PlatformAdaptedContent {
  const limit = PLATFORM_LIMITS[platform];
  const cleanText = clampText(text, limit);
  const platformHashtags = hashtags.slice(0, platform === 'twitter' ? 3 : 8);

  const durationHint =
    platform === 'tiktok' || platform === 'instagram' || platform === 'youtube'
      ? '7-25s short-form pacing with immediate hook'
      : undefined;

  return {
    platform,
    text: cleanText,
    hashtags: platformHashtags,
    durationHint,
  };
}

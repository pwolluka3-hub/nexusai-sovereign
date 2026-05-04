'use client';

import type { SoundDesignPlan } from './soundDesignService';

export interface AudioMixSettings {
  voiceVolume: number;
  musicVolume: number;
  fxVolume: number;
  duckingEnabled: boolean;
  reverbAmount: number;
  silenceGaps: Array<{ atSecond: number; durationMs: number }>;
}

export interface AudioMixPlan {
  settings: AudioMixSettings;
  notes: string[];
  previewInstructions: string;
}

export function buildAudioMixPlan(soundDesign: SoundDesignPlan): AudioMixPlan {
  const silenceGaps = soundDesign.cues
    .filter((cue) => cue.cue.includes('silence'))
    .map((cue) => ({ atSecond: cue.atSecond, durationMs: 420 }));

  return {
    settings: {
      voiceVolume: 1.0,
      musicVolume: 0.24,
      fxVolume: 0.18,
      duckingEnabled: true,
      reverbAmount: 0.12,
      silenceGaps,
    },
    notes: [
      'Voice stays priority at 100%.',
      'Music sits under dialogue at 15-35%.',
      'FX remain below voice and never mask consonants.',
      'Apply sidechain ducking on music bus when voice is active.',
    ],
    previewInstructions:
      'Render a voice-forward mix with subtle cinematic underscore, sparse FX accents, clean fades, and loop-safe tail handling.',
  };
}

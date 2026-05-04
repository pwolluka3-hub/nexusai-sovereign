'use client';

import { persistBlobMediaAsset, type PersistedMediaAsset } from './mediaAssetPersistenceService';

export interface FinalMediaAssemblyInput {
  imageUrl?: string;
  videoUrl?: string;
  voiceUrl?: string;
  musicUrl?: string;
  mixPlan?: {
    settings: {
      voiceVolume: number;
      musicVolume: number;
      fxVolume: number;
    };
  };
  durationSeconds?: number;
  generationId?: string;
}

export interface FinalMediaAssemblyResult {
  asset: PersistedMediaAsset | null;
  warnings: string[];
}

function canUseMediaRecorder(mimeType: string): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
    ? MediaRecorder.isTypeSupported(mimeType)
    : false;
}

function chooseRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  for (const candidate of candidates) {
    if (canUseMediaRecorder(candidate)) {
      return candidate;
    }
  }

  return 'video/webm';
}

function clampDuration(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 12;
  return Math.max(4, Math.min(120, value));
}

async function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('Failed to load source video for final assembly'));
  });
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load source image for final assembly'));
    image.src = url;
  });
}

async function loadAudio(url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = url;
    audio.onloadedmetadata = () => resolve(audio);
    audio.onerror = () => reject(new Error('Failed to load source audio for final assembly'));
  });
}

async function safePlay(media: HTMLMediaElement): Promise<void> {
  try {
    await media.play();
  } catch {
    // Playback can still advance via currentTime updates in some browsers; keep going.
  }
}

export async function assembleFinalMedia(input: FinalMediaAssemblyInput): Promise<FinalMediaAssemblyResult> {
  const warnings: string[] = [];

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { asset: null, warnings: ['Final assembly requires a browser runtime.'] };
  }

  if (typeof MediaRecorder === 'undefined' || typeof AudioContext === 'undefined') {
    return { asset: null, warnings: ['Final assembly is not supported in this browser.'] };
  }

  if (!input.videoUrl && !input.imageUrl) {
    return { asset: null, warnings: ['Final assembly requires at least one visual asset.'] };
  }

  const recorderMimeType = chooseRecorderMimeType();
  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();

  let video: HTMLVideoElement | null = null;
  let image: HTMLImageElement | null = null;
  let voice: HTMLAudioElement | null = null;
  let music: HTMLAudioElement | null = null;

  try {
    if (input.videoUrl) {
      video = await loadVideo(input.videoUrl);
    } else if (input.imageUrl) {
      image = await loadImage(input.imageUrl);
    }

    if (input.voiceUrl) {
      try {
        voice = await loadAudio(input.voiceUrl);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Voice track could not be loaded.');
      }
    }

    if (input.musicUrl) {
      try {
        music = await loadAudio(input.musicUrl);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Music track could not be loaded.');
      }
    }

    const width = video?.videoWidth || image?.naturalWidth || 1080;
    const height = video?.videoHeight || image?.naturalHeight || 1920;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      return { asset: null, warnings: ['Canvas 2D context is unavailable for final assembly.'] };
    }

    const durationSeconds = clampDuration(
      input.durationSeconds
      || video?.duration
      || voice?.duration
      || music?.duration
    );

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);

    const gainSettings = input.mixPlan?.settings || {
      voiceVolume: 1,
      musicVolume: 0.24,
      fxVolume: 0.18,
    };

    if (voice) {
      const source = audioContext.createMediaElementSource(voice);
      const gain = audioContext.createGain();
      gain.gain.value = gainSettings.voiceVolume;
      source.connect(gain).connect(audioDestination);
    }

    if (music) {
      const source = audioContext.createMediaElementSource(music);
      const gain = audioContext.createGain();
      gain.gain.value = gainSettings.musicVolume;
      source.connect(gain).connect(audioDestination);
    }

    const recorder = new MediaRecorder(combinedStream, { mimeType: recorderMimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const completion = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || recorderMimeType }));
      };
    });

    const drawFrame = () => {
      if (video) {
        context.drawImage(video, 0, 0, width, height);
      } else if (image) {
        context.drawImage(image, 0, 0, width, height);
      }
    };

    let rafId = 0;
    const renderLoop = () => {
      drawFrame();
      rafId = window.requestAnimationFrame(renderLoop);
    };

    recorder.start();
    await audioContext.resume();
    drawFrame();
    renderLoop();

    if (video) {
      video.currentTime = 0;
      await safePlay(video);
    }
    if (voice) {
      voice.currentTime = 0;
      await safePlay(voice);
    }
    if (music) {
      music.currentTime = 0;
      music.loop = durationSeconds > (music.duration || 0) && music.duration > 0;
      await safePlay(music);
    }

    await new Promise((resolve) => window.setTimeout(resolve, durationSeconds * 1000));

    window.cancelAnimationFrame(rafId);
    recorder.stop();
    video?.pause();
    voice?.pause();
    music?.pause();

    const blob = await completion;
    const persisted = await persistBlobMediaAsset(blob, {
      kind: 'video',
      generationId: input.generationId,
      fileExtension: 'webm',
    });

    if (!persisted) {
      warnings.push('Final media was assembled but could not be persisted as a durable asset.');
    }

    return { asset: persisted, warnings };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Final assembly failed.');
    return { asset: null, warnings };
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}

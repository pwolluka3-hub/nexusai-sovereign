import type { AIModel } from '@/lib/types';
import { kvDelete, kvGet, kvSet } from './puterService';

export const DISABLE_PUTER_FALLBACK_KEY = 'disable_puter_fallback';
export const PROVIDER_EVENT_NAME = 'nexus:provider-event';
export const PROVIDER_STATE_EVENT_NAME = 'nexus:provider-state';
export const CHAT_MODEL_EVENT_NAME = 'nexus:chat-model';

export type ProviderEventDetail =
  | {
      type: 'provider_switched';
      from: string;
      to: string;
      model: string;
      message: string;
    }
  | {
      type: 'puter_fallback_disabled';
      provider: string;
      model: string;
      message: string;
    }
  | {
      type: 'puter_credit_exhausted';
      provider: 'puter';
      model: string;
      message: string;
    };

export interface ProviderStateDetail {
  disablePuterFallback: boolean;
}

export interface ChatModelDetail {
  model: string;
}

const providerEventCooldown = new Map<string, number>();
const PROVIDER_EVENT_COOLDOWN_MS = 45000;

export async function isPuterFallbackDisabled(): Promise<boolean> {
  const raw = await kvGet(DISABLE_PUTER_FALLBACK_KEY);
  return raw === 'true';
}

export async function setPuterFallbackDisabled(disabled: boolean): Promise<boolean> {
  const success = disabled
    ? await kvSet(DISABLE_PUTER_FALLBACK_KEY, 'true')
    : await kvDelete(DISABLE_PUTER_FALLBACK_KEY);

  if (success) {
    dispatchProviderState({ disablePuterFallback: disabled });
  }

  return success;
}

export async function setActiveChatModel(model: string): Promise<boolean> {
  const [defaultResult, modelResult] = await Promise.all([
    kvSet('default_model', model),
    kvSet('ai_model', model),
  ]);
  const success = defaultResult && modelResult;

  if (success) {
    dispatchChatModelState({ model });
  }

  return success;
}

export function resolveProviderForModel(model: string, models: AIModel[]): string {
  return models.find((entry) => entry.model === model)?.provider || 'puter';
}

export function dispatchProviderEvent(detail: ProviderEventDetail): void {
  if (typeof window === 'undefined') return;

  const key =
    detail.type === 'provider_switched'
      ? `${detail.type}:${detail.from}:${detail.to}`
      : `${detail.type}:${detail.provider}`;
  const previous = providerEventCooldown.get(key) || 0;
  const now = Date.now();
  if (now - previous < PROVIDER_EVENT_COOLDOWN_MS) {
    return;
  }

  providerEventCooldown.set(key, now);
  window.dispatchEvent(new CustomEvent<ProviderEventDetail>(PROVIDER_EVENT_NAME, { detail }));
}

export function dispatchProviderState(detail: ProviderStateDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ProviderStateDetail>(PROVIDER_STATE_EVENT_NAME, { detail }));
}

export function dispatchChatModelState(detail: ChatModelDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ChatModelDetail>(CHAT_MODEL_EVENT_NAME, { detail }));
}

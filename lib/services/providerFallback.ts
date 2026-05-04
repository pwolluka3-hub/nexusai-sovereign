export type RoutedProvider =
  | 'puter'
  | 'openrouter'
  | 'githubmodels'
  | 'poe'
  | 'bytez'
  | 'groq'
  | 'gemini'
  | 'deepseek'
  | 'nvidia'
  | 'together'
  | 'fireworks'
  | 'ollama';

export function buildFallbackProviders(
  preferredProvider: RoutedProvider,
  configuredProviders: RoutedProvider[],
  options: { disablePuterFallback?: boolean } = {}
): RoutedProvider[] {
  const { disablePuterFallback = false } = options;
  const orderedProviders = [
    preferredProvider,
    ...configuredProviders.filter((provider) => provider !== preferredProvider),
  ];

  if (preferredProvider === 'puter') {
    return Array.from(new Set(orderedProviders));
  }

  // When a non-Puter provider is selected, keep fallback within non-Puter providers.
  // This prevents hidden fallback attempts from re-triggering Puter credit errors.
  if (!disablePuterFallback) {
    const nonPuterProviders = orderedProviders.filter((provider) => provider !== 'puter');
    return Array.from(new Set(nonPuterProviders.length > 0 ? nonPuterProviders : [preferredProvider]));
  }

  const nonPuterProviders = orderedProviders.filter((provider) => provider !== 'puter');
  return Array.from(new Set(nonPuterProviders.length > 0 ? nonPuterProviders : [preferredProvider]));
}

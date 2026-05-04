/**
 * Environment variable validation
 * Validates all required configuration at startup and provides clear error messages
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  providers: {
    openai?: string;
    anthropic?: string;
    groq?: string;
    gemini?: string;
    elevenlabs?: string;
    runwayml?: string;
  };
  puterEnabled: boolean;
}

export class EnvValidationError extends Error {
  constructor(message: string, public missing: string[], public empty: string[]) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate environment variables at startup
 * Returns configuration or throws EnvValidationError
 */
export function validateEnvironment(): EnvConfig {
  const missing: string[] = [];
  const empty: string[] = [];

  // Core Supabase (optional if using guest mode only)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl) {
    empty.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    empty.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // AI Provider Keys (optional - feature gates by provider)
  const providers = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY,
    runwayml: process.env.RUNWAYML_API_KEY,
  };

  const enabledProviders = Object.entries(providers)
    .filter(([_, key]) => key)
    .reduce((acc, [name, key]) => ({ ...acc, [name]: key }), {});

  const puterEnabled = !!process.env.NEXT_PUBLIC_PUTER_DOMAIN;

  // Warn if no providers configured
  if (Object.keys(enabledProviders).length === 0) {
    console.warn(
      '[EnvValidation] No AI provider keys configured. Content generation will be unavailable. ' +
      'Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.'
    );
  }

  // If Supabase is misconfigured, warn (guest mode can still work)
  if ((!!supabaseUrl) !== (!!supabaseAnonKey)) {
    console.warn(
      '[EnvValidation] Supabase configuration is incomplete. Auth will fall back to guest mode. ' +
      'Configure both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for full features.'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    providers: enabledProviders as typeof providers,
    puterEnabled,
  };
}

/**
 * Get a specific provider key or throw
 */
export function getProviderKey(provider: string): string {
  const config = validateEnvironment();
  const key = config.providers[provider as keyof typeof config.providers];

  if (!key) {
    throw new EnvValidationError(
      `Provider ${provider} is not configured`,
      [],
      [`${provider.toUpperCase()}_API_KEY`]
    );
  }

  return key;
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(provider: string): boolean {
  try {
    const config = validateEnvironment();
    return !!config.providers[provider as keyof typeof config.providers];
  } catch {
    return false;
  }
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): string[] {
  const config = validateEnvironment();
  return Object.keys(config.providers).filter(
    (k) => config.providers[k as keyof typeof config.providers]
  );
}

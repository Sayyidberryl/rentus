function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}

/**
 * Reads and normalizes public Supabase environment variables.
 * Uses direct property access so Next.js statically inlines NEXT_PUBLIC_* into client bundles.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey =
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  const validUrl = /^https?:\/\/.+/i.test(url);

  return {
    url,
    anonKey,
    configured: Boolean(validUrl && anonKey.length > 0),
  };
}


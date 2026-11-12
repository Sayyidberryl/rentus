import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function requirePublicConfig() {
  const { url, anonKey, configured } = getSupabasePublicConfig();
  if (!configured) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    );
  }
  return { url, anonKey };
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requirePublicConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called inside a Server Component; proxy.ts handles cookie refresh.
        }
      },
    },
  });
}

/**
 * Ephemeral non-persisting client used when an Admin registers a new staff/owner
 * account without replacing the Admin's own active cookie session.
 */
export function createEphemeralAuthClient() {
  const { url, anonKey } = requirePublicConfig();
  return createSupabaseJsClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

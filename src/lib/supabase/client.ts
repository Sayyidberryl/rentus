import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const { url, anonKey, configured } = getSupabasePublicConfig();
  if (!configured) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    );
  }
  return createBrowserClient(url, anonKey);
}

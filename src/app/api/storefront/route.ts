import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext } from "@/lib/rbac";

export async function GET() {
  if (!getSupabasePublicConfig().configured) {
    return NextResponse.json(
      {
        error:
          "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const [itemsRes, settingsRes, rbac] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("is_active", true)
      .order("popularity_score", { ascending: false }),
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    getServerRbacContext(),
  ]);

  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: itemsRes.data || [],
    settings: settingsRes.data || null,
    rbac,
  });
}


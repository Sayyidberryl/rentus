import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext } from "@/lib/rbac";

export async function GET() {
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


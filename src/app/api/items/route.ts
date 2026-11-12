import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";
import { slugify } from "@/lib/format";

const itemSchema = z.object({
  name: z.string().trim().min(2).max(100),
  name_id: z.string().trim().max(100).default(""),
  description: z.string().trim().max(800).default(""),
  description_id: z.string().trim().max(800).default(""),
  category: z.enum(["Study", "Tech", "Creative", "Lifestyle", "Events", "Other"]),
  emoji: z.string().trim().min(1).max(10).default("📦"),
  tone: z.enum(["blue", "yellow", "green", "pink", "lavender", "peach"]).default("blue"),
  image_url: z.string().trim().nullable().optional(),
  price_per_day: z.coerce.number().int().min(1000).max(50000000),
  deposit_amount: z.coerce.number().int().min(0).max(50000000).default(0),
  max_days: z.coerce.number().int().min(1).max(30).default(3),
  stock_total: z.coerce.number().int().min(1).max(100).default(1),
  stock_available: z.coerce.number().int().min(0).max(100).default(1),
  location: z.string().trim().min(2).max(120),
  condition: z.string().trim().min(2).max(60).default("Good condition"),
  condition_id: z.string().trim().max(60).default("Kondisi baik"),
  payout_bank: z.string().trim().max(40).default(""),
  payout_holder: z.string().trim().max(100).default(""),
  payout_number: z.string().trim().max(60).default(""),
  is_active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const scope = new URL(req.url).searchParams.get("scope");
  const rbac = await getServerRbacContext();

  let query = supabase.from("items").select("*").order("created_at", { ascending: false });

  if (scope === "mine" && rbac.authenticated && rbac.profile) {
    query = query.eq("owner_id", rbac.profile.id);
  } else if (scope === "all" && (hasPermission(rbac, "items:manage_all") || hasPermission(rbac, "items:toggle_availability"))) {
    // Admin / Staff see all items including inactive
  } else {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const canManageAll = hasPermission(rbac, "items:manage_all");
  const canCreateOwn = hasPermission(rbac, "items:create_own");
  if (!canManageAll && !canCreateOwn) {
    return NextResponse.json({ error: "Forbidden: missing item creation permission" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = itemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid item payload" },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const supabase = await createServerSupabaseClient();

  const insertPayload = {
    slug: slugify(p.name),
    name: p.name,
    name_id: p.name_id || p.name,
    description: p.description,
    description_id: p.description_id || p.description,
    category: p.category,
    emoji: p.emoji,
    tone: p.tone,
    image_url: p.image_url || null,
    price_per_day: p.price_per_day,
    deposit_amount: p.deposit_amount,
    max_days: p.max_days,
    stock_total: p.stock_total,
    stock_available: Math.min(p.stock_total, p.stock_available),
    location: p.location,
    condition: p.condition,
    condition_id: p.condition_id || p.condition,
    owner_id: rbac.profile.id,
    owner_name: rbac.profile.full_name || rbac.profile.email.split("@")[0],
    owner_email: rbac.profile.email,
    payout_bank: p.payout_bank || rbac.profile.payout_bank || "",
    payout_holder: p.payout_holder || rbac.profile.payout_holder || "",
    payout_number: p.payout_number || rbac.profile.payout_number || "",
    is_active: p.is_active,
  };

  const { data, error } = await supabase
    .from("items")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}


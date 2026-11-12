import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";

const updateItemSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  name_id: z.string().trim().max(100).optional(),
  description: z.string().trim().max(800).optional(),
  description_id: z.string().trim().max(800).optional(),
  category: z.enum(["Study", "Tech", "Creative", "Lifestyle", "Events", "Other"]).optional(),
  emoji: z.string().trim().min(1).max(10).optional(),
  tone: z.enum(["blue", "yellow", "green", "pink", "lavender", "peach"]).optional(),
  image_url: z.string().trim().nullable().optional(),
  price_per_day: z.coerce.number().int().min(1000).max(50000000).optional(),
  deposit_amount: z.coerce.number().int().min(0).max(50000000).optional(),
  max_days: z.coerce.number().int().min(1).max(30).optional(),
  stock_total: z.coerce.number().int().min(1).max(100).optional(),
  stock_available: z.coerce.number().int().min(0).max(100).optional(),
  location: z.string().trim().min(2).max(120).optional(),
  condition: z.string().trim().min(2).max(60).optional(),
  condition_id: z.string().trim().max(60).optional(),
  payout_bank: z.string().trim().max(40).optional(),
  payout_holder: z.string().trim().max(100).optional(),
  payout_number: z.string().trim().max(60).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid item update payload" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const canManageAll = hasPermission(rbac, "items:manage_all");
  const canUpdateOwn = hasPermission(rbac, "items:update_own");
  const canToggle = hasPermission(rbac, "items:toggle_availability");

  // Staff with only items:toggle_availability use the dedicated RPC
  if (!canManageAll && !canUpdateOwn && canToggle) {
    const { data, error } = await supabase.rpc("staff_toggle_item_availability", {
      p_item_id: itemId,
      p_is_active: parsed.data.is_active ?? null,
      p_stock_available: parsed.data.stock_available ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ item: data });
  }

  if (!canManageAll && !canUpdateOwn) {
    return NextResponse.json({ error: "Forbidden: missing item update permission" }, { status: 403 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (!canManageAll && existing.owner_id !== rbac.profile.id) {
    return NextResponse.json({ error: "Forbidden: you can only edit your own items" }, { status: 403 });
  }

  const updates = { ...parsed.data };
  if (updates.stock_total !== undefined && updates.stock_available === undefined) {
    updates.stock_available = Math.min(updates.stock_total, existing.stock_available);
  } else if (updates.stock_total !== undefined && updates.stock_available !== undefined) {
    updates.stock_available = Math.min(updates.stock_total, updates.stock_available);
  }

  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const canManageAll = hasPermission(rbac, "items:manage_all");
  const canDeleteOwn = hasPermission(rbac, "items:delete_own");
  if (!canManageAll && !canDeleteOwn) {
    return NextResponse.json({ error: "Forbidden: missing item delete permission" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("items")
    .select("id, owner_id")
    .eq("id", itemId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (!canManageAll && existing.owner_id !== rbac.profile.id) {
    return NextResponse.json({ error: "Forbidden: you can only delete your own items" }, { status: 403 });
  }

  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23503"
            ? "Cannot delete item with existing booking history; deactivate it instead."
            : error.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}


import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";

const bankAccountSchema = z.object({
  code: z.string().trim().min(1).max(30),
  label: z.string().trim().min(1).max(80),
  account_number: z.string().trim().min(1).max(60),
  account_holder: z.string().trim().min(1).max(80),
});

const updateSettingsSchema = z.object({
  store_name: z.string().trim().min(2).max(60).optional(),
  admin_whatsapp: z.string().trim().min(8).max(30).optional(),
  admin_display_name: z.string().trim().min(2).max(80).optional(),
  pickup_hub: z.string().trim().min(2).max(150).optional(),
  qris_mode: z.enum(["dummy_generated", "custom_image"]).optional(),
  qris_image_url: z.string().trim().nullable().optional(),
  qris_merchant_name: z.string().trim().min(2).max(80).optional(),
  qris_nmid: z.string().trim().min(4).max(40).optional(),
  qris_note_en: z.string().trim().max(300).optional(),
  qris_note_id: z.string().trim().max(300).optional(),
  bank_accounts: z.array(bankAccountSchema).optional(),
  service_fee_pct: z.coerce.number().min(0).max(50).optional(),
  owner_commission_pct: z.coerce.number().min(0).max(50).optional(),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

export async function PATCH(req: NextRequest) {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const canQris = hasPermission(rbac, "settings:manage_payment_qris");
  const canContact = hasPermission(rbac, "settings:manage_admin_contact");
  if (!canQris && !canContact) {
    return NextResponse.json(
      { error: "Forbidden: only administrators can modify store & QRIS settings" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings payload" },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_update_store_settings", {
    p_store_name: p.store_name ?? null,
    p_admin_whatsapp: p.admin_whatsapp ?? null,
    p_admin_display_name: p.admin_display_name ?? null,
    p_pickup_hub: p.pickup_hub ?? null,
    p_qris_mode: p.qris_mode ?? null,
    p_qris_image_url: p.qris_image_url === undefined ? null : p.qris_image_url ?? "",
    p_qris_merchant_name: p.qris_merchant_name ?? null,
    p_qris_nmid: p.qris_nmid ?? null,
    p_qris_note_en: p.qris_note_en ?? null,
    p_qris_note_id: p.qris_note_id ?? null,
    p_bank_accounts: p.bank_accounts ?? null,
    p_service_fee_pct: p.service_fee_pct ?? null,
    p_owner_commission_pct: p.owner_commission_pct ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ settings: data });
}


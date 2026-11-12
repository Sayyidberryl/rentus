import React from "react";
import { StorefrontApp } from "@/components/StorefrontApp";
import { getServerRbacContext } from "@/lib/rbac";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RentalItem, StoreSettings } from "@/types/rental";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  store_name: "RentUs",
  admin_whatsapp: "6281234567890",
  admin_display_name: "Admin RentUs",
  pickup_hub: "Student Center",
  qris_mode: "dummy_generated",
  qris_image_url: null,
  qris_merchant_name: "RENTUS CAMPUS RENTAL",
  qris_nmid: "ID102026000088991",
  qris_note_en: "Scan the QRIS code and upload your payment screenshot.",
  qris_note_id: "Scan kode QRIS ini dan unggah bukti pembayaran Anda.",
  bank_accounts: [
    {
      code: "QRIS",
      label: "QRIS (All E-Wallet & Mobile Banking)",
      account_number: "QRIS Instant",
      account_holder: "RENTUS CAMPUS RENTAL",
    },
  ],
  service_fee_pct: 5,
  owner_commission_pct: 15,
};

export default async function HomePage() {
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

  const items = (itemsRes.data || []) as RentalItem[];
  const settings = (settingsRes.data || DEFAULT_SETTINGS) as StoreSettings;

  return (
    <StorefrontApp
      initialItems={items}
      initialSettings={settings}
      initialRbac={rbac}
    />
  );
}

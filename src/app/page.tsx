import React from "react";
import { StorefrontApp } from "@/components/StorefrontApp";
import { getServerRbacContext } from "@/lib/rbac";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RbacContext, RentalItem, StoreSettings } from "@/types/rental";

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

type StorefrontLoadResult =
  | { ok: true; items: RentalItem[]; settings: StoreSettings; rbac: RbacContext }
  | { ok: false; reason?: string };

async function loadInitialStorefront(): Promise<StorefrontLoadResult> {
  const { configured } = getSupabasePublicConfig();
  if (!configured) {
    return { ok: false };
  }

  try {
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
      return { ok: false, reason: itemsRes.error.message };
    }

    return {
      ok: true,
      items: (itemsRes.data || []) as RentalItem[],
      settings: (settingsRes.data || DEFAULT_SETTINGS) as StoreSettings,
      rbac,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to connect to Supabase",
    };
  }
}

function MissingEnvScreen({ reason }: { reason?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xl sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--yellow-soft)] px-3 py-1 text-xs font-extrabold text-[var(--warn-ink)]">
          RentUs · Deployment Setup Required
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-[var(--ink)]">
          Konfigurasi Supabase Belum Terpasang di Server
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Aplikasi sudah ter-deploy, tetapi Environment Variables Supabase belum terbaca pada
          deployment ini. Tambahkan variabel berikut di{" "}
          <strong>Vercel → Project Settings → Environment Variables</strong>, lalu lakukan{" "}
          <strong>Redeploy</strong>:
        </p>

        <ul className="font-mono-num mt-4 space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-xs text-[var(--ink)]">
          <li>1. NEXT_PUBLIC_SUPABASE_URL</li>
          <li>2. NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>3. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
        </ul>

        {reason ? (
          <p className="mt-3 rounded-xl bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs font-semibold text-[var(--danger-ink)]">
            Detail: {reason}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default async function HomePage() {
  const result = await loadInitialStorefront();
  if (!result.ok) {
    return <MissingEnvScreen reason={result.reason} />;
  }

  return (
    <StorefrontApp
      initialItems={result.items}
      initialSettings={result.settings}
      initialRbac={result.rbac}
    />
  );
}

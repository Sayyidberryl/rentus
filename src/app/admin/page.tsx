import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminConsoleClient } from "@/components/AdminConsoleClient";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AuditLog,
  Booking,
  PermissionDefinition,
  Profile,
  RentalItem,
  RoleDefinition,
  RolePermissionEntry,
  StoreSettings,
} from "@/types/rental";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    redirect("/login?next=/admin");
  }

  const canEnterConsole =
    hasPermission(rbac, "bookings:view_all") ||
    hasPermission(rbac, "items:manage_all") ||
    hasPermission(rbac, "settings:manage_payment_qris") ||
    hasPermission(rbac, "rbac:view_users");

  if (!canEnterConsole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] p-6">
        <div className="max-w-md rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger-ink)]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--ink)]">
            403 · Akses Dibatasi / Access Restricted
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Role Anda saat ini (<strong>{rbac.role}</strong>) tidak memiliki izin untuk membuka
            Konsol Admin / Staff. Gunakan Panel Mitra atau kembali ke katalog.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[var(--blue)] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Panel Mitra
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-bold text-[var(--ink)]"
            >
              Katalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const [
    settingsRes,
    itemsRes,
    bookingsRes,
    rolesRes,
    permsRes,
    rolePermsRes,
    profilesRes,
    logsRes,
  ] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    supabase.from("items").select("*").order("created_at", { ascending: false }),
    hasPermission(rbac, "bookings:view_all")
      ? supabase
          .from("bookings")
          .select("*, extensions:booking_extensions(*)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("roles").select("*").order("level", { ascending: false }),
    supabase.from("permissions").select("*").order("category", { ascending: true }),
    supabase.from("role_permissions").select("*"),
    hasPermission(rbac, "rbac:view_users")
      ? supabase.from("profiles").select("*").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    hasPermission(rbac, "audit:view")
      ? supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(80)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AdminConsoleClient
      rbac={rbac}
      initialSettings={settingsRes.data as StoreSettings}
      initialItems={(itemsRes.data || []) as RentalItem[]}
      initialBookings={(bookingsRes.data || []) as Booking[]}
      initialRoles={(rolesRes.data || []) as RoleDefinition[]}
      initialPermissions={(permsRes.data || []) as PermissionDefinition[]}
      initialRolePermissions={(rolePermsRes.data || []) as RolePermissionEntry[]}
      initialProfiles={(profilesRes.data || []) as Profile[]}
      initialAuditLogs={(logsRes.data || []) as AuditLog[]}
    />
  );
}


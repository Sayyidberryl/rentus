import React from "react";
import { redirect } from "next/navigation";
import { OwnerDashboardClient } from "@/components/OwnerDashboardClient";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Booking, RentalItem } from "@/types/rental";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    redirect("/login?next=/dashboard");
  }

  const canAccess =
    hasPermission(rbac, "items:create_own") ||
    hasPermission(rbac, "items:manage_all") ||
    hasPermission(rbac, "bookings:view_own_listings");

  if (!canAccess) {
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();
  const [itemsRes, bookingsRes] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("owner_id", rbac.profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, extensions:booking_extensions(*)")
      .eq("owner_id", rbac.profile.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <OwnerDashboardClient
      rbac={rbac}
      initialItems={(itemsRes.data || []) as RentalItem[]}
      initialBookings={(bookingsRes.data || []) as Booking[]}
    />
  );
}


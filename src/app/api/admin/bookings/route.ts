import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";

const patchBookingSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify_payment"),
    booking_id: z.string().uuid(),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(240).default(""),
  }),
  z.object({
    action: z.literal("update_status"),
    booking_id: z.string().uuid(),
    status: z.enum([
      "pending_payment",
      "waiting_verification",
      "active",
      "overdue",
      "return_pending",
      "returned",
      "cancelled",
    ]),
  }),
  z.object({
    action: z.literal("confirm_owner_return"),
    booking_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("resolve_extension"),
    extension_id: z.string().uuid(),
    decision: z.enum(["approve", "reject"]),
  }),
]);

export async function GET(req: NextRequest) {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const canViewAll = hasPermission(rbac, "bookings:view_all");
  const canViewOwn = hasPermission(rbac, "bookings:view_own_listings");
  if (!canViewAll && !canViewOwn) {
    return NextResponse.json({ error: "Forbidden: missing booking view permission" }, { status: 403 });
  }

  const scope = new URL(req.url).searchParams.get("scope");
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("bookings")
    .select("*, extensions:booking_extensions(*)")
    .order("created_at", { ascending: false });

  if (!canViewAll || scope === "mine") {
    query = query.eq("owner_id", rbac.profile.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data || [] });
}

export async function PATCH(req: NextRequest) {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const payload = parsed.data;

  if (payload.action === "verify_payment") {
    if (!hasPermission(rbac, "bookings:verify_payment")) {
      return NextResponse.json({ error: "Forbidden: missing bookings:verify_payment" }, { status: 403 });
    }
    const { data, error } = await supabase.rpc("staff_verify_payment", {
      p_booking_id: payload.booking_id,
      p_decision: payload.decision,
      p_note: payload.note,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ booking: data });
  }

  if (payload.action === "update_status") {
    if (!hasPermission(rbac, "bookings:update_status")) {
      return NextResponse.json({ error: "Forbidden: missing bookings:update_status" }, { status: 403 });
    }
    const { data, error } = await supabase.rpc("staff_update_booking_status", {
      p_booking_id: payload.booking_id,
      p_status: payload.status,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ booking: data });
  }

  if (payload.action === "confirm_owner_return") {
    if (!hasPermission(rbac, "bookings:confirm_owner_return")) {
      return NextResponse.json({ error: "Forbidden: missing bookings:confirm_owner_return" }, { status: 403 });
    }
    const { data, error } = await supabase.rpc("confirm_owner_return", {
      p_booking_id: payload.booking_id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ booking: data });
  }

  if (payload.action === "resolve_extension") {
    if (!hasPermission(rbac, "bookings:approve_extension")) {
      return NextResponse.json({ error: "Forbidden: missing bookings:approve_extension" }, { status: 403 });
    }
    const { data, error } = await supabase.rpc("resolve_booking_extension", {
      p_extension_id: payload.extension_id,
      p_decision: payload.decision,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ extension: data });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}


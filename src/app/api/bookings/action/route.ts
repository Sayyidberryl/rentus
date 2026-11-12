import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("attach_proof"),
    booking_code: z.string().trim().min(3),
    tracking_token: z.string().trim().min(3),
    payment_method: z.string().trim().min(2).max(40),
    payment_proof_url: z.string().trim().url(),
    payment_reference: z.string().trim().max(120).optional(),
  }),
  z.object({
    action: z.literal("confirm_return"),
    booking_code: z.string().trim().min(3),
    tracking_token: z.string().trim().min(3),
  }),
  z.object({
    action: z.literal("request_extension"),
    booking_code: z.string().trim().min(3),
    tracking_token: z.string().trim().min(3),
    extra_days: z.coerce.number().int().min(1).max(14),
    payment_method: z.string().trim().min(2).max(40).default("QRIS"),
    payment_proof_url: z.string().trim().nullable().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid action request" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const payload = parsed.data;

    if (payload.action === "attach_proof") {
      const { data, error } = await supabase.rpc("guest_attach_payment_proof", {
        p_booking_code: payload.booking_code,
        p_tracking_token: payload.tracking_token,
        p_payment_method: payload.payment_method,
        p_payment_proof_url: payload.payment_proof_url,
        p_payment_reference: payload.payment_reference ?? null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ booking: data });
    }

    if (payload.action === "confirm_return") {
      const { data, error } = await supabase.rpc("guest_confirm_return", {
        p_booking_code: payload.booking_code,
        p_tracking_token: payload.tracking_token,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ booking: data });
    }

    if (payload.action === "request_extension") {
      const { data, error } = await supabase.rpc("guest_request_extension", {
        p_booking_code: payload.booking_code,
        p_tracking_token: payload.tracking_token,
        p_extra_days: payload.extra_days,
        p_payment_method: payload.payment_method,
        p_payment_proof_url: payload.payment_proof_url ?? null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ extension: data });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}


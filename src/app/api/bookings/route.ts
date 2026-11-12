import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createBookingSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  days: z.coerce.number().int().min(1).max(30),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  renter_name: z.string().trim().min(2).max(120),
  renter_phone: z.string().trim().min(8).max(30),
  renter_email: z.string().trim().email().or(z.literal("")).default(""),
  renter_identity_type: z.enum(["KTM", "KTP", "SIM", "PASSPORT"]).default("KTM"),
  renter_identity_number: z.string().trim().min(4).max(60),
  renter_address: z.string().trim().min(3).max(240),
  renter_notes: z.string().trim().max(400).default(""),
  payment_method: z.string().trim().min(2).max(40).default("QRIS"),
  payment_proof_url: z.string().trim().nullable().optional(),
  payment_reference: z.string().trim().max(120).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = createBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid booking payload" },
        { status: 400 }
      );
    }

    const p = parsed.data;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("create_guest_booking", {
      p_item_id: p.item_id,
      p_days: p.days,
      p_quantity: p.quantity,
      p_renter_name: p.renter_name,
      p_renter_phone: p.renter_phone,
      p_renter_email: p.renter_email,
      p_renter_identity_type: p.renter_identity_type,
      p_renter_identity_number: p.renter_identity_number,
      p_renter_address: p.renter_address,
      p_renter_notes: p.renter_notes,
      p_payment_method: p.payment_method,
      p_payment_proof_url: p.payment_proof_url ?? null,
      p_payment_reference: p.payment_reference ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const contact = searchParams.get("contact");
  const tokensRaw = searchParams.get("tokens");

  if (code && contact) {
    const { data, error } = await supabase.rpc("lookup_rental_by_code", {
      p_booking_code: code,
      p_contact: contact,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ booking: data });
  }

  if (tokensRaw) {
    try {
      const parsed = JSON.parse(tokensRaw);
      const { data, error } = await supabase.rpc("lookup_rentals_by_tokens", {
        p_tokens: parsed,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ bookings: data || [] });
    } catch {
      return NextResponse.json({ error: "Invalid tokens JSON" }, { status: 400 });
    }
  }

  return NextResponse.json({ bookings: [] });
}


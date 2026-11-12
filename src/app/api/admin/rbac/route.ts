import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createEphemeralAuthClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerRbacContext, hasPermission } from "@/lib/rbac";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(80),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).default(""),
  role: z.enum(["admin", "staff", "owner", "renter"]).default("staff"),
});

const patchRbacSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_user_role"),
    user_id: z.string().uuid(),
    role: z.enum(["admin", "staff", "owner", "renter"]),
    is_active: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("toggle_permission"),
    role_name: z.enum(["admin", "staff", "owner", "renter"]),
    permission_code: z.string().trim().min(2),
    enabled: z.boolean(),
  }),
]);

export async function GET() {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !rbac.profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const canViewUsers = hasPermission(rbac, "rbac:view_users");
  const canViewAudit = hasPermission(rbac, "audit:view");
  if (!canViewUsers && !canViewAudit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const [rolesRes, permsRes, rolePermsRes, profilesRes, logsRes] = await Promise.all([
    supabase.from("roles").select("*").order("level", { ascending: false }),
    supabase.from("permissions").select("*").order("category", { ascending: true }),
    supabase.from("role_permissions").select("*"),
    canViewUsers
      ? supabase.from("profiles").select("*").order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canViewAudit
      ? supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(80)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return NextResponse.json({
    roles: rolesRes.data || [],
    permissions: permsRes.data || [],
    role_permissions: rolePermsRes.data || [],
    profiles: profilesRes.data || [],
    audit_logs: logsRes.data || [],
  });
}

export async function POST(req: NextRequest) {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !hasPermission(rbac, "rbac:manage_roles")) {
    return NextResponse.json({ error: "Forbidden: missing rbac:manage_roles" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid user payload" },
      { status: 400 }
    );
  }

  const { email, password, full_name, phone, role } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { url: supabaseUrl } = getSupabasePublicConfig();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  let newUserId: string | null = null;
  let emailConfirmed = false;

  if (serviceKey && supabaseUrl) {
    const adminClient = createSupabaseAdmin(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Failed to create user" }, { status: 400 });
    }
    newUserId = data.user.id;
    emailConfirmed = true;
  } else {
    const ephemeral = createEphemeralAuthClient();
    const { data, error } = await ephemeral.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone },
      },
    });
    if (error || !data.user) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Signup failed (check Supabase Auth email rate limits or configure SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 400 }
      );
    }
    newUserId = data.user.id;
    emailConfirmed = Boolean(data.session);
  }

  // Assign requested RBAC role via Admin RPC using Admin's own authenticated session
  const { data: updatedProfile, error: roleError } = await supabase.rpc("admin_update_user_role", {
    p_target_user_id: newUserId,
    p_new_role: role,
    p_is_active: true,
  });

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      profile: updatedProfile,
      email_confirmed: emailConfirmed,
    },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  const rbac = await getServerRbacContext();
  if (!rbac.authenticated || !hasPermission(rbac, "rbac:manage_roles")) {
    return NextResponse.json({ error: "Forbidden: missing rbac:manage_roles" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchRbacSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid RBAC update payload" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const payload = parsed.data;

  if (payload.action === "update_user_role") {
    const { data, error } = await supabase.rpc("admin_update_user_role", {
      p_target_user_id: payload.user_id,
      p_new_role: payload.role,
      p_is_active: payload.is_active,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ profile: data });
  }

  if (payload.action === "toggle_permission") {
    const { data, error } = await supabase.rpc("admin_toggle_role_permission", {
      p_role_name: payload.role_name,
      p_permission_code: payload.permission_code,
      p_enabled: payload.enabled,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ result: data });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}


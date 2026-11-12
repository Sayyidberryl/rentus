import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RbacContext, RoleName } from "@/types/rental";

const GUEST_RBAC: RbacContext = {
  authenticated: false,
  role: "guest",
  is_active: true,
  permissions: [],
  profile: null,
};

export async function getServerRbacContext(): Promise<RbacContext> {
  if (!getSupabasePublicConfig().configured) {
    return GUEST_RBAC;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return GUEST_RBAC;
    }

    const { data, error } = await supabase.rpc("get_my_rbac_context");
    if (error || !data) {
      return {
        authenticated: true,
        role: "guest",
        is_active: false,
        permissions: [],
        profile: null,
      };
    }

    return data as RbacContext;
  } catch {
    return GUEST_RBAC;
  }
}

export function hasPermission(ctx: RbacContext, permission: string): boolean {
  if (!ctx.authenticated || !ctx.is_active) return false;
  return ctx.permissions.includes(permission);
}

export function hasAnyRole(ctx: RbacContext, roles: RoleName[]): boolean {
  if (!ctx.authenticated || !ctx.is_active) return false;
  return roles.includes(ctx.role);
}

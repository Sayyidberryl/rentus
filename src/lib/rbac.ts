import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RbacContext, RoleName } from "@/types/rental";

export async function getServerRbacContext(): Promise<RbacContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authenticated: false,
      role: "guest",
      is_active: true,
      permissions: [],
      profile: null,
    };
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
}

export function hasPermission(ctx: RbacContext, permission: string): boolean {
  if (!ctx.authenticated || !ctx.is_active) return false;
  return ctx.permissions.includes(permission);
}

export function hasAnyRole(ctx: RbacContext, roles: RoleName[]): boolean {
  if (!ctx.authenticated || !ctx.is_active) return false;
  return roles.includes(ctx.role);
}


import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../supabase";

export class AccessError extends Error {
  constructor(public status: 401 | 403 | 503) {
    super(status === 401 ? "Please log in to continue." : status === 403 ? "You do not have administrator access." : "Access could not be verified. Please try again.");
  }
}

export async function verifiedUser(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessError(401);
  return data.user;
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const db = getSupabaseClient();
  const assignments = await db.from("user_roles").select("role_id").eq("user_id", userId);
  if (assignments.error) throw new AccessError(503);
  if (!assignments.data?.length) return false;
  const grants = await db.from("role_permissions").select("permission")
    .in("role_id", assignments.data.map((role) => role.role_id)).eq("permission", permission).limit(1);
  if (grants.error) throw new AccessError(503);
  return Boolean(grants.data?.length);
}

export async function requirePermission(client: SupabaseClient, permission: string) {
  const user = await verifiedUser(client);
  if (!await hasPermission(user.id, permission)) throw new AccessError(403);
  return user;
}

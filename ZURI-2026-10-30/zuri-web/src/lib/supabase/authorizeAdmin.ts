import "server-only";
import { createServerSupabaseClient } from "./server";
import { createAdminClient } from "./admin";

export async function getAuthorizedAdmin() {
  const authClient = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return { error: "Authentication required.", status: 401 };
  }

  const adminClient = createAdminClient();

  const { data: admin, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return { error: "Authorization check failed.", status: 500 };
  }

  if (!admin) {
    return { error: "Administrator access required.", status: 403 };
  }

  return { userId: user.id, user, adminClient };
}


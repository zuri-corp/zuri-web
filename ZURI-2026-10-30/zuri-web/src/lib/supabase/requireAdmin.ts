import "server-only";
import { redirect } from "next/navigation";
import { getAuthorizedAdmin } from "./authorizeAdmin";
export async function requireAdmin() {
  const authorization = await getAuthorizedAdmin();
  if ("error" in authorization) {
    if (authorization.status === 401) redirect("/admin/login");
    if (authorization.status === 403) redirect("/admin/login?error=unauthorized");
    throw new Error("Unable to verify administrator access.");
  }
  return authorization.user;
}

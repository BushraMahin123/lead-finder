import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/admin";
import { displayNameFromEmail } from "@/lib/user-display";
import UserMenuDropdown from "@/components/UserMenuDropdown";

export default async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;
  const userId =
    typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!email) {
    return null;
  }

  const name = displayNameFromEmail(email);
  const showAdmin = userId ? await isSuperAdmin(userId, data?.claims ?? null) : false;

  return (
    <UserMenuDropdown email={email} name={name} showAdmin={showAdmin} />
  );
}

import { createClient } from "@/lib/supabase/server";
import { displayNameFromEmail } from "@/lib/user-display";
import UserMenuDropdown from "@/components/UserMenuDropdown";

export default async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!email) {
    return null;
  }

  const name = displayNameFromEmail(email);

  return <UserMenuDropdown email={email} name={name} />;
}

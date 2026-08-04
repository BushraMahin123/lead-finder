import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import PhoneNumbersSettings from "@/components/PhoneNumbersSettings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PhoneNumbersPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen page-gradient">
      <AppHeader />
      <PhoneNumbersSettings />
    </main>
  );
}

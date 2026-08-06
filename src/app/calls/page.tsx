import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import CallLogsPage from "@/components/CallLogsPage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen page-gradient">
      <AppHeader />
      <CallLogsPage />
    </main>
  );
}

import AppHeader from "@/components/AppHeader";
import DashboardContent from "@/components/DashboardContent";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  return (
    <main className="min-h-screen page-gradient">
      <AppHeader />
      <DashboardContent userEmail={email} />
    </main>
  );
}

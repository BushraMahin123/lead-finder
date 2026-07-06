import AppHeader from "@/components/AppHeader";
import PricingContent from "@/components/PricingContent";
import PublicHeader from "@/components/PublicHeader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return (
    <main className="min-h-screen page-gradient">
      {isAuthenticated ? <AppHeader /> : <PublicHeader active="pricing" />}
      <PricingContent />
    </main>
  );
}

import AppHeader from "@/components/AppHeader";
import PricingContent from "@/components/PricingContent";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AppHeader />
      <PricingContent />
    </main>
  );
}

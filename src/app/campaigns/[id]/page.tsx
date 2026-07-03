import AppHeader from "@/components/AppHeader";
import CampaignContacts from "@/components/CampaignContacts";

export const dynamic = "force-dynamic";

export default function CampaignPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AppHeader />
      <CampaignContacts />
    </main>
  );
}

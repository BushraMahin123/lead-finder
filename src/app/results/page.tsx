import AppHeader from "@/components/AppHeader";
import SavedSearchResults from "@/components/SavedSearchResults";

export const dynamic = "force-dynamic";

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AppHeader />
      <SavedSearchResults />
    </main>
  );
}

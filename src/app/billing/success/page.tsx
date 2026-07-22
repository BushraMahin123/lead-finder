import { Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import BillingSuccessClient from "@/components/BillingSuccessClient";

export const dynamic = "force-dynamic";

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AppHeader />
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-slate-600">
            Confirming your payment…
          </div>
        }
      >
        <BillingSuccessClient />
      </Suspense>
    </main>
  );
}

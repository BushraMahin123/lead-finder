import { Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { createClient } from "@/lib/supabase/server";
import ContactForm from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return (
    <main className="min-h-screen page-gradient">
      {isAuthenticated ? <AppHeader /> : <PublicHeader active="contact" />}
      <Suspense fallback={<div className="flex-1" />}>
        <ContactForm />
      </Suspense>
      <PublicFooter />
    </main>
  );
}

import AdminUserDetail from "@/components/admin/AdminUserDetail";
import { getAdminUserDetail } from "@/lib/admin-data";
import { createAdminBillingPortalUrl } from "@/lib/admin-billing";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type AdminUserPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);

  if (!user) {
    notFound();
  }

  let portalUrl: string | null = null;
  if (user.billing.stripeCustomerId) {
    try {
      portalUrl = await createAdminBillingPortalUrl(userId);
    } catch {
      portalUrl = null;
    }
  }

  return <AdminUserDetail userId={userId} initialUser={user} initialPortalUrl={portalUrl} />;
}

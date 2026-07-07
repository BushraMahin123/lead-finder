import AdminCampaigns from "@/components/admin/AdminCampaigns";
import { listAdminCampaigns } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

type AdminCampaignsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminCampaignsPage({
  searchParams,
}: AdminCampaignsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const result = await listAdminCampaigns({ page, perPage: 20 });

  return (
    <AdminCampaigns
      initialCampaigns={result.campaigns}
      initialTotal={result.total}
      initialPage={page}
    />
  );
}

import AdminWaitlist from "@/components/admin/AdminWaitlist";
import { listAdminWaitlist } from "@/lib/admin-accounts";

export const dynamic = "force-dynamic";

type AdminWaitlistPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminWaitlistPage({
  searchParams,
}: AdminWaitlistPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const query = params.q?.trim() || undefined;

  const result = await listAdminWaitlist({ query, page, perPage: 20 });

  return (
    <AdminWaitlist
      initialSignups={result.signups}
      initialTotal={result.total}
      initialPage={page}
      initialQuery={query ?? ""}
    />
  );
}

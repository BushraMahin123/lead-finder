import AdminUsers from "@/components/admin/AdminUsers";
import { listAdminUsers } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const query = params.q?.trim() || undefined;

  const result = await listAdminUsers({ query, page, perPage: 20 });

  return (
    <AdminUsers
      initialUsers={result.users}
      initialTotal={result.total}
      initialPage={page}
      initialQuery={query ?? ""}
    />
  );
}

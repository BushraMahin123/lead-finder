import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { isSuperAdmin } from "@/lib/admin";
import { getAuthenticatedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getAuthenticatedUserId();
  if (!userId || !(await isSuperAdmin(userId))) {
    redirect("/?view=search");
  }

  return <AdminShell>{children}</AdminShell>;
}

import AdminDashboard from "@/components/admin/AdminDashboard";
import { getAdminStats, listRecentLedger } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, recentLedger] = await Promise.all([
    getAdminStats(),
    listRecentLedger(20),
  ]);

  return <AdminDashboard stats={stats} recentLedger={recentLedger} />;
}

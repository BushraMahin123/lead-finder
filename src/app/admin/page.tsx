import AdminDashboard from "@/components/admin/AdminDashboard";
import {
  getAdminStats,
  getAdminTelnyxBillingSummary,
  listRecentLedger,
} from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, recentLedger, telnyxBilling] = await Promise.all([
    getAdminStats(),
    listRecentLedger(20),
    getAdminTelnyxBillingSummary(),
  ]);

  return (
    <AdminDashboard
      stats={stats}
      recentLedger={recentLedger}
      telnyxBilling={telnyxBilling}
    />
  );
}

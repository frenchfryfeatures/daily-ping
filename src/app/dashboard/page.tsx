import { DailyPingDashboard } from "@/components/daily-ping-dashboard";
import { getDashboardSnapshot } from "@/lib/server/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();
  return <DailyPingDashboard snapshot={snapshot} />;
}

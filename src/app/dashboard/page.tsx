import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { getGreeting } from "@/features/dashboard/data/dashboard.data";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");
  const greeting = getGreeting();
  const userName = session.user.name ?? session.user.email ?? "Workspace User";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Home Dashboard"
        title={`${greeting}, ${userName}`}
        description="A simplified overview of the current workspace modules with clearer hierarchy, lighter spacing, and fewer competing panels."
      />
      <DashboardOverview />
    </div>
  );
}

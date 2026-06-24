import { AccessDenied } from "@/components/shared/AccessDenied";
import { ProcessDashboard } from "@/features/process/components/ProcessDashboard";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function ProcessPage() {
  const session = await requirePermission("process.view", "/dashboard/process");

  if (!session) {
    return <AccessDenied description="Your role cannot access the Process Module." />;
  }

  return <ProcessDashboard />;
}

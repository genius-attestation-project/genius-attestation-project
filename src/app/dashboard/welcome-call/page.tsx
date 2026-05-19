import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function WelcomeCallPage() {
  const session = await requirePermission("welcome_call.view", "/dashboard/welcome-call");

  if (!session) {
    return <AccessDenied description="Your role cannot access welcome calls." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Welcome Call"
      title="Welcome call command desk"
      description="This area now matches the rest of the ERP shell and can be extended with followup queues, scripts, and call statuses."
    />
  );
}

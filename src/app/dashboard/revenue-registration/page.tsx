import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function RevenueRegistrationPage() {
  const session = await requirePermission(
    "revenue_registration.view",
    "/dashboard/revenue-registration",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access revenue registration." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Revenue Registration"
      title="Revenue registration console"
      description="This module can now inherit the new ERP shell, premium cards, and actionable analytics patterns."
    />
  );
}

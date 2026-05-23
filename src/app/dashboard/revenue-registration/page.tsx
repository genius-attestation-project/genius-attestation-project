import { AccessDenied } from "@/components/shared/AccessDenied";
import { RegistrationManager } from "@/features/registration/components/RegistrationManager";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function RevenueRegistrationPage() {
  const session = await requirePermission(
    "revenue_registration.view",
    "/dashboard/revenue-registration",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access revenue registration." />;
  }

  return <RegistrationManager />;
}

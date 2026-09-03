import { AccessDenied } from "@/components/shared/AccessDenied";
import { CorporateDetailsMasterView } from "@/features/corporate-details/components/CorporateDetailsMasterView";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function CorporateDetailsMasterPage() {
  const session = await requirePermission(
    "master_configuration.corporate_details.view",
    "/dashboard/master-configuration/corporate-details"
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access Corporate Details Master Configuration." />;
  }

  return <CorporateDetailsMasterView />;
}

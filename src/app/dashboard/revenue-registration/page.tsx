import { AccessDenied } from "@/components/shared/AccessDenied";
import { RegistrationManager } from "@/features/registration/components/RegistrationManager";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";

export default async function RevenueRegistrationPage() {
  const session = await requirePermission(
    "revenue_registration.view",
    "/dashboard/revenue-registration",
  );

  if (!session || !session.user) {
    return <AccessDenied description="Your role cannot access revenue registration." />;
  }

  const currentOfficeLocationName = await resolveOfficeLocationName({
    ownerAdminId: session.user.ownerAdminId ?? "",
    officeLocationId: session.user.officeLocationId,
    officeLocationName: session.user.officeLocationName,
  });

  const hasExportPermission = hasPermission(session.user, "revenue_registration.export");
  const hasTimelinePermission = hasPermission(session.user, "document_movement.view");

  return (
    <RegistrationManager 
      currentOfficeLocationName={currentOfficeLocationName ?? ""} 
      hasExportPermission={hasExportPermission} 
      hasTimelinePermission={hasTimelinePermission}
    />
  );
}

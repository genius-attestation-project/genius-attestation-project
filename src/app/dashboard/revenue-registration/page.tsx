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
    userId: session.user.id,
  });

  const hasExportPermission = hasPermission(session.user, "revenue_registration.export");
  const hasTimelinePermission = hasPermission(session.user, "document_movement.view");
  const hasImportPermission = hasPermission(session.user, "revenue_registration.import");
  const hasDeletePermission = hasPermission(session.user, "revenue_registration.delete");
  const hasMovementRequestPermission =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "revenue_registration.movement_request") ||
    hasPermission(session.user, "movement_approval.create");

  return (
    <RegistrationManager 
      currentOfficeLocationName={currentOfficeLocationName ?? ""} 
      hasExportPermission={hasExportPermission} 
      hasTimelinePermission={hasTimelinePermission}
      hasImportPermission={hasImportPermission}
      hasDeletePermission={hasDeletePermission}
      hasMovementRequestPermission={hasMovementRequestPermission}
    />
  );
}

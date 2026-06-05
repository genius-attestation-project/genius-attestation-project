import { AccessDenied } from "@/components/shared/AccessDenied";
import { ReadyForDeliveryDashboard } from "@/features/ready-for-delivery/components/ReadyForDeliveryDashboard";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function ReadyForDeliveryPage() {
  const session = await requirePermission(
    "ready_for_delivery.view",
    "/dashboard/ready-for-delivery",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access ready for delivery." />;
  }

  const currentOfficeLocationName = await resolveOfficeLocationName({
    ownerAdminId: session.user.ownerAdminId ?? "",
    officeLocationId: session.user.officeLocationId,
    officeLocationName: session.user.officeLocationName,
  });

  return <ReadyForDeliveryDashboard currentOfficeLocationName={currentOfficeLocationName ?? ""} />;
}

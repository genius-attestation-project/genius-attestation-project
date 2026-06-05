import { AccessDenied } from "@/components/shared/AccessDenied";
import { RegistrationManager } from "@/features/registration/components/RegistrationManager";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function RevenueRegistrationPage() {
  const session = await requirePermission(
    "revenue_registration.view",
    "/dashboard/revenue-registration",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access revenue registration." />;
  }

  const currentOfficeLocationName = await resolveOfficeLocationName({
    ownerAdminId: session.user.ownerAdminId ?? "",
    officeLocationId: session.user.officeLocationId,
    officeLocationName: session.user.officeLocationName,
  });

  return <RegistrationManager currentOfficeLocationName={currentOfficeLocationName ?? ""} />;
}

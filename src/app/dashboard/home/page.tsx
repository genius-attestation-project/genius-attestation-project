import { AccessDenied } from "@/components/shared/AccessDenied";
import { HomeDashboard } from "@/features/home/components/HomeDashboard";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function HomePage() {
  const session = await requirePermission("home.view", "/dashboard/home");

  if (!session) {
    return <AccessDenied description="Your role cannot access the home workflow module." />;
  }

  const currentOfficeLocationName = await resolveOfficeLocationName({
    ownerAdminId: session.user.ownerAdminId ?? "",
    officeLocationId: session.user.officeLocationId,
    officeLocationName: session.user.officeLocationName,
  });

  return <HomeDashboard currentOfficeLocationName={currentOfficeLocationName ?? ""} />;
}

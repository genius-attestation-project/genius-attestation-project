import { AccessDenied } from "@/components/shared/AccessDenied";
import { WelcomeCallDashboard } from "@/features/welcome-call/components/WelcomeCallDashboard";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function WelcomeCallPage() {
  const session = await requirePermission("welcome_call.view", "/dashboard/welcome-call");

  if (!session) {
    return <AccessDenied description="Your role cannot access welcome calls." />;
  }

  const currentOfficeLocationName = await resolveOfficeLocationName({
    ownerAdminId: session.user.ownerAdminId ?? "",
    officeLocationId: session.user.officeLocationId,
    officeLocationName: session.user.officeLocationName,
  });

  return <WelcomeCallDashboard currentOfficeLocationName={currentOfficeLocationName ?? ""} />;
}

import { Suspense } from "react";
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
    userId: session.user.id,
  });

  const isSuperAdmin = Boolean(session.user.isSuperAdmin || session.user.role === "Super Admin");

  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-slate-500 font-semibold">Loading Home Workflow...</div>}>
      <HomeDashboard
        currentOfficeLocationName={currentOfficeLocationName ?? ""}
        initialOfficeLocationId={session.user.officeLocationId ?? ""}
        isSuperAdmin={isSuperAdmin}
        userPermissions={session.user.permissions || []}
      />
    </Suspense>
  );
}

import { AccessDenied } from "@/components/shared/AccessDenied";
import { RegistrationManager } from "@/features/registration/components/RegistrationManager";
import { requirePermission } from "@/middleware/auth.middleware";

type RevenueRegistrationNewPageProps = {
  searchParams?: Promise<{
    trackingNumber?: string;
  }>;
};

export default async function RevenueRegistrationNewPage({
  searchParams,
}: RevenueRegistrationNewPageProps) {
  const session = await requirePermission(
    "revenue_registration.view",
    "/dashboard/revenue-registration/new",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access revenue registration." />;
  }

  const params = searchParams ? await searchParams : {};

  return (
    <RegistrationManager
      initialOpen
      initialTrackingNumber={params.trackingNumber ? decodeURIComponent(params.trackingNumber) : ""}
    />
  );
}

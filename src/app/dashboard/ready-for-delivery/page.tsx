import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function ReadyForDeliveryPage() {
  const session = await requirePermission(
    "ready_for_delivery.view",
    "/dashboard/ready-for-delivery",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access ready for delivery." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Ready For Delivery"
      title="Delivery readiness board"
      description="Use this premium delivery surface for queue visibility, dispatch readiness, and customer handoff monitoring."
    />
  );
}

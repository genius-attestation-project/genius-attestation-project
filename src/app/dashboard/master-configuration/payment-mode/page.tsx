import { AccessDenied } from "@/components/shared/AccessDenied";
import { PaymentModeMasterView } from "@/features/payment-mode/components/PaymentModeMasterView";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function PaymentModePage() {
  const session = await requirePermission(
    "master_configuration.payment_mode.view",
    "/dashboard/master-configuration/payment-mode"
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access Payment Mode Master Configuration." />;
  }

  return <PaymentModeMasterView />;
}

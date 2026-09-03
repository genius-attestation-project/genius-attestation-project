import { AccessDenied } from "@/components/shared/AccessDenied";
import { requirePermission } from "@/middleware/auth.middleware";
import { redirect } from "next/navigation";

export default async function MasterConfigurationIndex() {
  const session = await requirePermission("master_configuration.view", "/dashboard/master-configuration");

  if (!session) {
    return <AccessDenied description="Your role cannot access Master Configuration." />;
  }

  // Redirect to the first item in the master configuration list
  redirect("/dashboard/master-configuration/document-types");
}

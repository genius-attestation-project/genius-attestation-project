import { AccessDenied } from "@/components/shared/AccessDenied";
import { MasterConfigurationDynamicView } from "@/features/master-configuration/components/MasterConfigurationDynamicView";
import { requirePermission } from "@/middleware/auth.middleware";

const slugPermissionMap: Record<string, string> = {
  "document-types": "master_configuration.document_types.view",
  "document-type-categories": "master_configuration.document_type_categories.view",
  "attestation-types": "master_configuration.process_types.view",
  "process-types": "master_configuration.process_types.view",
  "sub-process": "master_configuration.sub_process.view",
  "sub-packages": "master_configuration.sub_process.view",
  "customer-types": "master_configuration.customer_types.view",
  "courier-companies": "master_configuration.courier_companies.view",
};

export default async function MasterConfigurationDynamicPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;
  const requiredPerm = slugPermissionMap[slug] || "master_configuration.view";

  const session = await requirePermission(
    requiredPerm,
    `/dashboard/master-configuration/${slug}`
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access this Master Configuration section." />;
  }

  return <MasterConfigurationDynamicView slug={slug} />;
}

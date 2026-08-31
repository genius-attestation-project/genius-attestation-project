import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type AccessDeniedProps = {
  title?: string;
  description?: string;
};

export function AccessDenied({
  title = "Access Denied",
  description = "You do not have permission to open this page with your current role.",
}: AccessDeniedProps) {
  return <EmptyState icon={ShieldAlert} title={title} description={description} />;
}

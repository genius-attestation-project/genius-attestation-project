import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/middleware/auth.middleware";
import { AssignedAgenciesClient } from "@/features/assigned-agencies/components/AssignedAgenciesClient";
import { hasPermission } from "@/features/admin/server/rbac.service";

export const metadata: Metadata = {
  title: "Assigned Agencies | Genius Attestation",
  description: "Manage external agency login accounts.",
};

export default async function AssignedAgenciesPage() {
  const session = await requirePermission("assigned_agencies.view");

  if (!session) {
    redirect("/dashboard");
  }

  const permissions = {
    "assigned_agencies.view": hasPermission(session.user, "assigned_agencies.view"),
    "assigned_agencies.create": hasPermission(session.user, "assigned_agencies.create"),
    "assigned_agencies.edit": hasPermission(session.user, "assigned_agencies.edit"),
    "assigned_agencies.delete": hasPermission(session.user, "assigned_agencies.delete"),
    "assigned_agencies.activate": hasPermission(session.user, "assigned_agencies.activate"),
    "assigned_agencies.deactivate": hasPermission(session.user, "assigned_agencies.deactivate"),
    "assigned_agencies.reset_password": hasPermission(session.user, "assigned_agencies.reset_password"),
    "assigned_agencies.export": hasPermission(session.user, "assigned_agencies.export"),
  };

  return (
    <div className="space-y-6 w-full">
      <AssignedAgenciesClient permissions={permissions} />
    </div>
  );
}

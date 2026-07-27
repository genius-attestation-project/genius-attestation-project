import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/middleware/auth.middleware";
import { AssignedOfficeClient } from "@/features/assigned-office/components/AssignedOfficeClient";
import { hasPermission } from "@/features/admin/server/rbac.service";

export const metadata: Metadata = {
  title: "Assigned Office | Genius Attestation",
  description: "Manage assigned office login accounts.",
};

export default async function AssignedOfficePage() {
  const session = await requirePermission("assigned_office.view");

  if (!session) {
    redirect("/dashboard");
  }

  if (session.user?.isAssignedOffice || session.user?.isAgency) {
    redirect("/dashboard/assigned-office/workspace");
  }

  const permissions = {
    "assigned_office.view": hasPermission(session.user, "assigned_office.view"),
    "assigned_office.create": hasPermission(session.user, "assigned_office.create"),
    "assigned_office.edit": hasPermission(session.user, "assigned_office.edit"),
    "assigned_office.delete": hasPermission(session.user, "assigned_office.delete"),
    "assigned_office.activate": hasPermission(session.user, "assigned_office.activate"),
    "assigned_office.deactivate": hasPermission(session.user, "assigned_office.deactivate"),
    "assigned_office.reset_password": hasPermission(session.user, "assigned_office.reset_password"),
    "assigned_office.export": hasPermission(session.user, "assigned_office.export"),
  };

  return (
    <div className="space-y-6 w-full">
      <AssignedOfficeClient permissions={permissions} />
    </div>
  );
}

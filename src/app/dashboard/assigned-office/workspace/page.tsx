import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AssignedOfficeWorkspaceClient } from "@/features/assigned-office/components/AssignedOfficeWorkspaceClient";

export const metadata: Metadata = {
  title: "Assigned Office Workspace | Genius Attestation",
  description: "External Processing Office Workspace",
};

export default async function AssignedOfficeWorkspacePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const officeName = session.user.name || session.user.email || "Assigned Office";
  const currentUser = session.user.name || session.user.email || "User";
  const officeId = session.user.officeId || session.user.id;

  return (
    <div className="space-y-6 w-full">
      <AssignedOfficeWorkspaceClient
        officeName={officeName}
        currentUser={currentUser}
        officeId={officeId}
      />
    </div>
  );
}

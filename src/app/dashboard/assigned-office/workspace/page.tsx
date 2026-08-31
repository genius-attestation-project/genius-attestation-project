import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AssignedOfficeWorkspaceClient } from "@/features/assigned-office/components/AssignedOfficeWorkspaceClient";

import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Assigned Office Workspace | Genius Attestation",
  description: "External Processing Office Workspace",
};

export default async function AssignedOfficeWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<{ officeId?: string }> | { officeId?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeCookieOfficeId = cookieStore.get("activeAssignedOfficeId")?.value;

  const resolvedSearchParams = await (searchParams as any);
  const officeId =
    resolvedSearchParams?.officeId ||
    activeCookieOfficeId ||
    (session.user as any).assignedOfficeId ||
    session.user.officeId ||
    session.user.id;

  const officeName = session.user.name || session.user.email || "Assigned Office";
  const currentUser = session.user.name || session.user.email || "User";

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

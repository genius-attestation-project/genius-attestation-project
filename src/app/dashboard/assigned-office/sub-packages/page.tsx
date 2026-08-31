import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { SubPackagesClient } from "@/features/assigned-office/components/SubPackagesClient";

export const metadata: Metadata = {
  title: "Sub Packages View | Genius Attestation",
  description: "View and process documents assigned to subpackages.",
};

export default async function SubPackagesPage({
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

  return (
    <div className="space-y-6 w-full">
      <SubPackagesClient officeId={officeId} />
    </div>
  );
}

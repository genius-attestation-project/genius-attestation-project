import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubPackagesClient } from "@/features/assigned-office/components/SubPackagesClient";

export const metadata: Metadata = {
  title: "Sub Packages View | Genius Attestation",
  description: "View and process documents assigned to subpackages.",
};

export default async function SubPackagesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const officeId = session.user.officeId || session.user.id;

  return (
    <div className="space-y-6 w-full">
      <SubPackagesClient officeId={officeId} />
    </div>
  );
}

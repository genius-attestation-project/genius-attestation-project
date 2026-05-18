import type { ReactNode } from "react";

import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth("/dashboard");
  const userName = session.user.name ?? "Workspace User";
  const userEmail = session.user.email ?? "workspace@geniuserp.com";

  return (
    <div className="min-h-screen p-3 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="grid content-start gap-4">
          <Navbar userName={session.user.name} userEmail={session.user.email} />
          <main className="grid content-start gap-6 pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

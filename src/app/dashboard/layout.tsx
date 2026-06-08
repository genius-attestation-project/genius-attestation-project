import type { ReactNode } from "react";

import { FollowupReminderProvider } from "@/components/shared/FollowupReminderProvider";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth("/dashboard");
  const userName = session.user.name ?? "Workspace User";
  const userEmail = session.user.email ?? "workspace@geniuserp.com";
  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  return (
    <div className="h-screen overflow-hidden p-2 sm:p-3 md:p-5">
      <FollowupReminderProvider userId={session.user.id} ownerAdminId={ownerAdminId} />
      <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-none">
        <Sidebar
          userName={userName}
          userEmail={userEmail}
          permissions={session.user.permissions}
          isSuperAdmin={session.user.isSuperAdmin}
        />
        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 sm:gap-4">
          <Navbar userName={session.user.name} userEmail={session.user.email} />
          <main className="grid min-h-0 min-w-0 content-start gap-4 overflow-y-auto pb-8 pr-1 sm:gap-6 sm:pr-2">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

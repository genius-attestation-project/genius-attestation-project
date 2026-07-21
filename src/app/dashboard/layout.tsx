import type { ReactNode } from "react";

import { AttendanceGuard } from "@/components/shared/AttendanceGuard";
import { FollowupReminderProvider } from "@/components/shared/FollowupReminderProvider";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { requireAuth } from "@/middleware/auth.middleware";
import { FOLLOWUP_LOCK_MESSAGE } from "@/features/lead/server/followup-lock.service";
import { FloatingCommunicationWidget } from "@/features/communication/components/FloatingCommunicationWidget";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth("/dashboard");
  const userName = session.user.name ?? "Workspace User";
  const userEmail = session.user.email ?? "workspace@geniuserp.com";
  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  if (session.user.isLocked) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
            Account Locked
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">CRM access restricted</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {session.user.lockReason ?? FOLLOWUP_LOCK_MESSAGE}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden p-2 sm:p-3 md:p-5">
      <AttendanceGuard userId={session.user.id} />
      <FollowupReminderProvider userId={session.user.id} ownerAdminId={ownerAdminId} />
      <FloatingCommunicationWidget />
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

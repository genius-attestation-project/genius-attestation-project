import { AccessDenied } from "@/components/shared/AccessDenied";
import { PageHeader } from "@/components/ui/PageHeader";
import { AttendanceSettingsForm } from "@/features/attendance/components/AttendanceSettingsForm";
import { requireAuth } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Attendance Settings — Genius Attestation",
};

export default async function AttendanceSettingsPage() {
  const session = await requireAuth("/dashboard/attendance/settings");

  const canManage =
    session.user.isSuperAdmin ||
    hasPermission(session.user, "attendance_settings.manage");

  if (!canManage) {
    return (
      <AccessDenied description="You do not have permission to manage attendance settings." />
    );
  }

  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  // Load all active users under this admin workspace for the user selector
  const rawUsers = await prisma.user.findMany({
    where: {
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
      isActive: true,
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
  }));

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Attendance Module"
        title="Attendance Settings"
        description="Configure expected check-in and check-out times per user for late detection."
      />
      <AttendanceSettingsForm users={users} />
    </div>
  );
}

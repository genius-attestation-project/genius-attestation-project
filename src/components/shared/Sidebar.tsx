import { AppSidebar } from "@/components/shared/AppSidebar";

type SidebarProps = {
  userName: string;
  userEmail: string;
  permissions: string[];
  isSuperAdmin: boolean;
  isAssignedOffice?: boolean;
};

export function Sidebar({ userName, userEmail, permissions, isSuperAdmin, isAssignedOffice }: SidebarProps) {
  return (
    <AppSidebar
      userName={userName}
      userEmail={userEmail}
      permissions={permissions}
      isSuperAdmin={isSuperAdmin}
      isAssignedOffice={isAssignedOffice}
    />
  );
}

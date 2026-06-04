import { AppSidebar } from "@/components/shared/AppSidebar";

type SidebarProps = {
  userName: string;
  userEmail: string;
  permissions: string[];
  isSuperAdmin: boolean;
};

export function Sidebar({ userName, userEmail, permissions, isSuperAdmin }: SidebarProps) {
  return (
    <AppSidebar
      userName={userName}
      userEmail={userEmail}
      permissions={permissions}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

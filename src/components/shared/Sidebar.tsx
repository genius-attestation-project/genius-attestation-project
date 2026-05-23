import { AppSidebar } from "@/components/shared/AppSidebar";

type SidebarProps = {
  userName: string;
  userEmail: string;
};

export function Sidebar({ userName, userEmail }: SidebarProps) {
  return <AppSidebar userName={userName} userEmail={userEmail} />;
}

import {
  BadgeCheck,
  ArrowDownCircle,
  BadgeDollarSign,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  ClipboardList,
  Clock3,
  FileSearch,
  Handshake,
  Home,
  Layers3,
  MessageSquareQuote,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  UserRoundPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type DashboardStat = {
  label: string;
  value: string;
  delta: string;
  description: string;
  icon: LucideIcon;
  tone?: "blue" | "slate" | "amber";
};

export const sidebarItems: SidebarItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  {
    label: "Admin Management",
    href: "/dashboard/admin-management",
    icon: ShieldCheck,
  },
  {
    label: "Lead Management",
    href: "/dashboard/lead-management",
    icon: Users,
  },
  {
    label: "Revenue Registration",
    href: "/dashboard/revenue-registration",
    icon: BadgeDollarSign,
  },
  {
    label: "Search / Report",
    href: "/dashboard/search-report",
    icon: FileSearch,
  },
  {
    label: "BM Report",
    href: "/dashboard/bm-report",
    icon: ChartNoAxesColumn,
  },
  {
    label: "Account Update",
    href: "/dashboard/account-update",
    icon: RefreshCw,
  },
  {
    label: "Ready For Delivery",
    href: "/dashboard/ready-for-delivery",
    icon: Truck,
  },
  {
    label: "Welcome Call",
    href: "/dashboard/welcome-call",
    icon: Handshake,
  },
  {
    label: "Quote Of The Day",
    href: "/dashboard/quote-of-the-day",
    icon: MessageSquareQuote,
  },
];

export const adminManagementLinks: SidebarItem[] = [
  { label: "Users", href: "/dashboard/admin-management/users", icon: Users },
  { label: "Roles", href: "/dashboard/admin-management/roles", icon: ShieldCheck },
  {
    label: "Department",
    href: "/dashboard/admin-management/department",
    icon: BriefcaseBusiness,
  },
  {
    label: "Office Location",
    href: "/dashboard/admin-management/office-location",
    icon: UserCheck,
  },
];

export const leadManagementLinks: SidebarItem[] = [
  { label: "All Leads", href: "/dashboard/lead-management/all-leads", icon: Users },
  { label: "Followups", href: "/dashboard/lead-management/followups", icon: Clock3 },
  { label: "Assign Leads", href: "/dashboard/lead-management/assign-leads", icon: UserRoundPlus },
  {
    label: "Pending Approval",
    href: "/dashboard/lead-management/pending-approval",
    icon: BadgeCheck,
  },
  { label: "LOB", href: "/dashboard/lead-management/lob", icon: Layers3 },
  { label: "Closed", href: "/dashboard/lead-management/closed", icon: PencilLine },
];

export function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

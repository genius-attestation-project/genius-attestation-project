import {
  ArrowDownCircle,
  BadgeDollarSign,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  ClipboardList,
  FileSearch,
  Handshake,
  Home,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
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

export type RevenuePoint = {
  month: string;
  value: number;
};

export type FunnelPoint = {
  label: string;
  value: number;
  rate: string;
};

export type ActivityItem = {
  title: string;
  time: string;
  detail: string;
};

export type QuickAction = {
  label: string;
  value: string;
  description: string;
};

export type RecentLead = {
  id: string;
  company: string;
  owner: string;
  stage: string;
  amount: string;
  priority: string;
};

export type FollowupItem = {
  account: string;
  owner: string;
  due: string;
  status: string;
};

export type DeliveryItem = {
  batch: string;
  customer: string;
  eta: string;
  status: string;
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

export function getDashboardStats(): DashboardStat[] {
  return [
    {
      label: "Total Leads",
      value: "2,486",
      delta: "+12.4%",
      description: "Compared with last month",
      icon: Users,
      tone: "blue",
    },
    {
      label: "Active Leads",
      value: "684",
      delta: "+4.2%",
      description: "High-intent prospects in motion",
      icon: UserCheck,
      tone: "slate",
    },
    {
      label: "Revenue",
      value: "$184K",
      delta: "+18.8%",
      description: "Booked this month",
      icon: BadgeDollarSign,
      tone: "blue",
    },
    {
      label: "Pending Accounts",
      value: "126",
      delta: "+7.1%",
      description: "Awaiting verification",
      icon: ClipboardList,
      tone: "amber",
    },
    {
      label: "Delivery Status",
      value: "92%",
      delta: "+2.3%",
      description: "Orders on schedule",
      icon: Truck,
      tone: "slate",
    },
    {
      label: "Welcome Calls Pending",
      value: "34",
      delta: "-6.1%",
      description: "Due in the next 24 hours",
      icon: Handshake,
      tone: "amber",
    },
    {
      label: "Today's Tasks",
      value: "57",
      delta: "+9.0%",
      description: "Assigned across departments",
      icon: BriefcaseBusiness,
      tone: "blue",
    },
  ];
}

export const revenuePoints: RevenuePoint[] = [
  { month: "Jan", value: 38 },
  { month: "Feb", value: 48 },
  { month: "Mar", value: 62 },
  { month: "Apr", value: 58 },
  { month: "May", value: 74 },
  { month: "Jun", value: 82 },
  { month: "Jul", value: 88 },
];

export const monthlyGrowth = [
  { month: "Q1", value: "12%" },
  { month: "Q2", value: "18%" },
  { month: "Q3", value: "24%" },
  { month: "Q4", value: "31%" },
];

export const funnelPoints: FunnelPoint[] = [
  { label: "Leads Captured", value: 2486, rate: "100%" },
  { label: "Qualified", value: 1610, rate: "64%" },
  { label: "Negotiation", value: 812, rate: "32%" },
  { label: "Won", value: 372, rate: "15%" },
];

export const performanceLeaders = [
  { name: "Ananya Das", score: "94%", focus: "Revenue closure" },
  { name: "Rohan James", score: "91%", focus: "Lead velocity" },
  { name: "Meera S", score: "89%", focus: "Welcome calls" },
  { name: "Faizal P", score: "86%", focus: "Account upkeep" },
];

export const recentActivities: ActivityItem[] = [
  {
    title: "Revenue sheet synced",
    time: "5 min ago",
    detail: "Finance pushed the latest registration batch to the central ledger.",
  },
  {
    title: "New enterprise lead assigned",
    time: "16 min ago",
    detail: "HubSouth Manufacturing was routed to the Kerala enterprise desk.",
  },
  {
    title: "Delivery queue escalated",
    time: "41 min ago",
    detail: "Three orders flagged for same-day QA review before dispatch.",
  },
  {
    title: "Admin permission updated",
    time: "1 hr ago",
    detail: "Support Supervisor role received access to BM reporting.",
  },
];

export const notifications = [
  "7 accounts require office reassignment before end of day.",
  "Lead-to-revenue conversion improved 6% week over week.",
  "Welcome call backlog dropped below the team target threshold.",
];

export const aiSuggestions = [
  "Assign two additional users to the high-value delivery queue.",
  "Review the BM Report followup segment with lower-than-usual close rate.",
  "Bundle pending welcome calls by timezone to reduce handoff delays.",
];

export const quickReports = [
  "Pipeline Health",
  "Collection Outlook",
  "Location-wise Activity",
  "Role Access Matrix",
];

export const quickActions: QuickAction[] = [
  {
    label: "New Lead",
    value: "18",
    description: "Pending triage from the intake queue",
  },
  {
    label: "Revenue Review",
    value: "6",
    description: "Approvals waiting for finance confirmation",
  },
  {
    label: "Open Escalations",
    value: "4",
    description: "Accounts blocked by missing documents",
  },
];

export const recentLeads: RecentLead[] = [
  {
    id: "LD-1024",
    company: "Blue Orbit Exports",
    owner: "Ananya Das",
    stage: "Negotiation",
    amount: "$22,000",
    priority: "High",
  },
  {
    id: "LD-1025",
    company: "Crestline Digital",
    owner: "Rohan James",
    stage: "Qualified",
    amount: "$8,400",
    priority: "Medium",
  },
  {
    id: "LD-1026",
    company: "Meridian Foods",
    owner: "Faizal P",
    stage: "Proposal",
    amount: "$14,300",
    priority: "High",
  },
  {
    id: "LD-1027",
    company: "Urban Rise Infra",
    owner: "Meera S",
    stage: "Won",
    amount: "$31,600",
    priority: "Critical",
  },
];

export const pendingFollowups: FollowupItem[] = [
  { account: "North Axis Labs", owner: "Meera S", due: "11:00 AM", status: "Call due" },
  { account: "Asterion Retail", owner: "Rohan James", due: "1:30 PM", status: "Docs pending" },
  { account: "Vista Foods", owner: "Ananya Das", due: "3:00 PM", status: "Approval needed" },
];

export const deliveryQueue: DeliveryItem[] = [
  { batch: "DL-4401", customer: "Nova Infra", eta: "Today", status: "Packing" },
  { batch: "DL-4402", customer: "Everest Marine", eta: "Tomorrow", status: "Quality check" },
  { batch: "DL-4403", customer: "Southline Agro", eta: "Tomorrow", status: "Ready" },
];

export const quoteOfTheDay = {
  text: "Precision in systems creates confidence in teams.",
  author: "Operations Playbook",
};

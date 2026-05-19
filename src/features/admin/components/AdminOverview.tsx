import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { PageHeader } from "@/components/ui/PageHeader";

type AdminOverviewLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function AdminOverview({ links }: { links: AdminOverviewLink[] }) {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin Management"
        title="Control people, permissions, and operating structure"
        description="A modern enterprise admin workspace for managing users, roles, departments, and office locations without changing the current backend flow."
        actions={
          <Link href="/dashboard/admin-management/users">
            <Button>Open User Control</Button>
          </Link>
        }
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {links.map((item) => (
          <DashboardCard
            key={item.href}
            title={item.label}
            description="Built with reusable ERP cards, drawers, and responsive table patterns."
          >
            <div className="grid gap-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                <item.icon size={22} />
              </span>
              <Link href={item.href}>
                <Button variant="secondary" className="w-full">
                  Explore
                </Button>
              </Link>
            </div>
          </DashboardCard>
        ))}
      </section>
    </div>
  );
}

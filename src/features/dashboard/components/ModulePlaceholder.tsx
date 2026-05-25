import { Layers3 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Button>Request Module Access</Button>}
      />
      <DashboardCard>
        <EmptyState
          icon={Layers3}
          title={`${title} workspace is ready for expansion`}
          description="The new ERP shell is in place. This module can now be extended using the same premium cards, drawers, tables, and admin patterns introduced in this redesign."
          action={<Button variant="secondary">Open Implementation Notes</Button>}
        />
      </DashboardCard>
    </div>
  );
}

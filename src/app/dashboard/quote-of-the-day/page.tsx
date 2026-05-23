import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function QuoteOfTheDayPage() {
  const session = await requirePermission(
    "quote_of_the_day.view",
    "/dashboard/quote-of-the-day",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access quote of the day." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Quote Of The Day"
      title="Culture and motivation panel"
      description="A branded workspace for internal communication, daily motivation, and team-facing highlights."
    />
  );
}

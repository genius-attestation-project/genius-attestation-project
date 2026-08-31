import { requireAuth } from "@/middleware/auth.middleware";
import { StatusCheckingDashboard } from "@/features/status-checking/components/StatusCheckingDashboard";

export const metadata = {
  title: "Status Checking | Genius Attestation",
  description: "Track document lifecycle and status using Tracking Number.",
};

export default async function StatusCheckingPage() {
  await requireAuth();

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <StatusCheckingDashboard />
        </div>
      </main>
    </div>
  );
}

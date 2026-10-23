import { AccessDenied } from "@/components/shared/AccessDenied";
import { requireAuth } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { redirect } from "next/navigation";

export default async function SearchReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth("/dashboard/search-report");

  if (!session || !session.user) {
    return <AccessDenied description="Your role cannot access search and reports." />;
  }

  const canViewGeneral =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "search_report.view") ||
    hasPermission(session.user, "search_report.search");

  if (!canViewGeneral) {
    return <AccessDenied description="Your role cannot access search and reports." />;
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    }
  }
  const queryString = query.toString();
  const searchPart = queryString ? `?${queryString}` : "";

  redirect(`/dashboard/search-report/general-search${searchPart}`);
}

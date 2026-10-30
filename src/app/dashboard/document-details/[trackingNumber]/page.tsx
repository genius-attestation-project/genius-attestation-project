import React from "react";
import { DocumentDetailsClient } from "@/features/registration/components/DocumentDetailsClient";
import { requireAuth } from "@/middleware/auth.middleware";
import { getSessionAccess, hasOfficeAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { prisma } from "@/lib/prisma";

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}) {
  const { trackingNumber } = await params;
  const decoded = decodeURIComponent(trackingNumber).trim();

  const session = await requireAuth(`/dashboard/document-details/${trackingNumber}`);
  if (!session?.user) {
    return <AccessDenied description="Unauthorized access." />;
  }

  const access = await getSessionAccess(session.user.id);
  const canView =
    Boolean(access?.isSuperAdmin) ||
    hasPermission(access, "search_report.search") ||
    hasPermission(access, "search_report.view") ||
    hasPermission(access, "revenue_registration.view");

  if (!canView) {
    return <AccessDenied description="Your role cannot access Document Details." />;
  }

  if (access && !access.isSuperAdmin) {
    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const reg = await prisma.registration.findFirst({
      where: {
        trackingNumber: decoded,
        ownerAdminId,
      },
      select: {
        regionOfRegistration: true,
        officeLocationName: true,
        officeLocationId: true,
      },
    });

    if (reg) {
      const regOffice = reg.regionOfRegistration || reg.officeLocationName || reg.officeLocationId;
      if (regOffice) {
        const isAllowed =
          hasOfficeAccess(access, regOffice, "search_report") ||
          hasOfficeAccess(access, regOffice, "revenue_registration");

        if (!isAllowed) {
          return <AccessDenied description="You are not authorized to view documents for this office." />;
        }
      }
    }
  }

  return <DocumentDetailsClient trackingNumber={trackingNumber} />;
}

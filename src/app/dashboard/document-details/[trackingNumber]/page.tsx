import React from "react";
import { DocumentDetailsClient } from "@/features/registration/components/DocumentDetailsClient";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  getSessionAccess,
  canUserViewDocumentDetails,
  hasDocumentOfficeAccess,
} from "@/features/admin/server/rbac.service";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { prisma } from "@/lib/prisma";

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}) {
  try {
    const { trackingNumber } = await params;
    const decoded = decodeURIComponent(trackingNumber).trim();

    const session = await requireAuth(`/dashboard/document-details/${trackingNumber}`);
    if (!session?.user) {
      return <AccessDenied description="Unauthorized access." />;
    }

    const access = await getSessionAccess(session.user.id);
    const canView = canUserViewDocumentDetails(access);

    if (!canView) {
      return <AccessDenied description="Your role cannot access Document Details." />;
    }

    if (access && !access.isSuperAdmin) {
      const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
      const reg = await prisma.registration.findFirst({
        where: {
          OR: [
            { trackingNumber: decoded },
            { id: decoded },
          ],
          ...(ownerAdminId ? { ownerAdminId } : {}),
        },
        select: {
          id: true,
          trackingNumber: true,
          regionOfRegistration: true,
          regionOfRegistrationId: true,
          documentMovements: {
            select: {
              currentOfficeId: true,
              currentOffice: {
                select: {
                  officeName: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (reg) {
        const latestMovement = reg.documentMovements?.[0];
        const docOffices = [
          reg.regionOfRegistration,
          reg.regionOfRegistrationId,
          latestMovement?.currentOffice?.officeName,
          latestMovement?.currentOfficeId,
        ];

        const isAllowed = hasDocumentOfficeAccess(access, docOffices);
        if (!isAllowed) {
          return <AccessDenied description="You are not authorized to view documents for this office." />;
        }
      }
    }

    return <DocumentDetailsClient trackingNumber={trackingNumber} />;
  } catch (error: any) {
    console.error("[DOCUMENT_DETAILS_PAGE_ERROR]", error);
    return (
      <AccessDenied
        title="Unable to Load Document"
        description={error?.message || "A server error occurred while retrieving document details. Please try again."}
      />
    );
  }
}

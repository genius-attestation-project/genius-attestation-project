import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateNumberOfDays } from "@/utils/days-calculator";
import { getSessionAccess, hasOfficeAccess, hasPermission } from "@/features/admin/server/rbac.service";

function isUserIdLike(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const s = val.trim();
  if (!s) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  if (/^c[a-z0-9]{20,32}$/i.test(s)) return true;
  if (/^(other|owner|staff|test)[_-][a-z0-9_-]+$/i.test(s)) return true;
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized access." }, { status: 401 });
    }

    const { trackingNumber } = await params;
    if (!trackingNumber) {
      return NextResponse.json({ message: "Tracking number is required." }, { status: 400 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

    const access = await getSessionAccess(session.user.id);
    const canView =
      Boolean(access?.isSuperAdmin) ||
      hasPermission(access, "search_report.search") ||
      hasPermission(access, "search_report.view") ||
      hasPermission(access, "revenue_registration.view");

    if (!canView) {
      return NextResponse.json(
        { message: "You do not have permission to view document details." },
        { status: 403 }
      );
    }

    // Fetch primary Registration with relations including creator
    const registration = await prisma.registration.findFirst({
      where: {
        trackingNumber: trackingNumber.trim(),
        ownerAdminId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        corporateDetail: true,
        files: {
          include: {
            fileStorage: true,
          },
        },
        documentMovements: {
          include: {
            fromOffice: true,
            toOffice: true,
            currentOffice: true,
          },
        },
        auditTrail: {
          orderBy: { createdAt: "desc" },
        },
        paymentUpdates: {
          orderBy: { submittedAt: "desc" },
        },
        lead: {
          select: {
            id: true,
            leadCode: true,
            firstName: true,
            lastName: true,
            registrations: {
              select: {
                id: true,
                trackingNumber: true,
                documentType: true,
                documentName: true,
                trackingStatus: true,
                approvalStatus: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        registrationBatch: {
          select: {
            id: true,
            batchNumber: true,
            registrations: {
              select: {
                id: true,
                trackingNumber: true,
                documentType: true,
                documentName: true,
                trackingStatus: true,
                approvalStatus: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { message: `Document with Tracking Number "${trackingNumber}" was not found.` },
        { status: 404 }
      );
    }

    // Office visibility check for non-superadmins
    if (access && !access.isSuperAdmin) {
      const regOffice =
        registration.regionOfRegistration ||
        (registration as any).officeLocationName ||
        (registration as any).officeLocationId;

      if (regOffice) {
        const isAllowed =
          hasOfficeAccess(access, regOffice, "search_report") ||
          hasOfficeAccess(access, regOffice, "revenue_registration");

        if (!isAllowed) {
          return NextResponse.json(
            { message: "You are not authorized to view documents for this office." },
            { status: 403 }
          );
        }
      }
    }

    // Fetch related timeline, activity movements, advance payment approvals, processType, and bundles.
    const [subPackageMovements, rawMovementHistory, workflowHistory, advancePaymentApprovals, processType, bundles] = await Promise.all([
      (prisma as any).subPackageMovement.findMany({
        where: { trackingNumber: trackingNumber.trim() },
        orderBy: { createdAt: "desc" },
      }),
      prisma.movementHistory.findMany({
        where: { trackingNumber: trackingNumber.trim() },
        orderBy: { performedAt: "desc" },
      }),
      (prisma as any).documentWorkflowHistory.findMany({
        where: { trackingNumber: trackingNumber.trim() },
        orderBy: { performedAt: "desc" },
      }),
      prisma.advancePaymentApproval.findMany({
        where: { registrationId: registration.id },
        orderBy: { requestedAt: "desc" },
        include: { auditLogs: { orderBy: { createdAt: "desc" } } },
      }),
      registration.processType
        ? prisma.masterData.findFirst({
            where: {
              type: "PROCESS_TYPES",
              name: registration.processType,
              ownerAdminId,
            },
            include: { subPackages: { orderBy: { name: "asc" } } },
          })
        : null,
      prisma.bundle.findMany({
        where: { items: { some: { trackingNumber: trackingNumber.trim() } } },
        include: { fromOffice: true, toOffice: true },
      }),
    ]);

    const bundleByNumber = new Map<string, any>();
    for (const b of bundles) {
      bundleByNumber.set(b.bundleNumber, b);
    }

    const movementHistory = rawMovementHistory.map((mov: any) => {
      let fromOfficeName: string | null = mov.oldOffice || null;
      let toOfficeName: string | null = mov.newOffice || null;

      // Extract bundle number from remarks if present (e.g., "Added to Bundle HOME-20260817-9746")
      if (mov.remarks) {
        const match = mov.remarks.match(/Bundle\s+([A-Za-z0-9-]+)/i);
        if (match && match[1]) {
          const bundleNo = match[1];
          const b = bundleByNumber.get(bundleNo);
          if (b) {
            if (!fromOfficeName && b.fromOffice) fromOfficeName = b.fromOffice.officeName;
            if (!toOfficeName && b.toOffice) toOfficeName = b.toOffice.officeName;
          }
        }
      }

      // If Created action, fromOffice is null (or "-") and toOffice is newOffice or origin office or regionOfRegistration
      if (mov.action === "Created") {
        fromOfficeName = null;
        if (!toOfficeName) {
          toOfficeName =
            registration.documentMovements[0]?.currentOffice?.officeName ||
            registration.regionOfRegistration ||
            null;
        }
      }

      // Fallback from documentMovements if still missing
      if (!fromOfficeName && mov.action !== "Created" && registration.documentMovements.length > 0) {
        fromOfficeName = registration.documentMovements[0]?.fromOffice?.officeName || null;
      }
      if (!toOfficeName && registration.documentMovements.length > 0) {
        toOfficeName =
          registration.documentMovements[0]?.toOffice?.officeName ||
          registration.documentMovements[0]?.currentOffice?.officeName ||
          null;
      }

      return {
        ...mov,
        oldOffice: fromOfficeName,
        newOffice: toOfficeName,
        fromOffice: fromOfficeName ? { name: fromOfficeName, officeName: fromOfficeName } : null,
        toOffice: toOfficeName ? { name: toOfficeName, officeName: toOfficeName } : null,
      };
    });

    const movementsByActivity = new Map<string, any>();
    for (const movement of subPackageMovements) {
      if (!movementsByActivity.has(movement.subPackageId)) {
        movementsByActivity.set(movement.subPackageId, movement);
      }
    }
    const configuredActivities = processType?.subPackages || [];
    const activityStatuses = configuredActivities.map((activity) => {
      const movement = movementsByActivity.get(activity.id);
      const status = movement?.status === "Completed"
        ? "Completed"
        : movement?.status === "Rejected"
          ? "Rejected"
          : movement?.status === "In Progress"
            ? "In Progress"
            : "Pending";
      const date = status === "Completed"
        ? movement.completedAt
        : status === "Rejected"
          ? movement.rejectedAt
          : null;

      return {
        id: activity.id,
        name: activity.name,
        status,
        date: date?.toISOString() || null,
        rejectionReason: status === "Rejected" ? movement.rejectionReason || null : null,
      };
    });

    const latestMovement = registration.documentMovements[0] || null;
    const activeSubPackageMov =
      subPackageMovements.find((m: any) => m.status === "In Progress") ||
      subPackageMovements[0] ||
      null;

    const rawSubPackageId =
      activeSubPackageMov?.subPackageId ||
      registration.subPackage ||
      null;

    // Resolve human-readable sub-package name
    const subPackageNameMap = new Map<string, string>();
    for (const act of configuredActivities) {
      subPackageNameMap.set(act.id, act.name);
      subPackageNameMap.set(act.name.trim().toLowerCase(), act.name);
    }

    let currentSubPackage = "-";
    let currentSubPackageId: string | null = rawSubPackageId;

    if (rawSubPackageId) {
      if (subPackageNameMap.has(rawSubPackageId)) {
        currentSubPackage = subPackageNameMap.get(rawSubPackageId)!;
      } else if (subPackageNameMap.has(rawSubPackageId.trim().toLowerCase())) {
        currentSubPackage = subPackageNameMap.get(rawSubPackageId.trim().toLowerCase())!;
      } else {
        // Fallback: look up directly in SubPackage table by id or name
        const foundSubPackage = await prisma.subPackage.findFirst({
          where: {
            OR: [
              { id: rawSubPackageId },
              { name: rawSubPackageId },
            ],
          },
          select: { id: true, name: true },
        });

        if (foundSubPackage) {
          currentSubPackage = foundSubPackage.name;
          currentSubPackageId = foundSubPackage.id;
        } else {
          // If it was already a human-readable name that isn't a cuid ID
          const isCuid = /^c[a-z0-9]{24}$/i.test(rawSubPackageId.trim());
          currentSubPackage = isCuid ? "-" : rawSubPackageId;
        }
      }
    }

    // 1. Resolve Creator User Name
    let resolvedCreatedByName = "Unknown User";
    const rawCreatedById = registration.createdBy || null;

    if (registration.creator?.name?.trim()) {
      resolvedCreatedByName = registration.creator.name.trim();
    } else if (rawCreatedById) {
      const user = await prisma.user.findFirst({
        where: { id: rawCreatedById },
        select: { id: true, name: true },
      });
      if (user?.name?.trim()) {
        resolvedCreatedByName = user.name.trim();
      } else if (registration.registeredPerson && !isUserIdLike(registration.registeredPerson)) {
        // Supported historical user-name snapshot
        resolvedCreatedByName = registration.registeredPerson.trim();
      }
    } else if (registration.registeredPerson && !isUserIdLike(registration.registeredPerson)) {
      resolvedCreatedByName = registration.registeredPerson.trim();
    }

    // 2. Resolve Updater User Name
    let resolvedUpdatedByName: string | null = null;
    let resolvedUpdatedById: string | null = null;

    const rawUpdatedBy = (registration as any).updatedBy || (registration as any).updated_by || null;
    const rawUpdatedById = (registration as any).updatedById || (rawUpdatedBy && isUserIdLike(rawUpdatedBy) ? rawUpdatedBy : null);

    if (rawUpdatedById) {
      resolvedUpdatedById = rawUpdatedById;
      if (rawUpdatedById === rawCreatedById && registration.creator?.name?.trim()) {
        resolvedUpdatedByName = registration.creator.name.trim();
      } else {
        const updaterUser = await prisma.user.findFirst({
          where: { id: rawUpdatedById },
          select: { id: true, name: true },
        });
        resolvedUpdatedByName = updaterUser?.name?.trim() || "Unknown User";
      }
    } else if (rawUpdatedBy && typeof rawUpdatedBy === "string" && !isUserIdLike(rawUpdatedBy)) {
      resolvedUpdatedByName = rawUpdatedBy.trim();
    }

    if (!resolvedUpdatedByName) {
      const auditLogs = registration.auditTrail || [];
      const userAuditLog = auditLogs.find((log) => {
        if (!log.performedBy) return false;
        const pb = log.performedBy.trim().toLowerCase();
        return (
          pb !== "system" &&
          pb !== "genius attestation" &&
          pb !== "data reconciliation script" &&
          pb !== "system maintenance" &&
          pb !== "system migration" &&
          pb !== "system / architect" &&
          pb !== "system backfill" &&
          pb !== "system_correction" &&
          pb !== "system_routing_reconciliation"
        );
      });

      if (userAuditLog?.performedBy) {
        const performed = userAuditLog.performedBy.trim();
        if (isUserIdLike(performed)) {
          if (performed === rawCreatedById && registration.creator?.name?.trim()) {
            resolvedUpdatedByName = registration.creator.name.trim();
            resolvedUpdatedById = performed;
          } else {
            const auditUser = await prisma.user.findFirst({
              where: { id: performed },
              select: { id: true, name: true },
            });
            resolvedUpdatedByName = auditUser?.name?.trim() || "Unknown User";
            resolvedUpdatedById = performed;
          }
        } else {
          resolvedUpdatedByName = performed;
        }
      } else {
        resolvedUpdatedByName = resolvedCreatedByName;
        resolvedUpdatedById = rawCreatedById;
      }
    }

    // Current Process Information
    const currentOffice =
      latestMovement?.currentOffice?.officeName ||
      registration.regionOfRegistration ||
      "Main Office";
    const currentDepartment = "Processing & Verification Operations";
    const currentPackage = registration.processType || registration.externalProcess || "General";
    const currentHandler =
      latestMovement?.receivedBy ||
      registration.registeredPerson ||
      resolvedCreatedByName ||
      "System Handler";
    const currentStatus =
      registration.trackingStatus ||
      latestMovement?.currentStatus ||
      latestMovement?.status ||
      "Registered";
    const currentStage =
      latestMovement?.currentStatus ||
      registration.trackingStatus ||
      "Registered";

    const daysCount = calculateNumberOfDays(
      latestMovement?.receivedAt || latestMovement?.updatedAt || registration.createdAt
    );

    let linkedDocuments: Array<{
      id: string;
      trackingNumber: string;
      documentType: string | null;
      documentName: string | null;
      trackingStatus: string;
      approvalStatus: string;
    }> = [];

    const leadRegs = (registration as any).lead?.registrations;
    const batchRegs = (registration as any).registrationBatch?.registrations;

    if (leadRegs && leadRegs.length > 1) {
      linkedDocuments = leadRegs;
    } else if (batchRegs && batchRegs.length > 1) {
      linkedDocuments = batchRegs;
    }

    return NextResponse.json({
      linkedDocuments,
      registration: {
        ...registration,
        subPackage: currentSubPackage || "-",
        subPackageId: currentSubPackageId,
        totalCharges: Number(registration.totalCharges || 0),
        advancePaid: Number(registration.advancePaid || 0),
        balanceAmount: Number(registration.balanceAmount || 0),
        createdById: rawCreatedById,
        createdByName: resolvedCreatedByName,
        updatedById: resolvedUpdatedById,
        updatedByName: resolvedUpdatedByName,
        createdBy: resolvedCreatedByName,
        updatedBy: resolvedUpdatedByName,
      },
      currentProcess: {
        currentOffice,
        currentDepartment,
        currentPackage,
        currentSubPackage: currentSubPackage || "-",
        currentSubPackageId,
        currentHandler,
        currentStatus,
        currentStage,
        daysCount,
        activities: activityStatuses,
      },
      subPackageMovements,
      movementHistory,
      workflowHistory,
      advancePaymentApprovals: advancePaymentApprovals.map((item) => ({
        id: item.id,
        registrationId: item.registrationId,
        trackingNumber: item.trackingNumber,
        leadId: item.leadId || "-",
        customerName: item.customerName,
        documentName: item.documentName || "-",
        totalAmount: Number(item.totalAmount),
        advanceAmount: Number(item.advanceAmount),
        remainingBalance: Number(item.remainingBalance),
        currentAdvancePaid: item.currentAdvancePaid ? Number(item.currentAdvancePaid) : 0,
        currentBalance: item.currentBalance ? Number(item.currentBalance) : 0,
        paymentDate: item.paymentDate ? item.paymentDate.toISOString() : item.requestedAt.toISOString(),
        paymentMode: item.paymentMode || "Cash",
        referenceNumber: item.referenceNumber || "-",
        collectedBy: item.collectedBy || item.requestedByName || "-",
        remarks: item.remarks || null,
        proofFileType: item.proofFileType || null,
        receiptFileId: item.receiptFileId || null,
        receiptFileUrl: item.receiptFileUrl || null,
        receiptFileName: item.receiptFileName || null,
        status: item.status,
        requestedBy: item.requestedByName || "-",
        requestedById: item.requestedById,
        requestedDate: item.requestedAt.toISOString(),
        approvedBy: item.approvedByName || null,
        approvedDate: item.approvedAt?.toISOString() || null,
        rejectedBy: item.rejectedByName || null,
        rejectedDate: item.rejectedAt?.toISOString() || null,
        rejectionReason: item.rejectionReason || null,
        auditLogs: item.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          performedBy: log.performedByName || log.performedBy,
          remarks: log.remarks,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        })),
      })),
    });
  } catch (error: any) {
    console.error("[GET_DOCUMENT_DETAILS_ERROR]", error);
    return NextResponse.json(
      { message: error?.message || "Failed to load document details." },
      { status: 500 }
    );
  }
}

import { NextResponse, NextRequest } from "next/server";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import { submitAdvancePaymentApproval } from "@/features/revenue/server/advance-payment-approval.service";
import { createMovementApprovalRequest } from "@/features/document-movement/server/movement-approval.service";
import { Prisma } from "@prisma/client";
import { parseDateValue, normalizeTrackingNumber } from "@/features/registration/server/registration-fields";

function cleanStr(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function generateTrackingNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `IMP-${dateStr}-${randomHex}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const permissionResponse = await requireApiPermission("revenue_registration.import");
    if (permissionResponse instanceof NextResponse) return permissionResponse;

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const importedBy = session.user.id;
    const importedAt = new Date();
    const batchId = crypto.randomUUID();

    const { fileName, rows } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }

    // Resolve user's default office location name in case a row doesn't specify one
    const userDefaultOffice = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
      userId: session.user?.id,
    });

    let successfulRows = 0;
    let failedRows = 0;
    let skippedRows = 0;
    const failedRowDetails: Array<{ rowNumber: number; reason: string }> = [];

    // Pre-fetch office locations for fast ID resolution
    const officeLocations = await prisma.officeLocation.findMany({
      where: { ownerAdminId },
      select: { id: true, officeName: true },
    });

    const officeMap = new Map<string, { id: string; name: string }>();
    officeLocations.forEach((o) => {
      officeMap.set(o.officeName.toLowerCase().trim(), { id: o.id, name: o.officeName });
    });

    for (const rowObj of rows) {
      // Skip if explicitly unchecked or status is Mismatch or action is Skip
      if (!rowObj.isSelected || rowObj.status === "Mismatch" || rowObj.resolutionAction === "Skip") {
        skippedRows++;
        continue;
      }

      const data = rowObj.data;
      let rawTrackingNumber = cleanStr(data.trackingNumber);
      let trackingNumber = normalizeTrackingNumber(rawTrackingNumber);
      const resolutionAction = rowObj.resolutionAction || "Create";

      if (!trackingNumber) {
        trackingNumber = generateTrackingNumber();
      }

      if (resolutionAction === "Duplicate") {
        const uniqueSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
        trackingNumber = `${trackingNumber}-DUP-${uniqueSuffix}`;
      }

      const totalCharges = Number(data.totalCharges || 0);
      const advancePaid = Number(data.advancePaid || 0);
      const balanceAmount = Math.max(0, totalCharges - advancePaid);

      const targetOfficeName = String(data.regionOfRegistration || userDefaultOffice || "Main Office").trim();
      const normOffice = targetOfficeName.toLowerCase();
      let sourceOfficeId = officeMap.get(normOffice)?.id;

      if (!sourceOfficeId) {
        // Find or safely create office location for current tenant
        const newOffice = await prisma.officeLocation.upsert({
          where: { officeName_ownerAdminId: { officeName: targetOfficeName, ownerAdminId } },
          update: {},
          create: {
            officeName: targetOfficeName,
            location: "Office",
            timezone: "UTC",
            ownerAdminId,
          },
          select: { id: true, officeName: true },
        });
        sourceOfficeId = newOffice.id;
        officeMap.set(normOffice, { id: newOffice.id, name: newOffice.officeName });
      }

      const computedPaymentStatus = calculatePaymentStatus({
        approvalStatus: data.approvalStatus || "Pending",
        advancePaymentStatus: advancePaid > 0 ? "Pending Approval" : "None",
        totalCharges,
        advancePaid,
        balanceAmount,
      });

      const parseDate = (d?: any) => {
        if (!d) return null;
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const rawCreatedDate = data.createdDate;
      let explicitCreatedAt: Date | undefined = undefined;
      if (rawCreatedDate) {
        const p = parseDateValue(rawCreatedDate);
        if (p.isValid && p.date) {
          explicitCreatedAt = p.date;
        }
      }

      const payload: any = {
        trackingNumber,
        customerName: data.customerName ? String(data.customerName).trim() : null,
        mobile: data.mobile ? String(data.mobile).trim() : null,
        email: data.email ? String(data.email).trim() : null,
        address: data.address ? String(data.address).trim() : null,
        country: data.country ? String(data.country).trim() : "India",
        state: data.state ? String(data.state).trim() : null,
        city: data.city ? String(data.city).trim() : null,
        customerType: data.customerType ? String(data.customerType).trim() : "Individual",
        corporateDetailId: data.corporateDetailId || null,
        documentType: data.documentType ? String(data.documentType).trim() : null,
        documentName: data.documentName ? String(data.documentName).trim() : null,
        documentIssuedCountry: data.documentIssuedCountry ? String(data.documentIssuedCountry).trim() : null,
        processType: data.processType ? String(data.processType).trim() : null,
        subPackage: data.subPackage ? String(data.subPackage).trim() : null,
        externalProcess: data.externalProcess ? String(data.externalProcess).trim() : null,
        priority: data.priority ? String(data.priority).trim() : "Normal",
        committedDuration: data.committedDuration ? String(data.committedDuration).trim() : null,
        deliveryLocation: data.deliveryLocation ? String(data.deliveryLocation).trim() : targetOfficeName,
        totalCharges: new Prisma.Decimal(totalCharges),
        advancePaid: new Prisma.Decimal(0), // Until approved via advance approval workflow
        balanceAmount: new Prisma.Decimal(totalCharges),
        paymentMode: data.paymentMode ? String(data.paymentMode).trim() : (totalCharges > 0 ? "Cash" : null),
        upiTransactionId: data.upiTransactionId ? String(data.upiTransactionId).trim() : null,
        bankName: data.bankName ? String(data.bankName).trim() : null,
        transactionRefNo: data.transactionRefNo ? String(data.transactionRefNo).trim() : null,
        transferDate: parseDate(data.transferDate),
        chequeNumber: data.chequeNumber ? String(data.chequeNumber).trim() : null,
        chequeDate: parseDate(data.chequeDate),
        ddNumber: data.ddNumber ? String(data.ddNumber).trim() : null,
        ddDate: parseDate(data.ddDate),
        cardLast4: data.cardLast4 ? String(data.cardLast4).trim() : null,
        approvalCode: data.approvalCode ? String(data.approvalCode).trim() : null,
        paymentGateway: data.paymentGateway ? String(data.paymentGateway).trim() : null,
        onlineTransactionId: data.onlineTransactionId ? String(data.onlineTransactionId).trim() : null,
        walletName: data.walletName ? String(data.walletName).trim() : null,
        walletTransactionId: data.walletTransactionId ? String(data.walletTransactionId).trim() : null,
        paymentReferenceNo: data.paymentReferenceNo ? String(data.paymentReferenceNo).trim() : null,
        paymentDescription: data.paymentDescription ? String(data.paymentDescription).trim() : null,
        paymentStatus: computedPaymentStatus,
        collectedPerson: data.collectedPerson ? String(data.collectedPerson).trim() : null,
        commissionToUserId: data.commissionToUserId || null,
        commissionToName: data.commissionToName || null,
        commissionToEmail: data.commissionToEmail || null,
        registeredPerson: data.registeredPerson ? String(data.registeredPerson).trim() : (session.user.name || null),
        regionOfRegistration: targetOfficeName,
        approvalStatus: data.approvalStatus || "Pending",
        trackingStatus: data.trackingStatus || "Registered",
        welcomeCallStatus: data.welcomeCallStatus || "Pending",
        ownerAdminId,
        createdBy: importedBy,
        createdAt: explicitCreatedAt || importedAt,
        importBatchId: batchId,
        importFileName: fileName || "Imported Spreadsheet",
        importedBy,
        importedAt,
        originalRowNumber: rowObj.rowNumber,
      };

      try {
        if (resolutionAction === "Update") {
          const existingReg = await prisma.registration.findFirst({
            where: { trackingNumber, ownerAdminId },
          });

          if (existingReg) {
            await prisma.$transaction(async (tx) => {
              await tx.registration.update({
                where: { id: existingReg.id },
                data: {
                  ...payload,
                  createdBy: undefined, // Preserve original creator
                  createdAt: explicitCreatedAt ? explicitCreatedAt : undefined,
                },
              });

              await tx.auditTrail.create({
                data: {
                  registrationId: existingReg.id,
                  action: "Import Update",
                  description: `Registration updated via bulk import (Batch ID: ${batchId})`,
                  performedBy: session.user.name || session.user.email || importedBy,
                },
              });
            }, { maxWait: 20000, timeout: 60000 });
            successfulRows++;
            continue;
          }
        }

        // Server-side uniqueness check before creating new record
        const existingConflict = await prisma.registration.findFirst({
          where: { trackingNumber, ownerAdminId },
          select: { id: true, trackingNumber: true },
        });

        if (existingConflict) {
          failedRows++;
          failedRowDetails.push({
            rowNumber: rowObj.rowNumber,
            reason: `Tracking Number "${trackingNumber}" already exists in the database.`,
          });
          continue;
        }

        // Create new registration with complete full workflow
        const createdReg = await prisma.$transaction(async (tx) => {
          const reg = await tx.registration.create({
            data: {
              ...payload,
              auditTrail: {
                create: [
                  {
                    action: "Registration imported",
                    description: `Registration ${trackingNumber} created via bulk import (Batch: ${batchId}).`,
                    performedBy: session.user.name || session.user.email || importedBy,
                  },
                ],
              },
              documentMovements: {
                create: {
                  trackingNumber,
                  currentOfficeId: sourceOfficeId,
                  currentModule: "REGISTRATION",
                  status: "HOME",
                  movementType: "INITIAL",
                  createdBy: session.user.name || session.user.email || importedBy,
                  originOfficeId: sourceOfficeId,
                  processChain: [],
                },
              },
            },
          });

          await tx.movementHistory.create({
            data: {
              trackingNumber,
              action: "Created",
              newStatus: "HOME",
              newOffice: targetOfficeName,
              performedBy: session.user.name || session.user.email || importedBy,
            },
          });

          return reg;
        }, { maxWait: 20000, timeout: 60000 });

        // Trigger advance payment approval or movement approval workflow
        if (advancePaid > 0) {
          await submitAdvancePaymentApproval({
            ownerAdminId,
            registrationId: createdReg.id,
            advanceAmount: advancePaid,
            paymentDate: new Date(),
            paymentMode: payload.paymentMode || "Cash",
            referenceNumber: payload.transactionRefNo || payload.upiTransactionId || null,
            collectedBy: payload.collectedPerson || null,
            performedByUserId: importedBy,
          }).catch((err) => console.error("[import] submitAdvancePaymentApproval error:", err));
        } else {
          await createMovementApprovalRequest({
            ownerAdminId,
            registrationId: createdReg.id,
            performedBy: session.user.name || session.user.email || importedBy,
          }).catch((err) => console.error("[import] createMovementApprovalRequest error:", err));
        }

        successfulRows++;
      } catch (rowError: any) {
        console.error(`[import confirm] Error importing row ${rowObj.rowNumber}:`, rowError);
        failedRows++;
        failedRowDetails.push({
          rowNumber: rowObj.rowNumber,
          reason: rowError?.message || "Database insertion failed",
        });
      }
    }

    // Store Import History record
    await (prisma as any).importHistory.create({
      data: {
        batchId,
        module: "Revenue Registration",
        fileName: fileName || "Unknown",
        totalRows: rows.length,
        successfulRows,
        failedRows,
        skippedRows,
        importedBy,
        ownerAdminId,
      },
    }).catch((err: any) => console.error("[import confirm] Failed to save import history:", err));

    return NextResponse.json({
      success: true,
      batchId,
      summary: {
        totalRows: rows.length,
        successfulRows,
        failedRows,
        skippedRows,
        failedRowDetails,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/registrations/import/confirm] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm import", details: error.message },
      { status: 500 }
    );
  }
}

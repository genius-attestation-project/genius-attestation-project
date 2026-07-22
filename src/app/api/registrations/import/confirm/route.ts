import { NextResponse, NextRequest } from "next/server";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const sessionResponse = await requireApiPermission("revenue_registration.import");
    if (sessionResponse instanceof NextResponse) return sessionResponse; // Access denied

    const session = await auth();
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const importedBy = session.user.id;
    const importedAt = new Date();
    const batchId = crypto.randomUUID();

    const { fileName, summary, rows } = await req.json();

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }

    // 1. Create New Office Locations
    const newOffices = summary?.newOffices || [];
    for (const officeName of newOffices) {
      await prisma.officeLocation.upsert({
        where: { officeName_ownerAdminId: { officeName, ownerAdminId } },
        update: {},
        create: {
          officeName,
          location: "Imported via Registration Import",
          timezone: "Asia/Kolkata",
          employees: 1,
          isProcessOffice: false,
          ownerAdminId
        }
      });
    }

    let successfulRows = 0;
    let failedRows = 0;
    let skippedRows = 0;
    
    // 2. Process Rows
    for (const rowObj of rows) {
      if (rowObj.status === "Error" || rowObj.resolutionAction === "Skip") {
        skippedRows++;
        continue;
      }

      const data = rowObj.data;
      let trackingNumber = data["Tracking Number"] || `IMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      
      const payload: any = {
        trackingNumber,
        customerName: data["Customer Name*"] || data["Customer Name"],
        mobile: data["Mobile Number*"] || data["Mobile Number"],
        email: data["Email"] || null,
        address: data["Address"] || null,
        country: data["Country"] || null,
        state: data["State"] || null,
        city: data["City"] || null,
        customerType: data["Customer Type"] || null,
        documentType: data["Document Type"] || null,
        documentIssuedCountry: data["Document Issued Country"] || null,
        processType: data["Service/Process Type*"] || data["Service/Process Type"] || null,
        externalProcess: data["External Process"] || null,
        priority: data["Priority"] || null,
        committedDuration: data["Committed Duration"] || null,
        deliveryLocation: data["Delivery Location"] || null,
        totalCharges: parseFloat(data["Total Charges*"] || data["Total Charges"] || "0"),
        advancePaid: parseFloat(data["Advance Paid"] || "0"),
        paymentMode: data["Payment Mode"] || null,
        paymentStatus: data["Payment Status"] || "Pending",
        financeApprovalStatus: data["Finance Approval Status"] || "Pending",
        commissionToName: data.commissionToName || null,
        commissionToUserId: data.commissionToUserId || null,
        collectedPerson: data["Collected Person Name"] || null,
        registeredPerson: data["Registered Person Name"] || null,
        regionOfRegistration: data["Region of Registration"] || null,
        bmStatus: data["BM Status"] || "Pending",
        approvalStatus: data["Approval Status"] || "Pending",
        trackingStatus: data["Tracking Status"] || "Registered",
        welcomeCallStatus: data["Welcome Call Status"] || "Pending",
        ownerAdminId,
        createdBy: importedBy,
        importBatchId: batchId,
        importFileName: fileName,
        importedBy: importedBy,
        importedAt: importedAt,
        originalRowNumber: rowObj.rowNumber,
      };
      
      payload.balanceAmount = payload.totalCharges - payload.advancePaid;
      
      try {
        if (rowObj.resolutionAction === "Update") {
          await prisma.registration.update({
            where: { trackingNumber },
            data: {
              ...payload,
              // don't overwrite createdBy
              createdBy: undefined
            }
          });
          
          await prisma.auditTrail.create({
            data: {
              registrationId: (await prisma.registration.findUnique({ where: { trackingNumber } }))!.id,
              action: "Import Update",
              description: `Registration updated via bulk import (Batch ID: ${batchId})`,
              performedBy: importedBy
            }
          });
          
          successfulRows++;
        } else {
          // "Create" or "Duplicate"
          if (rowObj.resolutionAction === "Duplicate") {
             // Generate a new tracking number suffix to avoid unique constraint error
             trackingNumber = `${trackingNumber}-DUP-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
             payload.trackingNumber = trackingNumber;
          }
          
          const createdReg = await prisma.registration.create({ data: payload });
          
          await prisma.auditTrail.create({
            data: {
              registrationId: createdReg.id,
              action: "Import Created",
              description: `Registration created via bulk import (Batch ID: ${batchId})`,
              performedBy: importedBy
            }
          });
          
          successfulRows++;
        }
      } catch (err: any) {
        console.error(`Error processing row ${rowObj.rowNumber}:`, err);
        failedRows++;
      }
    }

    // 3. Store Import History
    const history = await (prisma as any).importHistory.create({
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
      }
    });

    return NextResponse.json({
      success: true,
      batchId,
      summary: {
        totalRows: rows.length,
        successfulRows,
        failedRows,
        skippedRows
      }
    });
  } catch (error: any) {
    console.error("Confirm API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm import", details: error.message },
      { status: 500 }
    );
  }
}

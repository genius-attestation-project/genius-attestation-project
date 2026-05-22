import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { updateLead } from "../src/features/lead/server/lead.service";

const prisma = new PrismaClient();

async function test() {
  try {
    const lead = await prisma.lead.findFirst();
    if (!lead) {
      console.log("No lead found");
      return;
    }
    console.log("Updating lead:", lead.id);
    const input = {
      firstName: lead.firstName,
      lastName: lead.lastName || "",
      countryCode: lead.countryCode,
      mobileNumber: lead.mobileNumber,
      email: lead.email,
      docType: lead.docType || "",
      noOfDocuments: lead.noOfDocuments || 0,
      country: lead.country,
      state: lead.state || "",
      documentIssuedCountry: lead.documentIssuedCountry || "",
      service: lead.service,
      source: lead.source || "",
      leadStatus: "LOB",
      clientType: lead.clientType || "",
      amount: Number(lead.amount) || 0,
      workingDays: lead.workingDays || 0,
      remark: lead.remark || "",
      assignedUser: lead.assignedUser || "",
      nextFollowupAt: lead.nextFollowupAt || undefined
    };
    
    // @ts-ignore
    const result = await updateLead(lead.ownerAdminId, lead.id, input);
    console.log("Success");
  } catch (error) {
    console.error("Error updating lead:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();

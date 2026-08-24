import { registrationInputSchema } from "@/features/registration/validations/registration.schema";

function testNumeric(val: any, label: string) {
  const payload = {
    trackingNumber: "REG-12345",
    customerName: "John Doe",
    mobile: "+919876543210",
    email: "john@example.com",
    address: "123 Street",
    country: "India",
    state: "Kerala",
    city: "Kochi",
    customerType: "Individual",
    documentType: "Degree Certificate",
    documentName: "B.Tech Degree",
    documentIssuedCountry: "India",
    processType: "HRD Attestation",
    subPackage: "",
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "7 Working Days",
    deliveryLocation: "Kochi HQ",
    totalCharges: val,
    advancePaid: 500,
    paymentMode: "Cash",
    paymentStatus: "Pending Approval",
    collectedPerson: "Staff User",
    approvalStatus: "Pending",
  };

  const res = registrationInputSchema.safeParse(payload);
  if (!res.success) {
    console.log(`[${label} (${JSON.stringify(val)})] FAILED:`, res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(", "));
  } else {
    console.log(`[${label} (${JSON.stringify(val)})] PASSED -> parsed totalCharges:`, res.data.totalCharges);
  }
}

testNumeric(null, "null");
testNumeric(undefined, "undefined");
testNumeric("", "empty string");
testNumeric("5,000", "comma string");
testNumeric("₹ 5,000", "rupee symbol string");
testNumeric("₹5000", "rupee symbol no space");
testNumeric(5000, "number 5000");
testNumeric("5000", "string 5000");

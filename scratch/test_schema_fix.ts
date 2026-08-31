import { z } from "zod";

const approvalStatusOptions = ["Pending", "Approved", "Accepted", "Rejected"] as const;

const optionalText = z
  .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
  .optional()
  .default("");

const requiredText = (label: string, maxLen?: number) => {
  let base = z
    .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
    .pipe(z.string().min(1, `${label} is required.`));
  if (maxLen) {
    base = base.pipe(z.string().max(maxLen, `${label} cannot exceed ${maxLen} characters.`));
  }
  return base;
};

const requiredEmail = (label: string) =>
  z
    .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
    .pipe(z.string().min(1, `${label} is required.`).email("Enter a valid email address."));

const mobileNumber = z
  .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (value.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  })
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid mobile number");

const numericField = (label: string, required = false) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return required ? undefined : 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.-]/g, "").trim();
      return cleaned === "" ? (required ? undefined : 0) : Number(cleaned);
    }
    return val;
  }, z.number({ invalid_type_error: `${label} must be a valid number.` }).min(0, `${label} cannot be negative.`));

const schema = z.object({
  trackingNumber: requiredText("Tracking number"),
  customerName: requiredText("Customer name"),
  mobile: mobileNumber,
  email: requiredEmail("Email"),
  address: requiredText("Address"),
  country: requiredText("Country"),
  state: optionalText,
  city: optionalText,
  customerType: requiredText("Customer type"),
  corporateDetailId: optionalText,
  documentType: requiredText("Document type"),
  documentName: requiredText("Document name", 255),
  documentIssuedCountry: requiredText("Document issued country"),
  processType: requiredText("Process type"),
  subPackage: optionalText,
  externalProcess: requiredText("Additional process"),
  priority: requiredText("Special processing priority"),
  committedDuration: requiredText("Committed duration / SLA"),
  deliveryLocation: requiredText("Delivery location"),
  totalCharges: numericField("Total charges", false),
  advancePaid: numericField("Advance paid", false),
  requestedAdvanceAmount: numericField("Requested advance amount", false),
  paymentMode: requiredText("Payment mode"),
  upiTransactionId: optionalText,
  bankName: optionalText,
  transactionRefNo: optionalText,
  transferDate: optionalText,
  chequeNumber: optionalText,
  chequeDate: optionalText,
  ddNumber: optionalText,
  ddDate: optionalText,
  cardLast4: optionalText,
  approvalCode: optionalText,
  paymentGateway: optionalText,
  onlineTransactionId: optionalText,
  walletName: optionalText,
  walletTransactionId: optionalText,
  paymentReferenceNo: optionalText,
  paymentDescription: optionalText,
  paymentStatus: optionalText,
  collectedPerson: optionalText,
  commissionToUserId: optionalText,
  commissionToName: optionalText,
  commissionToEmail: optionalText,
  registeredPerson: optionalText,
  regionOfRegistration: optionalText,
  approvalStatus: z.preprocess(
    (val) => (val && approvalStatusOptions.includes(val as any) ? val : "Pending"),
    z.enum(approvalStatusOptions)
  ),
  trackingStatus: optionalText,
  leadId: optionalText,
}).refine((data) => (data.requestedAdvanceAmount ?? data.advancePaid ?? 0) <= data.totalCharges, {
  message: "Advance payment cannot exceed Total Charges.",
  path: ["advancePaid"],
});

// Run test payloads
const payloads: Record<string, any> = {
  "Full form with nulls": {
    trackingNumber: "REG-001",
    customerName: "Alice",
    mobile: "9876543210",
    email: "alice@test.com",
    address: "Street 1",
    country: "India",
    state: null,
    city: null,
    customerType: "Individual",
    corporateDetailId: null,
    documentType: "Degree",
    documentName: "B.Sc Degree",
    documentIssuedCountry: "India",
    processType: "HRD",
    subPackage: null,
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "5 Days",
    deliveryLocation: "Kochi HQ",
    totalCharges: "5000",
    advancePaid: "500",
    requestedAdvanceAmount: "500",
    paymentMode: "Cash",
    paymentStatus: "Pending Approval",
    approvalStatus: null,
  },
  "Form with rupee symbols & strings": {
    trackingNumber: "REG-002",
    customerName: "Bob",
    mobile: "+919876543210",
    email: "bob@test.com",
    address: "Street 2",
    country: "India",
    customerType: "Individual",
    documentType: "Degree",
    documentName: "M.Sc Degree",
    documentIssuedCountry: "India",
    processType: "MEA",
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "3 Days",
    deliveryLocation: "Kochi HQ",
    totalCharges: "₹ 5,000",
    advancePaid: "₹ 500",
    requestedAdvanceAmount: "₹ 500",
    paymentMode: "Cash",
  },
};

for (const [key, payload] of Object.entries(payloads)) {
  const res = schema.safeParse(payload);
  if (res.success) {
    console.log(`[PASS] ${key}:`, {
      totalCharges: res.data.totalCharges,
      advancePaid: res.data.advancePaid,
      requestedAdvanceAmount: res.data.requestedAdvanceAmount,
      mobile: res.data.mobile,
      approvalStatus: res.data.approvalStatus,
    });
  } else {
    console.log(`[FAIL] ${key}:`, res.error.issues);
  }
}

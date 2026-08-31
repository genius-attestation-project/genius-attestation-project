/**
 * Centralized Field Definitions & Metadata for Revenue Registration.
 * Synchronizes Import Template, Import Validation, Import Preview, Confirm Importer, and Export.
 */

export type FieldType =
  | "string"
  | "phone"
  | "email"
  | "number"
  | "date"
  | "enum"
  | "master"
  | "office"
  | "user"
  | "corporate";

export type MasterDataTypeKey =
  | "DOCUMENT_TYPES"
  | "PROCESS_TYPES"
  | "SUB_PACKAGES"
  | "CUSTOMER_TYPES"
  | "PAYMENT_MODES"
  | "COUNTRIES";

export interface RegistrationFieldDefinition {
  key: string;
  label: string;
  aliases: string[];
  category: "Customer Information" | "Document Details" | "Commercial & Payment" | "Registration & Workflow";
  type: FieldType;
  required: boolean;
  masterType?: MasterDataTypeKey;
  enumOptions?: readonly string[];
  description: string;
  example: string | number;
  importable: boolean;
  exportable: boolean;
  defaultVal?: any;
}

export const REGISTRATION_FIELD_DEFINITIONS: RegistrationFieldDefinition[] = [
  // --- Section 1: Customer Information ---
  {
    key: "customerName",
    label: "Customer Name",
    aliases: ["Customer Name*", "customer_name", "Customer Name", "Customer", "Name"],
    category: "Customer Information",
    type: "string",
    required: false,
    description: "Full name of the customer (Optional)",
    example: "John Doe",
    importable: true,
    exportable: true,
  },
  {
    key: "mobile",
    label: "Mobile Number",
    aliases: ["Mobile Number*", "mobile_number", "Mobile Number", "Mobile", "Phone Number", "phone"],
    category: "Customer Information",
    type: "phone",
    required: false,
    description: "Customer contact mobile number with country code (Optional, 7-15 digits)",
    example: "+919876543210",
    importable: true,
    exportable: true,
  },
  {
    key: "email",
    label: "Email",
    aliases: ["Email", "email", "Email Address", "Customer Email"],
    category: "Customer Information",
    type: "email",
    required: false,
    description: "Customer email address (Optional)",
    example: "john.doe@example.com",
    importable: true,
    exportable: true,
  },
  {
    key: "address",
    label: "Address",
    aliases: ["Address", "address", "Customer Address"],
    category: "Customer Information",
    type: "string",
    required: false,
    description: "Customer physical address (Optional)",
    example: "123 MG Road, Suite 400",
    importable: true,
    exportable: true,
  },
  {
    key: "country",
    label: "Country",
    aliases: ["Country", "country", "Customer Country"],
    category: "Customer Information",
    type: "string",
    required: false,
    description: "Customer country of residence (Optional, e.g. India, UAE)",
    example: "India",
    importable: true,
    exportable: true,
    defaultVal: "India",
  },
  {
    key: "state",
    label: "State",
    aliases: ["State", "state", "Province"],
    category: "Customer Information",
    type: "string",
    required: false,
    description: "State or province (Optional)",
    example: "Kerala",
    importable: true,
    exportable: true,
  },
  {
    key: "city",
    label: "City",
    aliases: ["City", "city", "Town"],
    category: "Customer Information",
    type: "string",
    required: false,
    description: "City or town (Optional)",
    example: "Kochi",
    importable: true,
    exportable: true,
  },
  {
    key: "customerType",
    label: "Customer Type",
    aliases: ["Customer Type", "customer_type", "Client Type"],
    category: "Customer Information",
    type: "master",
    masterType: "CUSTOMER_TYPES",
    required: false,
    description: "Customer classification: Individual or Corporate (Optional, defaults to Individual)",
    example: "Individual",
    importable: true,
    exportable: true,
    defaultVal: "Individual",
  },
  {
    key: "corporateDetailName",
    label: "Company Name",
    aliases: ["Company Name", "Company", "Corporate Company", "corporate_detail_id", "Corporate Detail", "Corporate Name"],
    category: "Customer Information",
    type: "corporate",
    required: false,
    description: "Registered corporate company name if customer type is Corporate (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },

  // --- Section 2: Document Details ---
  {
    key: "documentType",
    label: "Document Type",
    aliases: ["Document Type", "document_type", "Doc Type"],
    category: "Document Details",
    type: "master",
    masterType: "DOCUMENT_TYPES",
    required: false,
    description: "Document classification from Master Configuration (e.g. Degree Certificate, Marriage Certificate)",
    example: "Degree Certificate",
    importable: true,
    exportable: true,
  },
  {
    key: "documentName",
    label: "Document Name",
    aliases: ["Document Name", "document_name", "Doc Name", "Document Title"],
    category: "Document Details",
    type: "string",
    required: false,
    description: "Specific name/title of document (Optional)",
    example: "B.Tech Computer Science Certificate",
    importable: true,
    exportable: true,
  },
  {
    key: "documentIssuedCountry",
    label: "Document Issued Country",
    aliases: ["Document Issued Country", "document_issued_country", "Doc Issued Country", "Origin Country"],
    category: "Document Details",
    type: "string",
    required: false,
    description: "Country where the document was originally issued (Optional)",
    example: "India",
    importable: true,
    exportable: true,
  },
  {
    key: "processType",
    label: "Process Type",
    aliases: ["Process Type", "process_type", "Service/Process Type*", "Service/Process Type", "Service", "Attestation Type"],
    category: "Document Details",
    type: "master",
    masterType: "PROCESS_TYPES",
    required: false,
    description: "Process / Attestation type from Master Configuration (e.g. Apostille, Embassy Attestation, MEA)",
    example: "Apostille",
    importable: true,
    exportable: true,
  },
  {
    key: "subPackage",
    label: "Sub Package",
    aliases: ["Sub Package", "sub_package", "Sub Process", "Package"],
    category: "Document Details",
    type: "master",
    masterType: "SUB_PACKAGES",
    required: false,
    description: "Sub-package or sub-process linked to the Process Type (Optional)",
    example: "Standard",
    importable: true,
    exportable: true,
  },
  {
    key: "externalProcess",
    label: "Additional Process",
    aliases: ["Additional Process", "external_process", "External Process"],
    category: "Document Details",
    type: "string",
    required: false,
    description: "Any additional processing requirements or external departments (Optional)",
    example: "MEA Verification",
    importable: true,
    exportable: true,
  },
  {
    key: "priority",
    label: "Priority",
    aliases: ["Priority", "priority", "Special Processing Priority", "Urgency"],
    category: "Document Details",
    type: "enum",
    enumOptions: ["Normal", "Express", "Super Fast"],
    required: false,
    description: "Processing priority: Normal, Express, Super Fast (Optional, defaults to Normal)",
    example: "Normal",
    importable: true,
    exportable: true,
    defaultVal: "Normal",
  },
  {
    key: "committedDuration",
    label: "Committed Duration",
    aliases: ["Committed Duration", "committed_duration", "Committed Duration / SLA", "SLA", "Duration"],
    category: "Document Details",
    type: "string",
    required: false,
    description: "Target turnaround duration / SLA commitment (Optional)",
    example: "15 Days",
    importable: true,
    exportable: true,
  },
  {
    key: "deliveryLocation",
    label: "Delivery Location",
    aliases: ["Delivery Location", "delivery_location", "Delivery Office", "Dispatch Location"],
    category: "Document Details",
    type: "office",
    required: false,
    description: "Target Office Location for document return or standard delivery (Optional)",
    example: "Kochi HQ",
    importable: true,
    exportable: true,
  },

  // --- Section 3: Commercial & Payment ---
  {
    key: "totalCharges",
    label: "Total Charges",
    aliases: ["Total Charges", "total_charges", "Total Charges*", "Charge", "Total Amount", "Amount"],
    category: "Commercial & Payment",
    type: "number",
    required: false,
    description: "Total invoice charge for registration in currency units (Optional, defaults to 0)",
    example: 5000,
    importable: true,
    exportable: true,
    defaultVal: 0,
  },
  {
    key: "advancePaid",
    label: "Advance Paid",
    aliases: ["Advance Paid", "advance_paid", "Paid Amount", "Advance Amount", "Initial Payment"],
    category: "Commercial & Payment",
    type: "number",
    required: false,
    description: "Advance amount paid by customer (Optional, defaults to 0, cannot exceed Total Charges)",
    example: 1000,
    importable: true,
    exportable: true,
    defaultVal: 0,
  },
  {
    key: "paymentMode",
    label: "Payment Mode",
    aliases: ["Payment Mode", "payment_mode", "Mode of Payment", "Payment Method"],
    category: "Commercial & Payment",
    type: "master",
    masterType: "PAYMENT_MODES",
    required: false,
    description: "Mode of payment: Cash, Bank Transfer, UPI, Credit Card, Debit Card, Cheque, Demand Draft, Online, Wallet, Other",
    example: "Bank Transfer",
    importable: true,
    exportable: true,
    defaultVal: "Cash",
  },
  {
    key: "upiTransactionId",
    label: "UPI Transaction ID",
    aliases: ["UPI Transaction ID", "upi_transaction_id", "UPI Ref", "UPI ID"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "UPI reference number when payment mode is UPI (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "bankName",
    label: "Bank Name",
    aliases: ["Bank Name", "bank_name", "Bank"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Name of bank for Bank Transfer, Cheque, or DD (Optional)",
    example: "State Bank of India",
    importable: true,
    exportable: true,
  },
  {
    key: "transactionRefNo",
    label: "Transaction Reference No",
    aliases: ["Transaction Reference No", "transaction_ref_no", "Transaction Ref No", "Bank Reference No", "UTR Number", "UTR"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Bank transfer reference / UTR number (Optional)",
    example: "SBIN1234567890",
    importable: true,
    exportable: true,
  },
  {
    key: "transferDate",
    label: "Transfer Date",
    aliases: ["Transfer Date", "transfer_date", "Date of Transfer"],
    category: "Commercial & Payment",
    type: "date",
    required: false,
    description: "Date of bank transfer YYYY-MM-DD (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "chequeNumber",
    label: "Cheque Number",
    aliases: ["Cheque Number", "cheque_number", "Check Number", "Cheque No"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Cheque number if payment mode is Cheque (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "chequeDate",
    label: "Cheque Date",
    aliases: ["Cheque Date", "cheque_date", "Check Date"],
    category: "Commercial & Payment",
    type: "date",
    required: false,
    description: "Cheque issue date YYYY-MM-DD (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "ddNumber",
    label: "DD Number",
    aliases: ["DD Number", "dd_number", "Demand Draft Number", "DD No"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Demand Draft number if payment mode is DD (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "ddDate",
    label: "DD Date",
    aliases: ["DD Date", "dd_date", "Demand Draft Date"],
    category: "Commercial & Payment",
    type: "date",
    required: false,
    description: "Demand Draft date YYYY-MM-DD (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "cardLast4",
    label: "Card Last 4 Digits",
    aliases: ["Card Last 4 Digits", "card_last4", "Card Last 4", "Last 4 Digits"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Last 4 digits of Credit/Debit card (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "approvalCode",
    label: "Card Approval Code",
    aliases: ["Card Approval Code", "approval_code", "Approval Code", "Auth Code"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Card POS/Terminal authorization code (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "paymentGateway",
    label: "Payment Gateway",
    aliases: ["Payment Gateway", "payment_gateway", "Gateway"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Payment gateway name (e.g. Razorpay, Stripe) (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "onlineTransactionId",
    label: "Online Transaction ID",
    aliases: ["Online Transaction ID", "online_transaction_id", "Online Txn ID", "Gateway Txn ID"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Online gateway transaction identifier (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "walletName",
    label: "Wallet Name",
    aliases: ["Wallet Name", "wallet_name", "Wallet"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "E-Wallet name (e.g. Paytm, PhonePe, Apple Pay) (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "walletTransactionId",
    label: "Wallet Transaction ID",
    aliases: ["Wallet Transaction ID", "wallet_transaction_id", "Wallet Txn ID"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Wallet transaction ID (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "paymentReferenceNo",
    label: "Payment Reference No",
    aliases: ["Payment Reference No", "payment_reference_no", "Payment Ref No", "Payment Description / Ref"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Custom payment reference identifier (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "paymentDescription",
    label: "Payment Description",
    aliases: ["Payment Description", "payment_description", "Payment Remarks", "Payment Notes"],
    category: "Commercial & Payment",
    type: "string",
    required: false,
    description: "Additional notes or description regarding payment (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },
  {
    key: "collectedPerson",
    label: "Collected Person",
    aliases: ["Collected Person", "collected_person", "Collected Person Name", "Collected By"],
    category: "Commercial & Payment",
    type: "user",
    required: false,
    description: "Staff name who collected the document / payment (Optional)",
    example: "Sarah Staff",
    importable: true,
    exportable: true,
  },
  {
    key: "commissionToUser",
    label: "Commission To User",
    aliases: ["Commission To User", "commission_to_user", "Commission To User Name", "Commission To", "commission_to_name"],
    category: "Commercial & Payment",
    type: "user",
    required: false,
    description: "Active system user assigned to receive sales commission (Optional)",
    example: "",
    importable: true,
    exportable: true,
  },

  // --- Section 4: Registration & Workflow ---
  {
    key: "trackingNumber",
    label: "Tracking Number",
    aliases: [
      "Tracking Number",
      "tracking_number",
      "Tracking No",
      "Tracking No.",
      "TR Number",
      "Tracking #",
      "Tracking ID",
      "AWB Number",
      "AWB No",
      "Waybill",
      "Consignment Number",
      "Consignment No",
      "TrackingNumber",
      "track_number",
      "track_no",
      "Tracking",
      "TrackingNo",
      "Docket Number",
      "Docket No",
    ],
    category: "Registration & Workflow",
    type: "string",
    required: false,
    description: "Unique tracking identifier (Optional, will be auto-generated if left blank)",
    example: "TRK-2026-0001",
    importable: true,
    exportable: true,
  },
  {
    key: "registeredPerson",
    label: "Registered Person",
    aliases: ["Registered Person", "registered_person", "Registered Person Name", "Registered By", "Created By"],
    category: "Registration & Workflow",
    type: "user",
    required: false,
    description: "User who created or registered this record (Optional, defaults to current logged in user)",
    example: "Admin User",
    importable: true,
    exportable: true,
  },
  {
    key: "regionOfRegistration",
    label: "Registration Office",
    aliases: ["Registration Office", "region_of_registration", "Region of Registration", "Office", "Branch", "Office Location"],
    category: "Registration & Workflow",
    type: "office",
    required: false,
    description: "Office location where registration originated (Optional, defaults to user's assigned office)",
    example: "Kochi HQ",
    importable: true,
    exportable: true,
  },
  {
    key: "approvalStatus",
    label: "Approval Status",
    aliases: ["Approval Status", "approval_status"],
    category: "Registration & Workflow",
    type: "enum",
    enumOptions: ["Pending", "Approved", "Accepted", "Rejected"],
    required: false,
    description: "Registration approval status: Pending, Approved, Accepted, Rejected (Optional, defaults to Pending)",
    example: "Pending",
    importable: true,
    exportable: true,
    defaultVal: "Pending",
  },
  {
    key: "trackingStatus",
    label: "Tracking Status",
    aliases: ["Tracking Status", "tracking_status", "Workflow Status", "Status", "Current Status"],
    category: "Registration & Workflow",
    type: "enum",
    enumOptions: ["Registered", "In Transfer", "Document In Hand", "Ready for Delivery", "Delivered"],
    required: false,
    description: "Document movement lifecycle status (Optional, defaults to Registered)",
    example: "Registered",
    importable: true,
    exportable: true,
    defaultVal: "Registered",
  },
  {
    key: "createdDate",
    label: "Created Date",
    aliases: [
      "Created Date",
      "created_date",
      "Registration Date",
      "registration_date",
      "Date",
      "date",
      "Created At",
      "created_at",
      "Reg Date",
      "Reg. Date",
      "Created Date (DD/MM/YY)",
      "Created Date (DD/MM/YYYY)",
      "Registration Date (DD/MM/YY)",
      "Registration Date (DD/MM/YYYY)",
      "Created On",
      "Registered Date",
    ],
    category: "Registration & Workflow",
    type: "date",
    required: false,
    description: "Original document registration date DD/MM/YYYY or DD/MM/YYYY HH:mm (Optional, defaults to current import date/time)",
    example: "28/08/2026",
    importable: true,
    exportable: true,
  },
  {
    key: "welcomeCallStatus",
    label: "Welcome Call Status",
    aliases: ["Welcome Call Status", "welcome_call_status"],
    category: "Registration & Workflow",
    type: "string",
    required: false,
    description: "Customer onboarding / welcome call status (Optional, defaults to Pending)",
    example: "Pending",
    importable: true,
    exportable: true,
    defaultVal: "Pending",
  },
];

/**
 * Normalizes a tracking number safely:
 * - Trims whitespace
 * - Preserves leading zeros (e.g. "001234")
 * - Handles number or text equivalents
 */
export function normalizeTrackingNumber(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

/**
 * Formats a Date object or ISO string into canonical display DD/MM/YYYY.
 * Uses UTC methods to prevent any timezone shifts across environments.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Standardized Date Parser for Import & System Workflows.
 * Supports DD/MM/YYYY, DD/MM/YYYY HH:mm, YYYY-MM-DD, ISO strings, Excel serial numbers, and Date objects.
 */
export function parseDateValue(val: any): { date: Date | null; isValid: boolean; rawString: string } {
  if (val === undefined || val === null || val === "") {
    return { date: null, isValid: true, rawString: "" };
  }

  // 1. JS Date object (e.g. from XLSX cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return { date: null, isValid: false, rawString: String(val) };
    }
    // Extract calendar date components safely
    const hours = val.getUTCHours();
    const mins = val.getUTCMinutes();
    const secs = val.getUTCSeconds();
    const isMidnight = hours === 0 && mins === 0 && secs === 0;

    // Use UTC noon for date-only to eliminate cross-timezone display drift
    const year = val.getUTCFullYear();
    const month = val.getUTCMonth();
    const day = val.getUTCDate();
    const d = new Date(Date.UTC(year, month, day, isMidnight ? 12 : hours, mins, secs));
    return { date: d, isValid: true, rawString: val.toISOString() };
  }

  // 2. Excel serial number (e.g. 45853 for 15/07/2025)
  if (typeof val === "number" || (/^\d+(\.\d+)?$/.test(String(val).trim()) && Number(val) > 1000 && Number(val) < 200000)) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const utc_days = Math.floor(num - 25569);
      const fractional_day = num - Math.floor(num) + 0.0000001;
      let total_seconds = Math.floor(86400 * fractional_day);
      const seconds = total_seconds % 60;
      total_seconds = Math.floor(total_seconds / 60);
      const minutes = total_seconds % 60;
      const hours = Math.floor(total_seconds / 60);

      const dateInfo = new Date(utc_days * 86400 * 1000);
      const year = dateInfo.getUTCFullYear();
      const month = dateInfo.getUTCMonth();
      const day = dateInfo.getUTCDate();

      if (year >= 1900 && year <= 2100) {
        const isDateOnly = hours === 0 && minutes === 0 && seconds === 0;
        const d = new Date(Date.UTC(year, month, day, isDateOnly ? 12 : hours, minutes, seconds));
        return { date: d, isValid: true, rawString: String(val) };
      }
    }
  }

  const str = String(val).trim();
  if (!str) return { date: null, isValid: true, rawString: "" };

  // 3. DD/MM/YYYY or DD/MM/YY or DD-MM-YY or DD.MM.YY [HH:mm[:ss]]
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let rawYear = parseInt(dmyMatch[3], 10);
    let year = rawYear;
    if (dmyMatch[3].length === 2) {
      year = rawYear < 70 ? 2000 + rawYear : 1900 + rawYear;
    }
    const hasTime = Boolean(dmyMatch[4]);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12; // Use UTC noon for date-only
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900 || year > 2100 || (hasTime && (hours > 23 || minutes > 59 || seconds > 59))) {
      return { date: null, isValid: false, rawString: str };
    }

    // Check calendar month day limits (e.g. 31/02/2026 or 29/02/2026 non-leap year)
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    if (day > daysInMonth) {
      return { date: null, isValid: false, rawString: str };
    }

    const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (isNaN(d.getTime())) {
      return { date: null, isValid: false, rawString: str };
    }
    return { date: d, isValid: true, rawString: str };
  }

  // 4. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD [HH:mm[:ss]] or ISO
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hasTime = Boolean(ymdMatch[4]);
    const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 12;
    const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;

    if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900 || year > 2100 || (hasTime && (hours > 23 || minutes > 59 || seconds > 59))) {
      return { date: null, isValid: false, rawString: str };
    }

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    if (day > daysInMonth) {
      return { date: null, isValid: false, rawString: str };
    }

    const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (isNaN(d.getTime())) {
      return { date: null, isValid: false, rawString: str };
    }
    return { date: d, isValid: true, rawString: str };
  }

  // 5. Strict ISO 8601 string (e.g. 2026-05-01T12:00:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime()) && isoDate.getUTCFullYear() >= 1900 && isoDate.getUTCFullYear() <= 2100) {
      return { date: isoDate, isValid: true, rawString: str };
    }
  }

  return { date: null, isValid: false, rawString: str };
}

/**
 * Normalizes a header or string key for loose matching against field aliases.
 */
export function normalizeHeader(header: string): string {
  return (header || "")
    .replace(/^\uFEFF/, "") // Remove UTF-8 BOM
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ") // Clean special unicode spaces
    .replace(/\s*\([^)]*\)/g, "") // Strip parenthetical suffixes e.g. (DD/MM/YY), (Optional)
    .replace(/\*/g, "") // Strip asterisks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Creates a fast lookup map from any recognized alias to the canonical field definition.
 */
const aliasMap = new Map<string, RegistrationFieldDefinition>();
for (const def of REGISTRATION_FIELD_DEFINITIONS) {
  aliasMap.set(normalizeHeader(def.label), def);
  aliasMap.set(normalizeHeader(def.key), def);
  for (const alias of def.aliases) {
    aliasMap.set(normalizeHeader(alias), def);
  }
}

export function findFieldDefinition(headerOrKey: string): RegistrationFieldDefinition | undefined {
  if (!headerOrKey) return undefined;
  const rawClean = String(headerOrKey).trim();
  const norm = normalizeHeader(rawClean);
  if (aliasMap.has(norm)) {
    return aliasMap.get(norm);
  }

  // Try direct lowercase alphanumeric
  const plainNorm = rawClean.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (aliasMap.has(plainNorm)) {
    return aliasMap.get(plainNorm);
  }

  return undefined;
}

/**
 * Calculate Levenshtein similarity ratio between 0 and 1.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || "").toLowerCase().trim();
  const s2 = (str2 || "").toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Finds the closest matching option from a list of valid candidates.
 */
export function findClosestMatch(value: string, validCandidates: string[], threshold = 0.45): string | null {
  if (!value || !validCandidates.length) return null;
  const valNorm = value.toLowerCase().trim();

  // 1. Direct contains / startsWith check
  const direct = validCandidates.find(
    (c) => c.toLowerCase().trim() === valNorm || c.toLowerCase().trim().includes(valNorm) || valNorm.includes(c.toLowerCase().trim())
  );
  if (direct) return direct;

  // 2. Similarity scoring (full string + token-level)
  let bestScore = 0;
  let bestMatch: string | null = null;

  for (const candidate of validCandidates) {
    const candNorm = candidate.toLowerCase().trim();
    let score = calculateSimilarity(valNorm, candNorm);

    // Also check word-by-word similarity for multi-word names like "Dubai Branch" vs "Dubay"
    const words = candNorm.split(/\s+/);
    for (const word of words) {
      if (word.length >= 3) {
        const wordScore = calculateSimilarity(valNorm, word);
        if (wordScore > score) {
          score = wordScore;
        }
      }
    }

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

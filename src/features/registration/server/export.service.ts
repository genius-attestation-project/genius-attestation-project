import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export type ExportRegistrationRecord = {
  id?: string;
  createdDate: string;
  trackingNumber: string;
  customerName: string | null;
  mobile: string | null;
  email?: string | null;
  address?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  customerType?: string | null;
  corporateDetail?: { companyName: string } | null;
  documentType?: string | null;
  documentName?: string | null;
  documentIssuedCountry?: string | null;
  processType: string | null;
  subPackage?: string | null;
  externalProcess?: string | null;
  priority?: string | null;
  committedDuration?: string | null;
  deliveryLocation?: string | null;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  paymentMode?: string | null;
  upiTransactionId?: string | null;
  bankName?: string | null;
  transactionRefNo?: string | null;
  transferDate?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  ddNumber?: string | null;
  ddDate?: string | null;
  cardLast4?: string | null;
  approvalCode?: string | null;
  paymentGateway?: string | null;
  onlineTransactionId?: string | null;
  walletName?: string | null;
  walletTransactionId?: string | null;
  paymentReferenceNo?: string | null;
  paymentDescription?: string | null;
  paymentStatus: string;
  collectedPerson?: string | null;
  commissionToName?: string | null;
  commissionToEmail?: string | null;
  registeredPerson?: string | null;
  regionOfRegistration?: string | null;
  approvalStatus: string;
  trackingStatus?: string | null;
  welcomeCallStatus?: string | null;
  createdBy?: { name: string | null; email?: string | null } | null;
  createdByName?: string | null;
};

export const EXPORT_COLUMNS = [
  "Created Date",
  "Tracking Number",
  "Customer Name",
  "Mobile Number",
  "Email",
  "Address",
  "Country",
  "State",
  "City",
  "Customer Type",
  "Company Name",
  "Document Type",
  "Document Name",
  "Document Issued Country",
  "Process Type",
  "Sub Package",
  "Additional Process",
  "Priority",
  "Committed Duration",
  "Delivery Location",
  "Total Charges",
  "Advance Paid",
  "Balance Amount",
  "Payment Mode",
  "Payment Mode Details",
  "Payment Status",
  "Commission To User",
  "Collected Person",
  "Registered Person",
  "Registration Office",
  "Approval Status",
  "Tracking Status",
  "Welcome Call Status",
];

function formatPaymentDetails(r: ExportRegistrationRecord): string {
  const mode = (r.paymentMode || "").trim().toLowerCase();
  const parts: string[] = [];

  if (mode === "upi" && r.upiTransactionId) {
    parts.push(`UPI ID: ${r.upiTransactionId}`);
  }
  if (r.bankName) {
    parts.push(`Bank: ${r.bankName}`);
  }
  if (r.transactionRefNo) {
    parts.push(`Ref: ${r.transactionRefNo}`);
  }
  if (r.transferDate) {
    parts.push(`Date: ${r.transferDate}`);
  }
  if (r.chequeNumber) {
    parts.push(`Cheque No: ${r.chequeNumber}${r.chequeDate ? ` (${r.chequeDate})` : ""}`);
  }
  if (r.ddNumber) {
    parts.push(`DD No: ${r.ddNumber}${r.ddDate ? ` (${r.ddDate})` : ""}`);
  }
  if (r.cardLast4) {
    parts.push(`Card: ****${r.cardLast4}${r.approvalCode ? ` (Auth: ${r.approvalCode})` : ""}`);
  }
  if (r.paymentGateway || r.onlineTransactionId) {
    parts.push(`Online: ${r.paymentGateway || ""} ${r.onlineTransactionId || ""}`.trim());
  }
  if (r.walletName || r.walletTransactionId) {
    parts.push(`Wallet: ${r.walletName || ""} ${r.walletTransactionId || ""}`.trim());
  }
  if (r.paymentReferenceNo) {
    parts.push(`Ref: ${r.paymentReferenceNo}`);
  }
  if (r.paymentDescription) {
    parts.push(`Note: ${r.paymentDescription}`);
  }

  return parts.length > 0 ? parts.join(", ") : "-";
}

function mapRecordsToRows(records: ExportRegistrationRecord[]) {
  return records.map((record) => {
    const commissionUser = record.commissionToName || record.commissionToEmail || "-";
    const registeredBy = record.registeredPerson || record.createdBy?.name || record.createdByName || "-";

    return [
      record.createdDate || "-",
      record.trackingNumber || "-",
      record.customerName || "-",
      record.mobile || "-",
      record.email || "-",
      record.address || "-",
      record.country || "-",
      record.state || "-",
      record.city || "-",
      record.customerType || "Individual",
      record.corporateDetail?.companyName || "-",
      record.documentType || "-",
      record.documentName || "-",
      record.documentIssuedCountry || "-",
      record.processType || "-",
      record.subPackage || "-",
      record.externalProcess || "-",
      record.priority || "Normal",
      record.committedDuration || "-",
      record.deliveryLocation || "-",
      Number(record.totalCharges || 0),
      Number(record.advancePaid || 0),
      Number(record.balanceAmount || 0),
      record.paymentMode || "-",
      formatPaymentDetails(record),
      record.paymentStatus || "Pending",
      commissionUser,
      record.collectedPerson || "-",
      registeredBy,
      record.regionOfRegistration || "-",
      record.approvalStatus || "Pending",
      record.trackingStatus || "Registered",
      record.welcomeCallStatus || "Pending",
    ];
  });
}

export async function generateExcelBuffer(records: ExportRegistrationRecord[]): Promise<Buffer> {
  const rows = mapRecordsToRows(records);

  const totalCharge = records.reduce((sum, r) => sum + Number(r.totalCharges || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + Number(r.advancePaid || 0), 0);
  const totalPending = records.reduce((sum, r) => sum + Number(r.balanceAmount || 0), 0);

  // Add Totals row at the bottom
  const totalsRow = new Array(EXPORT_COLUMNS.length).fill("");
  totalsRow[0] = "Totals";
  totalsRow[20] = totalCharge; // Total Charges index
  totalsRow[21] = totalPaid;   // Advance Paid index
  totalsRow[22] = totalPending;// Balance Amount index

  rows.push(totalsRow);

  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_COLUMNS, ...rows]);

  const colWidths = EXPORT_COLUMNS.map((col) => ({ wch: Math.max(col.length + 3, 14) }));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cellValue = row[j] !== null && row[j] !== undefined ? String(row[j]) : "";
      if (cellValue.length > colWidths[j].wch) {
        colWidths[j].wch = Math.min(cellValue.length + 3, 60);
      }
    }
  }
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Registrations");

  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return excelBuffer;
}

export async function generatePDFBuffer(
  records: ExportRegistrationRecord[],
  filtersText: string = "None"
): Promise<Buffer> {
  const doc = new jsPDF("landscape");

  const companyName = "Genius Attestation";
  const reportTitle = "Revenue Registration Report";
  const generatedDate = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, 14, 20);

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(reportTitle, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${generatedDate}`, 14, 34);
  doc.text(`Filters Applied: ${filtersText}`, 14, 39);

  // Key subset of columns for compact PDF rendering
  const pdfColumns = [
    "Date",
    "TR Number",
    "Customer",
    "Mobile",
    "Process Type",
    "Doc Type",
    "Total",
    "Paid",
    "Balance",
    "Office",
    "Status",
  ];

  const pdfRows = records.map((r) => [
    r.createdDate || "-",
    r.trackingNumber,
    r.customerName,
    r.mobile,
    r.processType || "-",
    r.documentType || "-",
    Number(r.totalCharges || 0).toFixed(2),
    Number(r.advancePaid || 0).toFixed(2),
    Number(r.balanceAmount || 0).toFixed(2),
    r.regionOfRegistration || "-",
    r.trackingStatus || "Registered",
  ]);

  const totalCharge = records.reduce((sum, r) => sum + Number(r.totalCharges || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + Number(r.advancePaid || 0), 0);
  const totalPending = records.reduce((sum, r) => sum + Number(r.balanceAmount || 0), 0);

  const totalsRow = [
    "Totals",
    "",
    "",
    "",
    "",
    "",
    totalCharge.toFixed(2),
    totalPaid.toFixed(2),
    totalPending.toFixed(2),
    "",
    "",
  ];

  // @ts-ignore
  doc.autoTable({
    startY: 44,
    head: [pdfColumns],
    body: pdfRows,
    foot: [totalsRow],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
    didDrawPage: (data: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

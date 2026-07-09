import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Data types expected from the DB (using the output of listRegistrations)
type ExportRecord = {
  createdDate: string;
  trackingNumber: string;
  customerName: string;
  mobile: string;
  processType: string | null;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  createdByName?: string | null;
  registeredPerson: string | null;
  collectedPerson: string | null;
  regionOfRegistration: string | null;
  approvalStatus: string;
};

// Common logic to map raw records to the exact column structure required
function mapRecordsToRows(records: ExportRecord[]) {
  return records.map((record) => [
    record.createdDate,
    record.trackingNumber,
    record.customerName,
    record.mobile,
    (record as any).createdBy?.name || "Unknown",
    record.processType || "-",
    record.totalCharges,
    record.advancePaid,
    record.balanceAmount,
    record.registeredPerson || "-",
    record.collectedPerson || "-",
    record.regionOfRegistration || "-",
    record.approvalStatus,
  ]);
}

const EXPORT_COLUMNS = [
  "Date",
  "TR Number",
  "Customer Name",
  "Mobile Number",
  "Created By",
  "Process",
  "Charge",
  "Paid Amount",
  "Pending Amount",
  "Registered By",
  "Collected By",
  "Office",
  "Current Status",
];

export async function generateExcelBuffer(records: ExportRecord[]): Promise<Buffer> {
  const rows = mapRecordsToRows(records);

  const totalCharge = records.reduce((sum, r) => sum + r.totalCharges, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.advancePaid, 0);
  const totalPending = records.reduce((sum, r) => sum + r.balanceAmount, 0);

  // Add Totals row
  rows.push([
    "Totals",
    "",
    "",
    "",
    "",
    "",
    totalCharge,
    totalPaid,
    totalPending,
    "",
    "",
    "",
    "",
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_COLUMNS, ...rows]);

  // Apply bold headers (simple approach: XLSX library doesn't support complex styles in the free version, 
  // but we can set cell properties or just leave it as standard and adjust column widths)
  const colWidths = EXPORT_COLUMNS.map((col) => ({ wch: Math.max(col.length, 12) }));
  
  // Adjust widths based on data
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cellValue = row[j] !== null && row[j] !== undefined ? String(row[j]) : "";
      if (cellValue.length > colWidths[j].wch) {
        colWidths[j].wch = Math.min(cellValue.length + 2, 50); // cap width at 50
      }
    }
  }
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Registrations");

  // Write to buffer
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return excelBuffer;
}

export async function generatePDFBuffer(records: ExportRecord[], filtersText: string = "None"): Promise<Buffer> {
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
  doc.text(companyName, 14, 22);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(reportTitle, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${generatedDate}`, 14, 36);
  doc.text(`Filters Applied: ${filtersText}`, 14, 42);

  const rows = mapRecordsToRows(records);

  const totalCharge = records.reduce((sum, r) => sum + r.totalCharges, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.advancePaid, 0);
  const totalPending = records.reduce((sum, r) => sum + r.balanceAmount, 0);

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
    "",
    "",
  ];

  // @ts-ignore - jspdf-autotable extends jsPDF but typings sometimes clash
  doc.autoTable({
    startY: 48,
    head: [EXPORT_COLUMNS],
    body: rows,
    foot: [totalsRow],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
    didDrawPage: (data: any) => {
      // Page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

import * as XLSX from "xlsx";
import type { LeadRow } from "@/features/lead/types/lead.types";

export const EXPORT_COLUMNS = [
  "SL No.",
  "Date",
  "Lead Name",
  "Mobile",
  "Service",
  "Amount",
  "Duration",
  "Created By",
  "Assigned To",
];

export async function generateLeadExcelBuffer(leads: LeadRow[]): Promise<Buffer> {
  const rows = leads.map((lead, index) => {
    // Determine the working days / duration exactly as shown in the UI
    const duration = lead.workingDays ? String(lead.workingDays) : "-";
    
    // Fallbacks for display fields
    const createdBy = lead.createdByName || lead.createdByEmail || "-";
    const assignedTo = lead.assignedUser || "-";
    
    // Amount should be a numeric value
    const numericAmount = typeof lead.rawAmount === "number" ? lead.rawAmount : 0;

    return [
      index + 1,                     // SL No.
      lead.createdDate,              // Date
      lead.clientName,               // Lead Name
      lead.mobile,                   // Mobile
      lead.service,                  // Service
      numericAmount,                 // Amount
      duration,                      // Duration
      createdBy,                     // Created By
      assignedTo,                    // Assigned To
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_COLUMNS, ...rows]);

  // Adjust column widths based on content
  const colWidths = EXPORT_COLUMNS.map((col) => ({ wch: Math.max(col.length, 12) }));
  
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
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

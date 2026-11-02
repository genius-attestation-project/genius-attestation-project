import * as XLSX from "xlsx";

export type ExcelExportColumn<T = any> = {
  header: string;
  key?: keyof T | string;
  render?: (row: T, index: number) => any;
  accessor?: (row: T) => any;
};

export type ExcelExportOptions<T = any> = {
  filename: string;
  data: T[];
  columns?: ExcelExportColumn<T>[];
  sheetName?: string;
};

export function exportToExcel<T = any>({
  filename,
  data,
  columns,
  sheetName = "Sheet1",
}: ExcelExportOptions<T>): void {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  let rows: any[][];
  let headers: string[];

  if (columns && columns.length > 0) {
    headers = columns.map((col) => col.header);
    rows = data.map((row, index) => {
      return columns.map((col) => {
        if (col.accessor) {
          const val = col.accessor(row);
          return val === null || val === undefined ? "" : val;
        }
        if (col.render) {
          const val = col.render(row, index);
          return val === null || val === undefined ? "" : val;
        }
        if (col.key && typeof col.key === "string") {
          const val = (row as any)[col.key];
          return val === null || val === undefined ? "" : val;
        }
        return "";
      });
    });
  } else {
    // If no columns specified, data is an array of objects
    const firstRow = data[0] as Record<string, any>;
    headers = Object.keys(firstRow);
    rows = data.map((row) => {
      const r = row as Record<string, any>;
      return headers.map((h) => {
        const val = r[h];
        return val === null || val === undefined ? "" : val;
      });
    });
  }

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Auto-size columns based on maximum content length
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    rows.forEach((row) => {
      const cellVal = String(row[colIdx] ?? "");
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

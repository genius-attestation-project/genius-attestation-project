export const FOLDER_MAP: Record<string, string> = {
  "Revenue Registration": "revenue",
  "Users": "users",
  "Lead": "leads",
  "BM Report": "bm-report",
  "Process": "process",
  "Attendance": "attendance",
  "Payroll": "payroll",
  "Leave": "leave",
  "Company": "company",
  "Corporate Details": "company",
  "Corporate Details Approval": "company",
  "Advance Payment Approval": "revenue",
  "Advance Payment": "revenue",
  "Advance Payment Request": "revenue",
  "Payment Approval": "revenue",
  "Payment Update": "revenue",
  "Account Update": "revenue",
};

export function getFolderForModule(moduleName: string): string {
  const folder = FOLDER_MAP[moduleName];
  if (!folder) {
    const slug = moduleName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "general";
  }
  return folder;
}

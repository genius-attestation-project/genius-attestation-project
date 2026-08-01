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
};

export function getFolderForModule(moduleName: string): string {
  const folder = FOLDER_MAP[moduleName];
  if (!folder) {
    throw new Error(`Unknown module: ${moduleName}. Cannot resolve storage folder.`);
  }
  return folder;
}

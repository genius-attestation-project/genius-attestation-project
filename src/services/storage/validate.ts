export const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx"
]);

export const REJECTED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "dll", "php", "js", "sh"
]);

export const MAX_SIZE_IMAGES = 10 * 1024 * 1024; // 10 MB
export const MAX_SIZE_PDF = 25 * 1024 * 1024; // 25 MB
export const MAX_SIZE_OFFICE = 50 * 1024 * 1024; // 50 MB

export function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  
  if (REJECTED_EXTENSIONS.has(extension)) {
    throw new Error(`File extension .${extension} is not allowed for security reasons.`);
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`File extension .${extension} is not supported.`);
  }

  const isImage = ["jpg", "jpeg", "png", "webp"].includes(extension);
  const isPdf = extension === "pdf";
  const isOffice = ["doc", "docx", "xls", "xlsx"].includes(extension);

  if (isImage && file.size > MAX_SIZE_IMAGES) {
    throw new Error(`Image size exceeds the 10 MB limit.`);
  }

  if (isPdf && file.size > MAX_SIZE_PDF) {
    throw new Error(`PDF size exceeds the 25 MB limit.`);
  }

  if (isOffice && file.size > MAX_SIZE_OFFICE) {
    throw new Error(`Office file size exceeds the 50 MB limit.`);
  }

  return true;
}

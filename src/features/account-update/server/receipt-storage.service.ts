import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

const receiptStorageRoot = path.join(process.cwd(), "storage", "account-receipts");

export type StoredReceiptInput = {
  paymentUpdateId: string;
  fileName: string;
  fileData: Uint8Array<ArrayBuffer>;
};

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path
    .basename(fileName, extension)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `${baseName || "receipt"}${extension}`;
}

export function buildReceiptUrl(paymentUpdateId: string) {
  return `/api/account-update/receipts/${encodeURIComponent(paymentUpdateId)}`;
}

export async function storePaymentReceipt(input: StoredReceiptInput) {
  await mkdir(receiptStorageRoot, { recursive: true });

  const storedFileName = `${input.paymentUpdateId}-${sanitizeFileName(input.fileName)}`;
  const filePath = path.join(receiptStorageRoot, storedFileName);
  await writeFile(filePath, input.fileData);

  return {
    receiptFileUrl: buildReceiptUrl(input.paymentUpdateId),
    storedFileName,
  };
}

export async function readPaymentReceipt(paymentUpdateId: string, receiptFileName: string) {
  const storedFileName = `${paymentUpdateId}-${sanitizeFileName(receiptFileName)}`;
  const filePath = path.join(receiptStorageRoot, storedFileName);
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(receiptStorageRoot);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
    return null;
  }

  const [fileData, fileStats] = await Promise.all([readFile(resolvedPath), stat(resolvedPath)]);
  return {
    fileData,
    fileSize: fileStats.size,
  };
}

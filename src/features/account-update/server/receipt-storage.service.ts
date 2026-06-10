import { put } from "@vercel/blob";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";

function getReceiptStorageRoot() {
  if (process.env.VERCEL) {
    return path.join(/* turbopackIgnore: true */ os.tmpdir(), "genius-attestation", "account-receipts");
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "account-receipts");
}

export type StoredReceiptInput = {
  paymentUpdateId: string;
  fileName: string;
  mimeType: string;
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
  const storedFileName = `${input.paymentUpdateId}-${sanitizeFileName(input.fileName)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`account-receipts/${storedFileName}`, Buffer.from(input.fileData), {
      access: "public",
      contentType: input.mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      receiptFileUrl: blob.url,
      storedFileName,
    };
  }

  if (process.env.VERCEL) {
    throw new Error("Receipt file storage is not configured. Connect Vercel Blob and set BLOB_READ_WRITE_TOKEN.");
  }

  const receiptStorageRoot = getReceiptStorageRoot();
  await mkdir(receiptStorageRoot, { recursive: true });

  const filePath = path.join(receiptStorageRoot, storedFileName);
  await writeFile(filePath, input.fileData);

  return {
    receiptFileUrl: buildReceiptUrl(input.paymentUpdateId),
    storedFileName,
  };
}

export async function readPaymentReceipt(paymentUpdateId: string, receiptFileName: string, receiptFileUrl?: string | null) {
  if (receiptFileUrl?.startsWith("http://") || receiptFileUrl?.startsWith("https://")) {
    const response = await fetch(receiptFileUrl);
    if (!response.ok) {
      return null;
    }

    const fileData = Buffer.from(await response.arrayBuffer());
    return {
      fileData,
      fileSize: fileData.byteLength,
    };
  }

  const receiptStorageRoot = getReceiptStorageRoot();
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

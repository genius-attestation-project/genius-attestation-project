// File storage upload service
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { wasabi } from "@/lib/wasabi";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getFolderForModule } from "./folder-map";
import { validateFile } from "./validate";

export async function uploadFile(
  file: File,
  moduleName: string,
  recordId?: string,
  uploadedBy?: string
) {
  validateFile(file);

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const storedName = `${randomUUID()}.${extension}`;
  const folder = getFolderForModule(moduleName);
  
  // E.g., Genius App Data/revenue/uuid.jpg
  const key = `${process.env.WASABI_ROOT_PREFIX}${folder}/${storedName}`;

  const bytes = Buffer.from(await file.arrayBuffer());

  await wasabi.send(
    new PutObjectCommand({
      Bucket: process.env.WASABI_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: file.type,
    })
  );

  const url = `${process.env.WASABI_PUBLIC_URL}/${key}`;

  // Type assertion used to bypass IDE caching issue with PrismaClient
  const fileStorage = await (prisma as any).fileStorage.create({
    data: {
      module: moduleName,
      recordId: recordId || null,
      folder,
      originalName: file.name,
      storedName,
      bucketKey: key,
      url,
      mimeType: file.type,
      extension,
      size: file.size,
      uploadedBy: uploadedBy || null,
    }
  });

  return fileStorage;
}

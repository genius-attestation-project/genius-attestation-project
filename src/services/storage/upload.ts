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

  const fileStorage = await (prisma as any).fileStorage.create({
    data: {
      module: moduleName,
      recordId: recordId || null,
      folder,
      originalName: file.name,
      storedName,
      bucketKey: key,
      bucketName: process.env.WASABI_BUCKET || "genius-attestation",
      storageProvider: "WASABI",
      url: "", // Internal view URL populated below with record ID
      mimeType: file.type,
      extension,
      size: file.size,
      uploadedBy: uploadedBy || null,
    }
  });

  const internalUrl = `/api/files/${fileStorage.id}/view`;
  const updatedStorage = await (prisma as any).fileStorage.update({
    where: { id: fileStorage.id },
    data: { url: internalUrl },
  });

  return updatedStorage;
}

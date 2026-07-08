import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { wasabi } from "@/lib/wasabi";
import { prisma } from "@/lib/prisma";

export async function deleteFile(fileStorageId: string) {
  const fileStorage = await (prisma as any).fileStorage.findUnique({
    where: { id: fileStorageId }
  });

  if (!fileStorage) {
    throw new Error("File not found in database.");
  }

  // Delete from Wasabi
  await wasabi.send(
    new DeleteObjectCommand({
      Bucket: process.env.WASABI_BUCKET,
      Key: fileStorage.bucketKey,
    })
  );

  // Delete from Database
  await (prisma as any).fileStorage.delete({
    where: { id: fileStorageId }
  });

  return true;
}

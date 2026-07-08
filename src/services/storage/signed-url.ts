import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { wasabi } from "@/lib/wasabi";
import { prisma } from "@/lib/prisma";

export async function getFileUrl(fileStorageId: string, expiresIn = 3600) {
  const fileStorage = await (prisma as any).fileStorage.findUnique({
    where: { id: fileStorageId }
  });

  if (!fileStorage) {
    throw new Error("File not found in database.");
  }

  // If using public URL:
  // return fileStorage.url;

  // If using private bucket and pre-signed URLs (optional based on your setup):
  const command = new GetObjectCommand({
    Bucket: process.env.WASABI_BUCKET,
    Key: fileStorage.bucketKey,
  });

  const url = await getSignedUrl(wasabi, command, { expiresIn });
  return url;
}

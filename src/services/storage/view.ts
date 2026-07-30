import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { wasabi } from "@/lib/wasabi";

export type SignedUrlOptions = {
  bucketKey: string;
  originalName: string;
  mimeType: string;
  expiresInSeconds?: number;
};

/**
 * Generates a short-lived, secure pre-signed URL for viewing or downloading a private file in Wasabi S3.
 * Expiry default: 15 minutes (900 seconds).
 */
export async function generateSignedFileUrl(options: SignedUrlOptions): Promise<string> {
  const expiresIn = options.expiresInSeconds || 900;
  
  const isInline =
    options.mimeType?.startsWith("image/") ||
    options.mimeType === "application/pdf";

  const dispositionType = isInline ? "inline" : "attachment";
  const cleanFilename = (options.originalName || "file").replace(/"/g, "_");
  const encodedFilename = encodeURIComponent(options.originalName || "file");
  const contentDisposition = `${dispositionType}; filename="${cleanFilename}"; filename*=UTF-8''${encodedFilename}`;

  const command = new GetObjectCommand({
    Bucket: process.env.WASABI_BUCKET,
    Key: options.bucketKey,
    ResponseContentType: options.mimeType || "application/octet-stream",
    ResponseContentDisposition: contentDisposition,
  });

  return await getSignedUrl(wasabi, command, { expiresIn });
}

import { uploadFile } from "./upload";
import { deleteFile } from "./delete";

export async function replaceFile(
  oldFileStorageId: string,
  newFile: File,
  moduleName: string,
  recordId?: string,
  uploadedBy?: string
) {
  // 1. Upload new file first
  const newFileStorage = await uploadFile(newFile, moduleName, recordId, uploadedBy);

  // 2. Delete old file
  try {
    await deleteFile(oldFileStorageId);
  } catch (error) {
    console.error("Failed to delete old Wasabi file during replacement:", error);
    // Even if old fails, return the new one
  }

  return newFileStorage;
}

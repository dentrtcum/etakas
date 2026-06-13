import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { serverEnv } from "@/lib/env";

export type UploadableFile = File & { size: number; name: string; type: string };

export class BlobStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlobStorageError";
  }
}

export function isProvidedFile(value: FormDataEntryValue | null): value is UploadableFile {
  return value instanceof File && value.size > 0;
}

export function hashOriginalName(name: string) {
  return createHash("sha256").update(name).digest("hex");
}

export async function uploadPrivateFile({
  file,
  folder,
  kind
}: {
  file: UploadableFile;
  folder: string;
  kind: string;
}) {
  if (!serverEnv.BLOB_READ_WRITE_TOKEN) {
    throw new BlobStorageError("BLOB_READ_WRITE_TOKEN is required for file uploads.");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined;
  const pathname = `${folder}/${kind}/${randomUUID()}${extension ? `.${extension}` : ""}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    token: serverEnv.BLOB_READ_WRITE_TOKEN
  });

  return {
    storageKey: blob.pathname,
    originalNameHash: hashOriginalName(file.name),
    mimeType: file.type || "application/octet-stream",
    byteSize: file.size
  };
}

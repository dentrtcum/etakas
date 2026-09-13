import { createHash, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { serverEnv } from "@/lib/env";
import { SecurityError } from "@/lib/security/request-guards";

export type UploadableFile = File & { size: number; name: string; type: string };

export class BlobStorageError extends SecurityError {
  constructor(message = "STORAGE_UNAVAILABLE", status = 503) {
    super(message, status);
    this.name = "BlobStorageError";
  }
}

export function isProvidedFile(value: FormDataEntryValue | null): value is UploadableFile {
  return value instanceof File && value.size > 0;
}

export function hashOriginalName(name: string) {
  return createHash("sha256").update(name).digest("hex");
}

export async function validateUpload(file: UploadableFile, kind: string) {
  if (file.size < 1 || file.size > 4_000_000) throw new BlobStorageError("INVALID_FILE_SIZE", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== file.size) throw new BlobStorageError("INVALID_FILE", 400);
  const detected = await fileTypeFromBuffer(bytes);
  if (
    !detected ||
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(detected.mime)
  ) {
    throw new BlobStorageError("INVALID_FILE_TYPE", 400);
  }
  if (["image", "package"].includes(kind) && !detected.mime.startsWith("image/")) {
    throw new BlobStorageError("INVALID_FILE_TYPE", 400);
  }
  if (detected.mime.startsWith("image/")) {
    try {
      // Re-encoding drops EXIF/location data. The pixel budget limits decompression bombs.
      const normalized = await sharp(bytes, {
        limitInputPixels: 20_000_000,
        animated: false,
        failOn: "warning"
      })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      return { bytes: normalized, mimeType: "image/jpeg", extension: "jpg" };
    } catch {
      throw new BlobStorageError("INVALID_IMAGE", 400);
    }
  }
  // PDFs are served as sandboxed attachments. Malware scanning is deferred by request.
  return { bytes, mimeType: detected.mime, extension: detected.ext };
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
    throw new BlobStorageError();
  }

  if (!/^[a-z-]+$/.test(folder) || !/^[a-z_-]+$/.test(kind))
    throw new BlobStorageError("INVALID_FILE", 400);
  const validated = await validateUpload(file, kind);
  const pathname = `${folder}/${kind}/${randomUUID()}.${validated.extension}`;
  const blob = await put(pathname, validated.bytes, {
    access: "private",
    addRandomSuffix: false,
    contentType: validated.mimeType,
    token: serverEnv.BLOB_READ_WRITE_TOKEN
  });

  return {
    storageKey: blob.pathname,
    originalNameHash: hashOriginalName(file.name),
    mimeType: validated.mimeType,
    byteSize: validated.bytes.length
  };
}

export async function cleanupUploads(files: { storageKey: string }[]) {
  if (!files.length || !serverEnv.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(
      files.map((file) => file.storageKey),
      { token: serverEnv.BLOB_READ_WRITE_TOKEN }
    );
  } catch {
    console.error("BLOB_UPLOAD_ROLLBACK_FAILED", { count: files.length });
  }
}

export async function uploadPrivateFiles<K extends string>(
  files: { kind: K; file: UploadableFile }[],
  folder: string
) {
  if (files.length > 6 || files.reduce((total, item) => total + item.file.size, 0) > 4_000_000) {
    throw new BlobStorageError("INVALID_FILE_SIZE", 413);
  }
  const results = await Promise.allSettled(
    files.map(async (item) => ({
      kind: item.kind,
      ...(await uploadPrivateFile({ ...item, folder }))
    }))
  );
  const uploaded = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") {
    await cleanupUploads(uploaded);
    throw failure.reason;
  }
  return uploaded;
}

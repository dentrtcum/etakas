import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync
} from "node:crypto";

const algorithm = "aes-256-gcm";
const encoding = "base64url";
const keyCache = new Map<string, Buffer>();

function deriveKey(secret: string) {
  if (secret.length < 32) {
    throw new Error("Encryption secret must be at least 32 characters.");
  }

  const fingerprint = createHash("sha256").update(secret).digest("hex");
  const cached = keyCache.get(fingerprint);
  if (cached) return cached;
  const key = scryptSync(secret, "e-takas-field-encryption-v1", 32);
  if (keyCache.size >= 8) keyCache.delete(keyCache.keys().next().value!);
  keyCache.set(fingerprint, key);
  return key;
}

export function encryptField(plainText: string, secret: string) {
  const iv = randomBytes(12);
  const key = deriveKey(secret);
  const cipher = createCipheriv(algorithm, key, iv);
  const keyId = process.env.ENCRYPTION_KEY_ID || "primary";
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(keyId)) throw new Error("Invalid encryption key identifier.");
  cipher.setAAD(Buffer.from(`e-takas:v2:${keyId}`));
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v2",
    keyId,
    iv.toString(encoding),
    tag.toString(encoding),
    encrypted.toString(encoding)
  ].join(".");
}

export function decryptField(cipherText: string, secret: string) {
  const parts = cipherText.split(".");
  const version = parts[0];
  const modern = version === "v2";
  const [ivValue, tagValue, encryptedValue] = parts.slice(modern ? 2 : 1);
  if (
    (!modern && version !== "v1") ||
    parts.length !== (modern ? 5 : 4) ||
    !ivValue ||
    !tagValue ||
    encryptedValue === undefined ||
    Buffer.from(ivValue, encoding).length !== 12 ||
    Buffer.from(tagValue, encoding).length !== 16
  ) {
    throw new Error("Unsupported encrypted field format.");
  }
  const previous: Record<string, string> = JSON.parse(process.env.ENCRYPTION_PREVIOUS_KEYS || "{}");
  if (
    !previous ||
    typeof previous !== "object" ||
    Array.isArray(previous) ||
    Object.keys(previous).length > 8 ||
    Object.values(previous).some((value) => typeof value !== "string" || value.length < 32)
  )
    throw new Error("Invalid encryption key ring.");
  const keyId = parts[1];
  const keys = modern
    ? [keyId === (process.env.ENCRYPTION_KEY_ID || "primary") ? secret : previous[keyId]]
    : [secret, ...Object.values(previous)];
  for (const candidate of keys) {
    if (!candidate) continue;
    try {
      const decipher = createDecipheriv(
        algorithm,
        deriveKey(candidate),
        Buffer.from(ivValue, encoding)
      );
      if (modern) decipher.setAAD(Buffer.from(`e-takas:v2:${keyId}`));
      decipher.setAuthTag(Buffer.from(tagValue, encoding));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, encoding)),
        decipher.final()
      ]).toString("utf8");
    } catch {
      /* Try historical keys for legacy v1 values only. */
    }
  }
  throw new Error("Encrypted field authentication failed.");
}

export function hashField(value: string, secret: string) {
  if (secret.length < 32) {
    throw new Error("Hash secret must be at least 32 characters.");
  }

  return createHmac("sha256", secret).update(value, "utf8").digest("base64url");
}

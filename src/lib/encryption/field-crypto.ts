import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "node:crypto";

const algorithm = "aes-256-gcm";
const encoding = "base64url";

function deriveKey(secret: string) {
  if (secret.length < 32) {
    throw new Error("Encryption secret must be at least 32 characters.");
  }

  return scryptSync(secret, "e-takas-field-encryption-v1", 32);
}

export function encryptField(plainText: string, secret: string) {
  const iv = randomBytes(12);
  const key = deriveKey(secret);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ["v1", iv.toString(encoding), tag.toString(encoding), encrypted.toString(encoding)].join(".");
}

export function decryptField(cipherText: string, secret: string) {
  const [version, ivValue, tagValue, encryptedValue] = cipherText.split(".");

  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported encrypted field format.");
  }

  const key = deriveKey(secret);
  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivValue, encoding));
  decipher.setAuthTag(Buffer.from(tagValue, encoding));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, encoding)),
    decipher.final()
  ]).toString("utf8");
}

export function hashField(value: string, secret: string) {
  if (secret.length < 32) {
    throw new Error("Hash secret must be at least 32 characters.");
  }

  return createHmac("sha256", secret).update(value, "utf8").digest("base64url");
}

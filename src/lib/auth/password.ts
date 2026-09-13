import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const keyLength = 64;
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const commonPasswords = new Set([
  "password1234",
  "password12345",
  "password123456",
  "123456789012",
  "qwerty1234567",
  "qwertyuiop123",
  "ahmet12345678",
  "admin12345678",
  "administrator",
  "sifre12345678",
  "parola1234567"
]);
export const passwordPolicySchema = z
  .string()
  .min(12, "Parola en az 12 karakter olmalıdır.")
  .max(128, "Parola en fazla 128 karakter olabilir.")
  .refine(
    (value) =>
      !commonPasswords.has(value.toLowerCase()) && !/^(.)\1+$/.test(value) && !/^\d+$/.test(value),
    "Kolay tahmin edilen bir parola yerine benzersiz bir parola seçin."
  );

function derive(password: string, salt: string, modern: boolean) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keyLength, modern ? options : {}, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  );
}

export function hashPassword(password: string) {
  passwordPolicySchema.parse(password);
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, keyLength, options).toString("base64url");
  return `scrypt$v2$${salt}$${hash}`;
}

export async function hashPasswordAsync(password: string) {
  passwordPolicySchema.parse(password);
  const salt = randomBytes(16).toString("base64url");
  return `scrypt$v2$${salt}$${(await derive(password, salt, true)).toString("base64url")}`;
}

function parseHash(storedHash: string | null) {
  const parts = storedHash?.split("$");
  if (!parts || parts[0] !== "scrypt") return null;
  const modern = parts.length === 4 && parts[1] === "v2";
  if (!modern && parts.length !== 3) return null;
  const salt = parts[modern ? 2 : 1];
  const hash = parts[modern ? 3 : 2];
  if (!/^[A-Za-z0-9_-]{22}$/.test(salt) || !/^[A-Za-z0-9_-]{86}$/.test(hash)) return null;
  return { modern, salt, expected: Buffer.from(hash, "base64url") };
}

export function verifyPassword(password: string, storedHash: string | null) {
  const parsed = parseHash(storedHash);
  if (!parsed || password.length > 128) return false;
  return timingSafeEqual(
    parsed.expected,
    scryptSync(password, parsed.salt, keyLength, parsed.modern ? options : {})
  );
}

const dummyHash = "scrypt$v2$MDEyMzQ1Njc4OWFiY2RlZg$" + Buffer.alloc(64).toString("base64url");
export async function verifyPasswordAsync(password: string, storedHash: string | null) {
  const parsed = parseHash(storedHash) ?? parseHash(dummyHash)!;
  const actual = await derive(password.slice(0, 128), parsed.salt, parsed.modern);
  return Boolean(storedHash && password.length <= 128 && timingSafeEqual(parsed.expected, actual));
}

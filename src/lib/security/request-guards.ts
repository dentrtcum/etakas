import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export class SecurityError extends Error {
  constructor(
    public code: string,
    public status = 400,
    public retryAfter?: number
  ) {
    super(code);
  }
}

export function applicationOrigin() {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production")
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  const url = new URL(configured || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  return url.origin;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== applicationOrigin() ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new SecurityError("INVALID_ORIGIN", 403);
  }
}

export function requireSameOriginForm(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    if (
      error instanceof SecurityError &&
      error.code === "INVALID_ORIGIN" &&
      !request.headers.get("origin") &&
      request.headers.get("sec-fetch-site") === "same-origin" &&
      new URL(request.url).origin === applicationOrigin()
    ) {
      return;
    }
    throw error;
  }
}

export function safeNextPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n\u0000]/.test(value)
  )
    return "/panel";
  try {
    const origin = "https://etakas.invalid";
    const parsed = new URL(value, origin);
    return parsed.origin === origin ? `${parsed.pathname}${parsed.search}` : "/panel";
  } catch {
    return "/panel";
  }
}

export function securityHash(value: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function trustedClientIp(request: Request) {
  // Only trust the platform-owned header. Arbitrary X-Forwarded-For is spoofable.
  const ip =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : undefined;
  return ip && isIP(ip) ? ip : "unavailable";
}

export async function requireRateLimit({
  request,
  action,
  identifier,
  limit = 20,
  windowSeconds = 600
}: {
  request: Request;
  action: string;
  identifier?: string;
  limit?: number;
  windowSeconds?: number;
}) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(now / windowMs);
  const keys = [securityHash(`${action}:ip:${trustedClientIp(request)}:${bucket}`)];
  if (identifier)
    keys.push(securityHash(`${action}:identity:${identifier.trim().toLowerCase()}:${bucket}`));
  const expiresAt = new Date((bucket + 1) * windowMs);
  const db = getDb();
  for (const key of keys) {
    const rows = await db.execute(sql`INSERT INTO rate_limit_buckets (key, count, expires_at)
      VALUES (${key}, 1, ${expiresAt.toISOString()}) ON CONFLICT (key)
      DO UPDATE SET count = LEAST(rate_limit_buckets.count + 1, ${limit + 1}) RETURNING count`);
    if (Number(rows[0]?.count) > limit)
      throw new SecurityError(
        "RATE_LIMITED",
        429,
        Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000))
      );
  }
  // Bounded cleanup avoids a separate scheduler and prevents indefinite IP-hash retention.
  await db.execute(
    sql`DELETE FROM rate_limit_buckets WHERE key IN (SELECT key FROM rate_limit_buckets WHERE expires_at < now() - interval '1 day' LIMIT 100)`
  );
}

export async function requireCaptcha(request: Request, token: unknown, action: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  if (typeof token !== "string" || token.length < 1 || token.length > 2048)
    throw new SecurityError("CAPTCHA_REQUIRED", 400);
  if (process.env.NODE_ENV === "production" && /^[123]x0{10,}/.test(secret))
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        ...(trustedClientIp(request) !== "unavailable"
          ? { remoteip: trustedClientIp(request) }
          : {})
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    });
  } catch {
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  }
  if (!response.ok) throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  const result = (await response.json()) as {
    success?: boolean;
    action?: string;
    hostname?: string;
  };
  const hosts = [
    new URL(applicationOrigin()).hostname,
    ...(process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  ];
  if (!result.success || result.action !== action || !hosts.includes(result.hostname || ""))
    throw new SecurityError("CAPTCHA_FAILED", 400);
}

export function securityErrorResponse(error: unknown) {
  const known = error instanceof SecurityError;
  return NextResponse.json(
    { error: known ? error.code : "SERVICE_UNAVAILABLE" },
    {
      status: known ? error.status : 503,
      headers: {
        "Cache-Control": "no-store",
        ...(known && error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {})
      }
    }
  );
}

export function requireSmallBody(request: Request, maxBytes = 16384) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes))
    throw new SecurityError("REQUEST_TOO_LARGE", 413);
}

export async function readSecurityForm(request: Request, maxBytes = 16384) {
  requireSmallBody(request, maxBytes);
  const contentType = request.headers.get("content-type") || "";
  if (
    !contentType.startsWith("application/x-www-form-urlencoded") &&
    !contentType.startsWith("multipart/form-data")
  )
    throw new SecurityError("INVALID_REQUEST", 415);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new SecurityError("REQUEST_TOO_LARGE", 413);
        }
        chunks.push(result.value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": contentType }
    }).formData();
  } catch {
    throw new SecurityError("INVALID_REQUEST", 400);
  }
}

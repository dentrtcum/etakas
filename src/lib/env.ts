import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(32).optional(),
    APP_URL: z.string().url().default("http://localhost:3000"),
    INITIAL_ADMIN_EMAIL: z.string().email().optional(),
    INITIAL_ADMIN_PASSWORD: z.string().optional(),
    ENCRYPTION_KEY: z.string().optional(),
    ENCRYPTION_KEY_ID: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,32}$/)
      .default("primary"),
    ENCRYPTION_PREVIOUS_KEYS: z.string().optional(),
    AUTH_RATE_LIMIT_SECRET: z.string().min(32).optional(),
    RESEND_API_KEY: z.string().optional(),
    GMAIL_USER: z.string().email().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    TURNSTILE_ALLOWED_HOSTNAMES: z.string().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    TRADING_MODE: z.enum(["demo", "pilot", "production"]).default("demo"),
    LEGAL_APPROVAL_CONFIRMED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    LEGAL_CONTENT_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    LIVE_TRADING_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    EMAIL_PROVIDER: z.enum(["gmail", "resend"]).optional(),
    EMAIL_FROM: z.string().email().optional(),
    ERROR_MONITORING_DSN: z.string().optional()
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true
});

export function assertProductionSafety() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = [
    ["DATABASE_URL", serverEnv.DATABASE_URL],
    ["AUTH_SECRET", serverEnv.AUTH_SECRET],
    ["ENCRYPTION_KEY", serverEnv.ENCRYPTION_KEY],
    ["BLOB_READ_WRITE_TOKEN", serverEnv.BLOB_READ_WRITE_TOKEN],
    ["AUTH_RATE_LIMIT_SECRET", serverEnv.AUTH_RATE_LIMIT_SECRET],
    [
      "EMAIL_CONFIGURATION",
      serverEnv.EMAIL_PROVIDER === "gmail"
        ? serverEnv.GMAIL_USER && serverEnv.GMAIL_APP_PASSWORD
        : serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM
    ],
    ["TURNSTILE_SECRET_KEY", serverEnv.TURNSTILE_SECRET_KEY],
    ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(
      `Production security configuration is incomplete: ${missing.map(([k]) => k).join(", ")}`
    );
  }

  if (new URL(serverEnv.APP_URL).protocol !== "https:" || !process.env.APP_URL) {
    throw new Error("Production requires a canonical HTTPS APP_URL.");
  }

  if (!serverEnv.ENCRYPTION_KEY || serverEnv.ENCRYPTION_KEY.length < 32) {
    throw new Error("Production encryption key must be at least 32 characters.");
  }

  if (
    serverEnv.LIVE_TRADING_ENABLED &&
    (serverEnv.TRADING_MODE !== "production" ||
      !serverEnv.LEGAL_APPROVAL_CONFIRMED ||
      !serverEnv.LEGAL_CONTENT_APPROVED)
  ) {
    throw new Error("Production trading mode requires LEGAL_APPROVAL_CONFIRMED=true.");
  }
}

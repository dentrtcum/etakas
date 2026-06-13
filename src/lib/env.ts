import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(32).optional(),
    APP_URL: z.string().url().default("http://localhost:3000"),
    INITIAL_ADMIN_EMAIL: z.string().email().optional(),
    INITIAL_ADMIN_PASSWORD: z.string().optional(),
    ADMIN_TOTP_REQUIRED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    ENCRYPTION_KEY: z.string().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    TRADING_MODE: z.enum(["demo", "pilot", "production"]).default("demo"),
    LEGAL_APPROVAL_CONFIRMED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    EMAIL_PROVIDER: z.string().optional(),
    EMAIL_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
    ERROR_MONITORING_DSN: z.string().optional(),
    FILE_SCANNER_PROVIDER: z.string().optional(),
    FILE_SCANNER_API_KEY: z.string().optional()
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
    ["FILE_SCANNER_PROVIDER", serverEnv.FILE_SCANNER_PROVIDER]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Production security configuration is incomplete: ${missing.map(([k]) => k).join(", ")}`);
  }

  if (serverEnv.TRADING_MODE === "production" && !serverEnv.LEGAL_APPROVAL_CONFIRMED) {
    throw new Error("Production trading mode requires LEGAL_APPROVAL_CONFIRMED=true.");
  }

  if (serverEnv.FILE_SCANNER_PROVIDER === "mock") {
    throw new Error("Production file scanning cannot use the mock provider.");
  }

  if (serverEnv.EMAIL_PROVIDER === "console") {
    throw new Error("Production email cannot use the console provider.");
  }
}

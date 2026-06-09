import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";

const database = serverEnv.DATABASE_URL
  ? drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      usePlural: true,
      transaction: true
    })
  : memoryAdapter({});

const usesDatabaseGeneratedIds = Boolean(serverEnv.DATABASE_URL);

export const auth = betterAuth({
  appName: "E-Takas",
  baseURL: serverEnv.APP_URL,
  secret: serverEnv.AUTH_SECRET ?? "development-only-auth-secret-change-before-production",
  database,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30
  },
  advanced: {
    cookiePrefix: "e-takas",
    database: {
      generateId: usesDatabaseGeneratedIds ? false : undefined
    },
    crossSubDomainCookies: {
      enabled: false
    },
    useSecureCookies: process.env.NODE_ENV === "production"
  },
  plugins: [
    twoFactor({
      issuer: "E-Takas",
      otpOptions: {
        period: 30
      }
    }),
    nextCookies()
  ]
});

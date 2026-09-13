import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLogs, loginEvents, securityChallenges, sessions, users } from "@/lib/db/schema";
import {
  challengeSecretHash,
  finishLogin,
  finishPasswordReset,
  matchesChallengeSecret,
  parseChallengeToken,
  requestPasswordReset,
  startLogin
} from "./challenges";
import type { AppSessionUser } from "./roles";

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  email: vi.fn(),
  requireEmail: vi.fn(),
  passwordValid: vi.fn(),
  hashPassword: vi.fn(),
  after: vi.fn()
}));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
vi.mock("@/lib/email/send", () => ({
  sendSecurityEmail: mocks.email,
  requireEmailConfigured: mocks.requireEmail
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after
}));
vi.mock("./password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./password")>()),
  hashPasswordAsync: mocks.hashPassword,
  verifyPasswordAsync: mocks.passwordValid
}));

const id = "e7d15233-30d0-41a5-a7b6-718c70bd3221";
const browserSecret = "b".repeat(43);
const resetSecret = "r".repeat(43);
const code = "18452367";
const request = new Request("https://etakas.example/api/session", {
  headers: { "user-agent": "isolated-unit-test" }
});
const admin: AppSessionUser = {
  id: "admin",
  email: "admin@example.invalid",
  roles: ["SUPER_ADMIN"],
  organizationIds: [],
  totpEnabled: false
};
type Data = Record<string, unknown>;
type Write = { table: unknown; kind: "insert" | "update" | "delete"; values: Data };
let user: Data | null;
let challenge: Data | null;
let writes: Write[];

// In-memory adapter exercises the service branches without a real connection.
// Database row locking and concurrent transactions are intentionally not simulated.
type MockDatabase = {
  select: () => {
    from: (table: unknown) => {
      where: () => { limit: () => Promise<Data[]>; for: () => Promise<Data[]> };
    };
  };
  update: (table: unknown) => { set: (values: Data) => { where: () => Promise<void> } };
  insert: (table: unknown) => { values: (values: Data) => Promise<void> };
  delete: (table: unknown) => { where: () => Promise<void> };
  transaction: <T>(callback: (tx: MockDatabase) => Promise<T>) => Promise<T>;
};
function database(): MockDatabase {
  const db: MockDatabase = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          const read = () => {
            const row = table === users ? user : table === securityChallenges ? challenge : null;
            return row ? [{ ...row }] : [];
          };
          return { limit: async () => read(), for: async () => read() };
        }
      })
    }),
    update: (table: unknown) => ({
      set: (values: Data) => ({
        where: async () => {
          writes.push({ table, kind: "update", values });
          const row = table === users ? user : table === securityChallenges ? challenge : null;
          if (row)
            for (const [key, value] of Object.entries(values))
              row[key] =
                key === "authVersion" && typeof value !== "number"
                  ? Number(row.authVersion) + 1
                  : value;
        }
      })
    }),
    insert: (table: unknown) => ({
      values: async (values: Data) => {
        writes.push({ table, kind: "insert", values });
      }
    }),
    delete: (table: unknown) => ({
      where: async () => {
        writes.push({ table, kind: "delete", values: {} });
      }
    }),
    transaction: async <T>(callback: (tx: MockDatabase) => Promise<T>) => callback(db)
  };
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_RATE_LIMIT_SECRET", "isolated-challenge-test-pepper-never-production");
  vi.stubEnv("APP_URL", "https://etakas.example");
  vi.stubEnv("VERCEL", "");
  user = {
    id: "user-1",
    email: "owner@example.invalid",
    authVersion: 2,
    passwordHash: "existing-hash",
    emailVerified: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    disabledAt: null
  };
  challenge = {
    id,
    userId: "user-1",
    purpose: "LOGIN",
    authVersion: 2,
    secretHash: challengeSecretHash(id, code),
    browserHash: challengeSecretHash(id, browserSecret),
    attempts: 0,
    expiresAt: new Date(Date.now() + 600000),
    consumedAt: null,
    nextPath: "/panel"
  };
  writes = [];
  mocks.db.mockReturnValue(database());
  mocks.email.mockResolvedValue(undefined);
  mocks.passwordValid.mockResolvedValue(true);
  mocks.hashPassword.mockResolvedValue("new-hash");
});
afterEach(() => vi.unstubAllEnvs());

describe("challenge material", () => {
  it("binds proofs to the challenge and accepts only well-formed tokens", () => {
    expect(parseChallengeToken(`${id}.${browserSecret}`)).toEqual({ id, secret: browserSecret });
    for (const token of [
      null,
      `${id}.short`,
      `${id}.${browserSecret}.extra`,
      `../${id}.${browserSecret}`
    ])
      expect(parseChallengeToken(token)).toBeNull();
    const hash = challengeSecretHash(id, code);
    expect(hash).not.toContain(code);
    expect(matchesChallengeSecret(id, code, hash)).toBe(true);
    expect(matchesChallengeSecret("another-id", code, hash)).toBe(false);
    expect(matchesChallengeSecret(id, code, "malformed")).toBe(false);
  });
});

describe("password and email login", () => {
  it("cannot create a session from a correct password alone", async () => {
    await startLogin(request, "owner@example.invalid", "Unique passphrase 123!", "/panel");
    expect(writes.some((row) => row.table === securityChallenges && row.kind === "insert")).toBe(
      true
    );
    expect(writes.some((row) => row.table === sessions)).toBe(false);
    const stored = writes.find(
      (row) => row.table === securityChallenges && row.kind === "insert"
    )!.values;
    expect(stored.secretHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.browserHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.email).toHaveBeenCalledTimes(1);
  });

  it("requires legacy weak credentials to be reset before sending a login proof", async () => {
    await expect(
      startLogin(request, "owner@example.invalid", "Ahmet1234", "/panel")
    ).rejects.toMatchObject({ code: "PASSWORD_UPGRADE_REQUIRED" });
    expect(mocks.email).not.toHaveBeenCalled();
    expect(writes.some((row) => row.table === sessions || row.table === securityChallenges)).toBe(
      false
    );
  });

  it("temporarily locks an account after the fifth incorrect password", async () => {
    user!.failedLoginAttempts = 4;
    mocks.passwordValid.mockResolvedValue(false);
    await expect(
      startLogin(request, "owner@example.invalid", "Wrong password 123!", "/panel")
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(user!.lockedUntil).toBeInstanceOf(Date);
    expect((user!.lockedUntil as Date).getTime()).toBeGreaterThan(Date.now() + 14 * 60000);
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it("consumes a valid proof and stores only the session-token hash", async () => {
    const result = await finishLogin(request, `${id}.${browserSecret}`, code);
    const session = writes.find((row) => row.table === sessions && row.kind === "insert")!.values;
    expect(session.emailVerifiedAt).toBeInstanceOf(Date);
    expect(session.authVersion).toBe(2);
    expect(session.tokenHash).not.toBe(result.token);
    expect(challenge!.consumedAt).toBeInstanceOf(Date);
    expect(user!.emailVerified).toBe(true);
    expect(writes.some((row) => row.table === loginEvents && row.values.successful === true)).toBe(
      true
    );
    await expect(finishLogin(request, `${id}.${browserSecret}`, code)).rejects.toMatchObject({
      code: "INVALID_CODE"
    });
    expect(writes.filter((row) => row.table === sessions)).toHaveLength(1);
  });

  it.each([
    "expired",
    "consumed",
    "attempts",
    "version",
    "disabled",
    "locked",
    "different-browser"
  ])("rejects %s proofs without creating a session", async (mode) => {
    if (mode === "expired") challenge!.expiresAt = new Date(Date.now() - 1);
    if (mode === "consumed") challenge!.consumedAt = new Date();
    if (mode === "attempts") challenge!.attempts = 5;
    if (mode === "version") user!.authVersion = 3;
    if (mode === "disabled") user!.disabledAt = new Date();
    if (mode === "locked") user!.lockedUntil = new Date(Date.now() + 600000);
    const secret = mode === "different-browser" ? "x".repeat(43) : browserSecret;
    await expect(finishLogin(request, `${id}.${secret}`, code)).rejects.toMatchObject({
      code: "INVALID_CODE"
    });
    expect(writes.some((row) => row.table === sessions)).toBe(false);
  });

  it("consumes the challenge and locks the account at the fifth wrong code", async () => {
    challenge!.attempts = 4;
    user!.failedLoginAttempts = 4;
    await expect(finishLogin(request, `${id}.${browserSecret}`, "00000000")).rejects.toMatchObject({
      code: "INVALID_CODE"
    });
    expect(challenge!.attempts).toBe(5);
    expect(challenge!.consumedAt).toBeInstanceOf(Date);
    expect(user!.lockedUntil).toBeInstanceOf(Date);
    expect(writes.some((row) => row.table === sessions)).toBe(false);
  });
});

describe("password recovery authorization", () => {
  beforeEach(() => {
    challenge!.purpose = "PASSWORD_RESET";
    challenge!.secretHash = challengeSecretHash(id, resetSecret);
  });

  it("does not let a business user initiate an administrator reset", async () => {
    await expect(
      requestPasswordReset(request, "owner@example.invalid", {
        ...admin,
        roles: ["ORGANIZATION_OWNER"],
        reason: "Hesap sahibi talebi"
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it("keeps public responses generic for unavailable and permanently disabled accounts", async () => {
    user = null;
    await expect(requestPasswordReset(request, "unknown@example.invalid")).resolves.toBeUndefined();
    user = { id: "user-1", disabledAt: new Date() };
    await expect(requestPasswordReset(request, "owner@example.invalid")).resolves.toBeUndefined();
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });

  it("queues public email without invalidating still-valid recovery links", async () => {
    await requestPasswordReset(request, "owner@example.invalid");
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.email).not.toHaveBeenCalled();
    expect(writes.some((row) => row.table === securityChallenges && row.kind === "insert")).toBe(
      true
    );
    expect(writes.some((row) => row.table === securityChallenges && row.kind === "update")).toBe(
      false
    );
    await mocks.after.mock.calls[0][0]();
    expect(mocks.email).toHaveBeenCalledTimes(1);
  });

  it("cannot bypass a permanent administrative lock with an earlier valid reset link", async () => {
    user!.disabledAt = new Date();
    await expect(
      finishPasswordReset(request, `${id}.${resetSecret}`, "A newly chosen long passphrase!")
    ).rejects.toMatchObject({ code: "INVALID_RESET_LINK" });
    expect(writes).toHaveLength(0);
    expect(user!.passwordHash).toBe("existing-hash");
  });

  it.each(["expired", "consumed", "version", "wrong-secret"])(
    "rejects %s recovery links without changing credentials",
    async (mode) => {
      if (mode === "expired") challenge!.expiresAt = new Date(Date.now() - 1);
      if (mode === "consumed") challenge!.consumedAt = new Date();
      if (mode === "version") user!.authVersion = 3;
      await expect(
        finishPasswordReset(
          request,
          `${id}.${mode === "wrong-secret" ? browserSecret : resetSecret}`,
          "A newly chosen long passphrase!"
        )
      ).rejects.toMatchObject({ code: "INVALID_RESET_LINK" });
      expect(writes).toHaveLength(0);
    }
  );

  it("revokes every existing session and proof when a password changes", async () => {
    user!.lockedUntil = new Date(Date.now() + 600000);
    await finishPasswordReset(request, `${id}.${resetSecret}`, "A newly chosen long passphrase!");
    expect(user!.passwordHash).toBe("new-hash");
    expect(user!.authVersion).toBe(3);
    expect(user!.lockedUntil).toBeNull();
    expect(writes.some((row) => row.kind === "delete" && row.table === sessions)).toBe(true);
    expect(challenge!.consumedAt).toBeInstanceOf(Date);
    expect(
      writes.some(
        (row) => row.table === auditLogs && row.values.action === "PASSWORD_RESET_COMPLETED"
      )
    ).toBe(true);
    expect(writes.some((row) => row.table === sessions && row.kind === "insert")).toBe(false);
    await expect(
      finishPasswordReset(request, `${id}.${resetSecret}`, "Another newly chosen passphrase!")
    ).rejects.toMatchObject({ code: "INVALID_RESET_LINK" });
  });
});

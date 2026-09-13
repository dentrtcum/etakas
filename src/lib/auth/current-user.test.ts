import { beforeEach, describe, expect, it, vi } from "vitest";
import { organizationMembers, userRoles, users } from "@/lib/db/schema";
import { getCurrentAppUser } from "./current-user";
import { isAdmin } from "./roles";

const mocks = vi.hoisted(() => ({ session: vi.fn(), db: vi.fn() }));
vi.mock("./app-session", () => ({ getSessionUserIdFromCookie: mocks.session }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
vi.mock("@/lib/env", () => ({ serverEnv: { DATABASE_URL: "unused-unit-test-only" } }));

let globalRoles: { role: string }[];
let memberships: { organizationId: string; role: string }[];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue("user-1");
  globalRoles = [];
  memberships = [];
  mocks.db.mockReturnValue({
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          const rows =
            table === users
              ? [{ id: "user-1", email: "person@example.invalid", totpEnabled: false }]
              : table === userRoles
                ? globalRoles
                : table === organizationMembers
                  ? memberships
                  : [];
          return Object.assign(Promise.resolve(rows), { limit: async () => rows });
        }
      })
    })
  });
});

describe("session user role construction", () => {
  it("never promotes membership roles or legacy global roles into super-admin access", async () => {
    globalRoles = [{ role: "ADMIN_REVIEWER" }, { role: "LEDGER_ADMIN" }];
    memberships = [
      { organizationId: "org-1", role: "ORGANIZATION_OWNER" },
      { organizationId: "org-2", role: "SUPER_ADMIN" },
      { organizationId: "org-3", role: "ADMIN_REVIEWER" }
    ];
    const actor = await getCurrentAppUser();
    expect(isAdmin(actor)).toBe(false);
    expect(actor?.roles).toEqual(["ORGANIZATION_OWNER"]);
    expect(actor?.organizationIds).toEqual(["org-1"]);
    expect(actor?.organizationRoles).toEqual({ "org-1": ["ORGANIZATION_OWNER"] });
  });

  it("keeps separate permissions for each organization", async () => {
    memberships = [
      { organizationId: "org-1", role: "ORGANIZATION_OWNER" },
      { organizationId: "org-2", role: "VIEWER" },
      { organizationId: "org-2", role: "ORDER_MANAGER" }
    ];
    expect((await getCurrentAppUser())?.organizationRoles).toEqual({
      "org-1": ["ORGANIZATION_OWNER"],
      "org-2": ["VIEWER", "ORDER_MANAGER"]
    });
  });

  it("recognizes the explicitly assigned global super-admin role", async () => {
    globalRoles = [{ role: "SUPER_ADMIN" }];
    expect(isAdmin(await getCurrentAppUser())).toBe(true);
  });

  it("does not construct an actor without a verified session", async () => {
    mocks.session.mockResolvedValue(null);
    expect(await getCurrentAppUser()).toBeNull();
    expect(mocks.db).not.toHaveBeenCalled();
  });
});

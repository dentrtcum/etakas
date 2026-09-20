import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: { where: unknown } = { where: null };
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn()
  };
  builder.from.mockReturnValue(builder);
  builder.where.mockImplementation((condition) => {
    state.where = condition;
    return builder;
  });
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.offset.mockResolvedValue([]);
  return {
    assertAdminRead: vi.fn(),
    getDb: vi.fn(() => ({ select: vi.fn(() => builder) })),
    state
  };
});

vi.mock("@/lib/db/access", () => ({ assertAdminRead: mocks.assertAdminRead }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));

import { listAdminUsers } from "@/modules/admin/user-queries";

describe("listAdminUsers", () => {
  beforeEach(() => {
    mocks.state.where = null;
    vi.clearAllMocks();
  });

  it("excludes users whose only organization is closed while retaining super admins", async () => {
    await listAdminUsers();

    expect(mocks.assertAdminRead).toHaveBeenCalledOnce();
    expect(mocks.state.where).not.toBeNull();

    const query = new PgDialect().sqlToQuery(mocks.state.where as never);
    expect(query.sql).toContain('from "user_roles"');
    expect(query.sql).toContain('from "organization_members"');
    expect(query.sql).toContain('inner join "organizations"');
    expect(query.sql).toContain('"organizations"."status" <>');
    expect(query.sql).toContain("'SUPER_ADMIN'");
    expect(query.sql).toContain("'CLOSED'");
    expect(query.sql).toContain(" or ");
    expect(query.params).toEqual([]);
  });
});

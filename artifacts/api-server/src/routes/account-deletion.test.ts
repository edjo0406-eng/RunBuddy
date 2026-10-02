import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  deleteClerkUser: vi.fn(),
  localUser: { id: "local-user-id" },
  runner: { id: 14, authUserId: "local-user-id" } as {
    id: number;
    authUserId: string;
  } | null,
  usersTable: null as unknown,
  runnersTable: null as unknown,
  connectionsTable: null as unknown,
  messagesTable: null as unknown,
  deletions: [] as Array<{ table: unknown; condition: unknown }>,
}));

vi.mock("@clerk/express", () => ({
  getAuth: mocks.getAuth,
  clerkClient: { users: { deleteUser: mocks.deleteClerkUser } },
}));
vi.mock("@workspace/db", () => {
  const usersTable = { id: "users.id" };
  const runnersTable = { id: "runners.id", authUserId: "runners.authUserId" };
  const connectionsTable = {
    fromRunnerId: "connections.fromRunnerId",
    toRunnerId: "connections.toRunnerId",
  };
  const messagesTable = {
    fromRunnerId: "messages.fromRunnerId",
    toRunnerId: "messages.toRunnerId",
  };
  Object.assign(mocks, { usersTable, runnersTable, connectionsTable, messagesTable });
  return {
    db: { select: mocks.select, transaction: mocks.transaction },
    usersTable,
    runnersTable,
    connectionsTable,
    messagesTable,
  };
});
vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ type: "eq", column, value }),
  and: (...conditions: unknown[]) => ({ type: "and", conditions }),
  or: (...conditions: unknown[]) => ({ type: "or", conditions }),
  desc: (column: unknown) => column,
  sql: Object.assign(() => ({ type: "sql" }), { raw: () => ({ type: "raw" }) }),
}));

import runnersRouter from "./runners";

const app = express();
app.use((req, _res, next) => {
  Object.assign(req, { log: { error: vi.fn() } });
  next();
});
app.use("/api", runnersRouter);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deletions = [];
  mocks.localUser = { id: "local-user-id" };
  mocks.runner = { id: 14, authUserId: "local-user-id" };
  mocks.getAuth.mockReturnValue({
    userId: "clerk-user-id",
    sessionClaims: { userId: "local-user-id" },
  });
  mocks.select.mockImplementation(() => {
    let selectedTable: unknown;
    const query = {
      from: (table: unknown) => {
        selectedTable = table;
        return query;
      },
      where: (_condition: unknown) => query,
      limit: async (_count?: number) => {
        if (selectedTable === mocks.usersTable) return [mocks.localUser];
        if (selectedTable === mocks.runnersTable) {
          return mocks.runner ? [mocks.runner] : [];
        }
        return [];
      },
    };
    return query;
  });
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    const originalCount = mocks.deletions.length;
    const tx = {
      delete: (table: unknown) => ({
        where: async (condition: unknown) => {
          mocks.deletions.push({ table, condition });
          return [];
        },
      }),
    };
    try {
      return await callback(tx);
    } catch (error) {
      mocks.deletions.splice(originalCount);
      throw error;
    }
  });
  mocks.deleteClerkUser.mockResolvedValue({});
});

describe("account deletion", () => {
  it("deletes all runner data and the Clerk identity using the correct IDs", async () => {
    const response = await request(app).delete("/api/runners/me");

    expect(response.status).toBe(204);
    expect(mocks.deleteClerkUser).toHaveBeenCalledWith("clerk-user-id");
    expect(mocks.deletions.map(({ table }) => table)).toEqual([
      mocks.messagesTable,
      mocks.connectionsTable,
      mocks.runnersTable,
      mocks.usersTable,
    ]);
    expect(mocks.deletions[0].condition).toEqual({
      type: "or",
      conditions: [
        { type: "eq", column: "messages.fromRunnerId", value: 14 },
        { type: "eq", column: "messages.toRunnerId", value: 14 },
      ],
    });
    expect(mocks.deletions[1].condition).toEqual({
      type: "or",
      conditions: [
        { type: "eq", column: "connections.fromRunnerId", value: 14 },
        { type: "eq", column: "connections.toRunnerId", value: 14 },
      ],
    });
    expect(mocks.deletions[2].condition).toEqual({
      type: "and",
      conditions: [
        { type: "eq", column: "runners.id", value: 14 },
        { type: "eq", column: "runners.authUserId", value: "local-user-id" },
      ],
    });
    expect(mocks.deletions[3].condition).toEqual({
      type: "eq",
      column: "users.id",
      value: "local-user-id",
    });
  });

  it("deletes the sign-in account even if the runner profile is already missing", async () => {
    mocks.runner = null;

    const response = await request(app).delete("/api/runners/me");

    expect(response.status).toBe(204);
    expect(mocks.deleteClerkUser).toHaveBeenCalledWith("clerk-user-id");
    expect(mocks.deletions.map(({ table }) => table)).toEqual([mocks.usersTable]);
  });

  it("requires an authenticated Clerk identity", async () => {
    mocks.getAuth.mockReturnValue({ userId: null });

    const response = await request(app).delete("/api/runners/me");

    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.deleteClerkUser).not.toHaveBeenCalled();
  });

  it("rolls back local deletions if Clerk account deletion fails", async () => {
    mocks.deleteClerkUser.mockRejectedValue(new Error("Clerk unavailable"));

    const response = await request(app).delete("/api/runners/me");

    expect(response.status).toBe(500);
    expect(mocks.deletions).toEqual([]);
  });
});
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentRunnerId: null as number | null,
  connection: null as Record<string, unknown> | null,
  beforeUpdate: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  getAuthenticatedRunner: vi.fn(),
  requireAuthentication: vi.fn(),
  requireRunner: vi.fn(),
  areRunnersBlocked: vi.fn(),
}));

vi.mock("@workspace/db", () => {
  const columns = new Proxy({}, { get: (_target, name) => name });
  return {
    db: { select: mocks.select, update: mocks.update },
    connectionsTable: columns,
    runnersTable: columns,
  };
});

vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ column, value }),
  and: (...conditions: unknown[]) => ({ and: conditions }),
  or: (...conditions: unknown[]) => ({ or: conditions }),
  inArray: (column: unknown, values: unknown[]) => ({ column, values }),
}));

vi.mock("../lib/authorization", () => ({
  getAuthenticatedRunner: mocks.getAuthenticatedRunner,
  requireAuthentication: mocks.requireAuthentication,
  requireRunner: mocks.requireRunner,
  publicRunnerSelection: { id: "id" },
}));

vi.mock("../lib/safety", () => ({
  areRunnersBlocked: mocks.areRunnersBlocked,
  getHiddenRunnerIds: vi.fn(async () => []),
}));

import connectionsRouter from "./connections";

const app = express();
app.use(express.json());
app.use("/api", connectionsRouter);

function matches(row: Record<string, unknown>, condition: unknown): boolean {
  if (!condition) return true;
  const predicate = condition as {
    column?: string;
    value?: unknown;
    and?: unknown[];
    or?: unknown[];
  };
  if (predicate.and) return predicate.and.every((part) => matches(row, part));
  if (predicate.or) return predicate.or.some((part) => matches(row, part));
  return row[predicate.column!] === predicate.value;
}

const pendingConnection = () => ({
  id: 41,
  fromRunnerId: 10,
  toRunnerId: 20,
  type: "buddy",
  status: "pending",
  message: "Let's run together",
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentRunnerId = 20;
  mocks.connection = pendingConnection();
  mocks.beforeUpdate.mockReset();
  mocks.getAuthenticatedRunner.mockImplementation(async () =>
    mocks.currentRunnerId === null ? null : { id: mocks.currentRunnerId },
  );
  mocks.requireAuthentication.mockResolvedValue(true);
  mocks.requireRunner.mockImplementation((runner) => Boolean(runner));
  mocks.areRunnersBlocked.mockResolvedValue(false);
  mocks.select.mockImplementation(() => ({
    from: () => ({
      where: async (condition: unknown) =>
        mocks.connection && matches(mocks.connection, condition)
          ? [mocks.connection]
          : [],
    }),
  }));
  mocks.update.mockImplementation(() => {
    let values: Record<string, unknown> = {};
    let condition: unknown;
    const query = {
      set: (nextValues: Record<string, unknown>) => {
        values = nextValues;
        return query;
      },
      where: (nextCondition: unknown) => {
        condition = nextCondition;
        return query;
      },
      returning: async () => {
        mocks.beforeUpdate();
        if (!mocks.connection || !matches(mocks.connection, condition))
          return [];
        Object.assign(mocks.connection, values);
        return [mocks.connection];
      },
    };
    return query;
  });
});

describe("responding to connection requests", () => {
  it.each(["accepted", "declined"] as const)(
    "allows the intended recipient to set status to %s",
    async (status) => {
      const response = await request(app)
        .put("/api/connections/41")
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(status);
      expect(mocks.connection?.status).toBe(status);
      expect(mocks.update).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { runnerId: 10, role: "sender" },
    { runnerId: 30, role: "unrelated runner" },
  ])(
    "rejects an update from the $role without changing the request",
    async ({ runnerId }) => {
      mocks.currentRunnerId = runnerId;
      const before = { ...mocks.connection };

      const response = await request(app)
        .put("/api/connections/41")
        .send({ status: "accepted" });

      expect(response.status).toBe(403);
      expect(mocks.connection).toEqual(before);
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  it.each(["accepted", "declined"] as const)(
    "rejects another response after the request is already %s",
    async (existingStatus) => {
      mocks.connection!.status = existingStatus;
      const before = { ...mocks.connection };
      const nextStatus =
        existingStatus === "accepted" ? "declined" : "accepted";

      const response = await request(app)
        .put("/api/connections/41")
        .send({ status: nextStatus });

      expect(response.status).toBe(409);
      expect(mocks.connection).toEqual(before);
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  it("does not overwrite a decision made after the pending request was read", async () => {
    mocks.beforeUpdate.mockImplementationOnce(() => {
      mocks.connection!.status = "accepted";
    });

    const response = await request(app)
      .put("/api/connections/41")
      .send({ status: "declined" });

    expect(response.status).toBe(404);
    expect(mocks.connection?.status).toBe("accepted");
  });
});

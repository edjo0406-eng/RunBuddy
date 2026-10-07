import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentRunnerId: 20,
  rows: [] as Record<string, unknown>[],
  runnerRows: [] as Record<string, unknown>[],
  select: vi.fn(),
  update: vi.fn(),
  getAuthenticatedRunner: vi.fn(),
  requireAuthentication: vi.fn(),
  requireRunner: vi.fn(),
  areRunnersBlocked: vi.fn(),
  getHiddenRunnerIds: vi.fn(),
}));

vi.mock("@workspace/db", () => {
  const columns = new Proxy({}, { get: (_target, name) => String(name) });
  return {
    db: { select: mocks.select, update: mocks.update },
    messagesTable: columns,
    runnersTable: columns,
  };
});

vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ column, value }),
  and: (...conditions: unknown[]) => ({ and: conditions }),
  or: (...conditions: unknown[]) => ({ or: conditions }),
  desc: (column: unknown) => ({ direction: "desc", column }),
  inArray: (column: unknown, values: unknown[]) => ({
    inArray: { column: String(column), values },
  }),
  sql: () => null,
  notInArray: (column: unknown, values: unknown[]) => ({ column, values }),
}));

vi.mock("../lib/authorization", () => ({
  getAuthenticatedRunner: mocks.getAuthenticatedRunner,
  publicRunnerSelection: { id: "id" },
  requireAuthentication: mocks.requireAuthentication,
  requireRunner: mocks.requireRunner,
}));

vi.mock("../lib/safety", () => ({
  areRunnersBlocked: mocks.areRunnersBlocked,
  getHiddenRunnerIds: mocks.getHiddenRunnerIds,
}));

import messagesRouter from "./messages";

const app = express();
app.use(express.json());
app.use("/api", messagesRouter);

type Predicate = {
  column?: string;
  value?: unknown;
  and?: unknown[];
  or?: unknown[];
  inArray?: { column: string; values: unknown[] };
};

function matches(row: Record<string, unknown>, condition: unknown): boolean {
  if (!condition) return true;
  const predicate = condition as Predicate;
  if (predicate.and) return predicate.and.every((part) => matches(row, part));
  if (predicate.or) return predicate.or.some((part) => matches(row, part));
  if (predicate.inArray) {
    return predicate.inArray.values.includes(row[predicate.inArray.column]);
  }
  return row[predicate.column!] === predicate.value;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentRunnerId = 20;
  mocks.rows = [
    {
      id: 101,
      fromRunnerId: 10,
      toRunnerId: 20,
      content: "Selected conversation: incoming unread one",
      isRead: false,
      createdAt: "2026-10-01T10:00:00.000Z",
    },
    {
      id: 102,
      fromRunnerId: 10,
      toRunnerId: 20,
      content: "Selected conversation: incoming unread two",
      isRead: false,
      createdAt: "2026-10-01T10:01:00.000Z",
    },
    {
      id: 103,
      fromRunnerId: 10,
      toRunnerId: 20,
      content: "Selected conversation: already read",
      isRead: true,
      createdAt: "2026-10-01T10:02:00.000Z",
    },
    {
      id: 104,
      fromRunnerId: 20,
      toRunnerId: 10,
      content: "Selected conversation: sent by me",
      isRead: false,
      createdAt: "2026-10-01T10:03:00.000Z",
    },
    {
      id: 201,
      fromRunnerId: 30,
      toRunnerId: 20,
      content: "Another conversation: incoming unread",
      isRead: false,
      createdAt: "2026-10-01T10:04:00.000Z",
    },
    {
      id: 202,
      fromRunnerId: 20,
      toRunnerId: 30,
      content: "Another conversation: sent by me",
      isRead: false,
      createdAt: "2026-10-01T10:05:00.000Z",
    },
  ];
  mocks.runnerRows = [
    { id: 10, name: "Runner Ten" },
    { id: 30, name: "Runner Thirty" },
  ];

  mocks.getAuthenticatedRunner.mockImplementation(async () => ({
    id: mocks.currentRunnerId,
  }));
  mocks.requireAuthentication.mockResolvedValue(true);
  mocks.requireRunner.mockImplementation((runner) => Boolean(runner));
  mocks.areRunnersBlocked.mockResolvedValue(false);
  mocks.getHiddenRunnerIds.mockResolvedValue([]);

  mocks.select.mockImplementation((projection?: unknown) => {
    let condition: unknown;
    const selectsRunners =
      projection !== null &&
      typeof projection === "object" &&
      Object.prototype.hasOwnProperty.call(projection, "id");
    const sourceRows = selectsRunners
      ? mocks.runnerRows
      : mocks.rows;
    const getRows = () => sourceRows.filter((row) => matches(row, condition));
    const query = {
      from: () => query,
      where: (nextCondition: unknown) => {
        condition = nextCondition;
        return query;
      },
      orderBy: (order: unknown) => {
        const rows = getRows();
        const sort = order as { direction?: string; column?: unknown };
        const column = typeof order === "string" ? order : String(sort.column);
        if (column) {
          rows.sort(
            (left, right) => {
              const difference =
                new Date(String(left[column])).getTime() -
                new Date(String(right[column])).getTime();
              return sort.direction === "desc" ? -difference : difference;
            },
          );
        }
        return Promise.resolve(rows);
      },
      then: (
        resolve: (rows: Record<string, unknown>[]) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(getRows()).then(resolve, reject),
    };
    return query;
  });

  mocks.update.mockImplementation(() => {
    let values: Record<string, unknown> = {};
    const query = {
      set: (nextValues: Record<string, unknown>) => {
        values = nextValues;
        return query;
      },
      where: async (condition: unknown) => {
        const matchedRows = mocks.rows.filter((row) => matches(row, condition));
        matchedRows.forEach((row) => Object.assign(row, values));
        return matchedRows;
      },
    };
    return query;
  });
});

describe("runner inbox", () => {
  it("returns conversations with each partner and the correct unread count", async () => {
    const response = await request(app).get("/api/messages/inbox");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      otherId: 30,
      otherRunner: { id: 30, name: "Runner Thirty" },
      latestMessage: { id: 202 },
      unreadCount: 1,
    });
    expect(response.body[1]).toMatchObject({
      otherId: 10,
      otherRunner: { id: 10, name: "Runner Ten" },
      latestMessage: { id: 104 },
      unreadCount: 2,
    });
  });
});

describe("opening a message conversation", () => {
  it("returns only that conversation and marks only its incoming unread messages read", async () => {
    const response = await request(app)
      .get("/api/messages/conversation")
      .query({ otherId: 10 });

    expect(response.status).toBe(200);
    expect(response.body.map((message: { id: number }) => message.id)).toEqual([
      101, 102, 103, 104,
    ]);

    const isReadById = new Map(
      mocks.rows.map((message) => [message.id, message.isRead]),
    );
    expect(isReadById.get(101)).toBe(true);
    expect(isReadById.get(102)).toBe(true);
    expect(isReadById.get(103)).toBe(true);
    expect(isReadById.get(104)).toBe(false);
    expect(isReadById.get(201)).toBe(false);
    expect(isReadById.get(202)).toBe(false);
  });
});

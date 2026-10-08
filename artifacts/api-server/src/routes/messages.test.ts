import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import {
  createInboxMessageEventBus,
  publishUnreadCountUpdate,
  subscribeToUnreadCountUpdates,
  UNREAD_COUNT_EVENT_CHANNEL,
  type InboxMessageEventPool,
} from "../lib/inbox-message-events";

const mocks = vi.hoisted(() => {
  type Notification = { channel: string; payload: string };
  type NotificationListener = (notification: Notification) => void;
  type ErrorListener = (error: Error) => void;
  const pgClients = new Set<{
    channels: Set<string>;
    notificationListeners: Set<NotificationListener>;
  }>();

  const pool = {
    connect: vi.fn(async () => {
      const state = {
        channels: new Set<string>(),
        notificationListeners: new Set<NotificationListener>(),
      };
      pgClients.add(state);

      const client = {
        on: (
          event: "notification" | "error",
          listener: NotificationListener | ErrorListener,
        ) => {
          if (event === "notification") {
            state.notificationListeners.add(listener as NotificationListener);
          }
          return client;
        },
        query: async (statement: string) => {
          const channel = /^LISTEN\s+([a-z_]+)$/i.exec(statement)?.[1];
          if (channel) state.channels.add(channel);
          return { rows: [] };
        },
        release: () => {
          pgClients.delete(state);
        },
      };

      return client;
    }),
    query: vi.fn(async (_statement: string, values?: string[]) => {
      const [rawChannel, rawPayload] = values ?? [];
      const channel = String(rawChannel);
      const payload = String(rawPayload);
      for (const client of pgClients) {
        if (!client.channels.has(channel)) continue;
        for (const listener of client.notificationListeners) {
          listener({ channel, payload });
        }
      }
      return { rows: [] };
    }),
  };

  return {
    currentRunnerId: 20,
    rows: [] as Record<string, unknown>[],
    runnerRows: [] as Record<string, unknown>[],
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    getAuthenticatedRunner: vi.fn(),
    requireAuthentication: vi.fn(),
    requireRunner: vi.fn(),
    areRunnersBlocked: vi.fn(),
    getHiddenRunnerIds: vi.fn(),
    pgClients,
    pool,
  };
});

vi.mock("@workspace/db", () => {
  const columns = new Proxy({}, { get: (_target, name) => String(name) });
  return {
    db: { select: mocks.select, insert: mocks.insert, update: mocks.update },
    pool: mocks.pool,
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

vi.mock("../middlewares/rateLimit", () => ({
  createRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
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

  mocks.insert.mockImplementation(() => {
    let insertedValues: Record<string, unknown> = {};
    return {
      values: (values: Record<string, unknown>) => {
        insertedValues = values;
        return {
          returning: async () => [
            {
              id: 301,
              ...insertedValues,
              isRead: false,
              createdAt: "2026-10-01T10:06:00.000Z",
            },
          ],
        };
      },
    };
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

describe("inbox update events", () => {
  it("notifies the recipient after a message is stored", async () => {
    const recipientListener = vi.fn();
    const unsubscribe = await subscribeToUnreadCountUpdates(
      30,
      recipientListener,
    );

    try {
      const response = await request(app)
        .post("/api/messages")
        .send({ toRunnerId: 30, content: "See you on the next run." });

      expect(response.status, response.text).toBe(201);
      expect(recipientListener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it("delivers a message event to a recipient stream on another API process", async () => {
    const recipientProcess = createInboxMessageEventBus(
      mocks.pool as unknown as InboxMessageEventPool,
      { warn: vi.fn() },
      "recipient-api-process",
    );
    const recipientUpdate = vi.fn();
    const unrelatedRunnerUpdate = vi.fn();
    const unsubscribeRecipient =
      await recipientProcess.subscribeToUnreadCountUpdates(30, recipientUpdate);
    const unsubscribeUnrelated =
      await recipientProcess.subscribeToUnreadCountUpdates(
        31,
        unrelatedRunnerUpdate,
      );

    try {
      const response = await request(app)
        .post("/api/messages")
        .send({ toRunnerId: 30, content: "Meet at the park at 6." });

      expect(response.status).toBe(201);
      expect(recipientUpdate).toHaveBeenCalledTimes(1);
      expect(unrelatedRunnerUpdate).not.toHaveBeenCalled();

      const notifyCall = mocks.pool.query.mock.calls.find(([statement]) =>
        statement.includes("pg_notify"),
      );
      expect(notifyCall).toBeDefined();
      const notificationPayload = JSON.parse(notifyCall?.[1]?.[1] ?? "{}");
      expect(notificationPayload).toMatchObject({
        runnerId: 30,
        sourceId: expect.any(String),
      });
      expect(notificationPayload).not.toHaveProperty("content");
      expect(notifyCall?.[1]?.[0]).toBe(UNREAD_COUNT_EVENT_CHANNEL);
    } finally {
      unsubscribeRecipient();
      unsubscribeUnrelated();
    }
  });

  it("still saves a message when cross-process event publishing fails", async () => {
    const localRecipientUpdate = vi.fn();
    const unsubscribe = await subscribeToUnreadCountUpdates(
      30,
      localRecipientUpdate,
    );
    mocks.pool.query.mockRejectedValueOnce(
      new Error("Temporary notification failure"),
    );

    try {
      const response = await request(app)
        .post("/api/messages")
        .send({ toRunnerId: 30, content: "See you soon." });

      expect(response.status).toBe(201);
      expect(localRecipientUpdate).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it("streams an authenticated runner's unread-count update signal", async () => {
    const server = app.listen(0);
    const controller = new AbortController();

    try {
      await once(server, "listening");
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("The test server did not bind to a TCP port.");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/messages/events`,
        { signal: controller.signal },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("The event stream has no response body.");

      let streamText = "";
      const decoder = new TextDecoder();
      const eventReceived = (async () => {
        while (!streamText.includes("event: unread-count")) {
          const { done, value } = await reader.read();
          if (done) throw new Error("The event stream closed before the update.");
          streamText += decoder.decode(value, { stream: true });
        }
        return streamText;
      })();

      publishUnreadCountUpdate(mocks.currentRunnerId);

      await expect(eventReceived).resolves.toContain("data: {}");
      await reader.cancel();
    } finally {
      controller.abort();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 10_000);
});

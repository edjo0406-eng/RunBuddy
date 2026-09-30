import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  currentAuth: {} as {
    userId?: string | null;
    sessionClaims?: { userId?: unknown } | null;
  },
  getAuth: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  getAuth: clerkMocks.getAuth,
}));

vi.mock("@clerk/shared/keys", () => ({
  publishableKeyFromHost: vi.fn((_host: string, fallback?: string) => fallback),
}));

vi.mock("./middlewares/clerkProxyMiddleware", () => ({
  CLERK_PROXY_PATH: "/api/__clerk",
  clerkProxyMiddleware: vi.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
  getClerkProxyHost: vi.fn(() => undefined),
}));

vi.mock("@workspace/db", () => {
  const table = () => new Proxy({}, { get: (_target, property) => property });
  return {
    db: { insert: dbMocks.insert, select: dbMocks.select },
    usersTable: table(),
    sessionsTable: table(),
    runnersTable: table(),
    connectionsTable: table(),
    messagesTable: table(),
  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => null),
  desc: vi.fn(() => null),
  eq: vi.fn(() => null),
  inArray: vi.fn(() => null),
  or: vi.fn(() => null),
  sql: vi.fn(() => null),
}));

import app from "./app";

let selectResults: unknown[][];
let insertResult: unknown[];
let insertedValues: unknown[];

function authenticateAsRunner(runnerId: number) {
  clerkMocks.currentAuth = {
    userId: "clerk-native-user",
    sessionClaims: { userId: "legacy-replit-subject" },
  };
  selectResults = [
    [{ id: "legacy-replit-subject" }],
    [{ id: runnerId }],
  ];
}

describe("Clerk account migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clerkMocks.currentAuth = { userId: null, sessionClaims: {} };
    clerkMocks.getAuth.mockImplementation(() => clerkMocks.currentAuth);
    selectResults = [];
    insertResult = [];
    insertedValues = [];

    dbMocks.select.mockImplementation(() => {
      const query: {
        from: ReturnType<typeof vi.fn>;
        where: ReturnType<typeof vi.fn>;
        limit: ReturnType<typeof vi.fn>;
        then: (
          onFulfilled?: ((value: unknown[]) => unknown) | null,
          onRejected?: ((reason: unknown) => unknown) | null,
        ) => Promise<unknown>;
      } = {
        from: vi.fn(() => query),
        where: vi.fn(() => query),
        limit: vi.fn(async () => selectResults.shift() ?? []),
        then: (onFulfilled, onRejected) =>
          Promise.resolve(selectResults.shift() ?? []).then(onFulfilled, onRejected),
      };
      return query;
    });

    dbMocks.insert.mockImplementation(() => {
      const query: {
        values: ReturnType<typeof vi.fn>;
        onConflictDoNothing: ReturnType<typeof vi.fn>;
        returning: ReturnType<typeof vi.fn>;
      } = {
        values: vi.fn((values: unknown) => {
          insertedValues.push(values);
          return query;
        }),
        onConflictDoNothing: vi.fn(() => query),
        returning: vi.fn(async () => insertResult),
      };
      return query;
    });
  });

  it("rejects requests without a Clerk session", async () => {
    const response = await request(app).get("/api/runners/me");

    expect(response.status).toBe(401);
    expect(dbMocks.select).not.toHaveBeenCalled();
  });

  it("uses the legacy session claim to preserve an existing runner link", async () => {
    const localUser = { id: "legacy-replit-subject" };
    clerkMocks.currentAuth = {
      userId: "clerk-native-user",
      sessionClaims: { userId: "legacy-replit-subject" },
    };
    selectResults = [[localUser], [{ id: 14 }]];

    const response = await request(app).get("/api/runners/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ runnerId: 14 });
    expect(dbMocks.insert).not.toHaveBeenCalled();
  });

  it("provisions new local users using the Clerk ID without copying identity fields", async () => {
    clerkMocks.currentAuth = {
      userId: "clerk-new-user",
      sessionClaims: {},
    };
    selectResults = [[], []];
    insertResult = [{ id: "clerk-new-user" }];

    const response = await request(app).get("/api/runners/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ runnerId: null });
    expect(insertedValues).toEqual([{ id: "clerk-new-user" }]);
  });

  it("reloads the local user after a concurrent first-request insert", async () => {
    const localUser = { id: "legacy-replit-subject" };
    clerkMocks.currentAuth = {
      userId: "clerk-native-user",
      sessionClaims: { userId: "legacy-replit-subject" },
    };
    selectResults = [[], [localUser], []];

    const response = await request(app).get("/api/runners/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ runnerId: null });
    expect(dbMocks.insert).toHaveBeenCalledOnce();
  });

  it("keeps the runner identity response uncached", async () => {
    clerkMocks.currentAuth = {
      userId: "clerk-native-user",
      sessionClaims: { userId: "legacy-replit-subject" },
    };
    selectResults = [
      [{ id: "legacy-replit-subject" }],
      [{ id: 14 }],
      [{ id: "legacy-replit-subject" }],
      [{ id: 14 }],
    ];

    const initial = await request(app).get("/api/runners/me");
    expect(initial.status).toBe(200);
    expect(initial.headers["cache-control"]).toBe(
      "no-store, no-cache, must-revalidate",
    );

    const conditional = await request(app)
      .get("/api/runners/me")
      .set("If-None-Match", initial.headers.etag ?? '"cached-runner-identity"');

    expect(conditional.status).toBe(200);
    expect(conditional.body).toEqual({ runnerId: 14 });
  });

  describe("self-directed runner actions", () => {
    it("rejects a connection to the runner resolved from the authenticated session", async () => {
      authenticateAsRunner(14);

      const response = await request(app)
        .post("/api/connections")
        .send({
          toRunnerId: 14,
          type: "buddy",
          message: "I'd love to connect.",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Cannot connect to yourself" });
      expect(dbMocks.insert).not.toHaveBeenCalled();
    });

    it("rejects a message to the runner resolved from the authenticated session", async () => {
      authenticateAsRunner(14);

      const response = await request(app)
        .post("/api/messages")
        .send({ toRunnerId: 14, content: "A message to myself" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Cannot message yourself" });
      expect(dbMocks.insert).not.toHaveBeenCalled();
    });

    it("rejects opening a conversation with the runner resolved from the session", async () => {
      authenticateAsRunner(14);

      const response = await request(app)
        .get("/api/messages/conversation")
        .query({ otherId: 14 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Cannot open a conversation with yourself",
      });
      expect(dbMocks.select).toHaveBeenCalledTimes(2);
      expect(dbMocks.insert).not.toHaveBeenCalled();
    });
  });

  describe("requests between runners", () => {
    it("creates a connection from the session-resolved runner", async () => {
      authenticateAsRunner(14);
      selectResults.push([{ id: 15 }]);
      insertResult = [{
        id: 21,
        fromRunnerId: 14,
        toRunnerId: 15,
        type: "buddy",
        status: "pending",
        message: "Let's run together.",
      }];

      const response = await request(app)
        .post("/api/connections")
        .send({
          toRunnerId: 15,
          type: "buddy",
          message: "Let's run together.",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(insertResult[0]);
      expect(insertedValues).toEqual([{
        toRunnerId: 15,
        type: "buddy",
        message: "Let's run together.",
        fromRunnerId: 14,
      }]);
    });

    it("rejects a connection request with a forged sender", async () => {
      authenticateAsRunner(14);

      const response = await request(app)
        .post("/api/connections")
        .send({
          fromRunnerId: 99,
          toRunnerId: 15,
          type: "buddy",
          message: "Let's run together.",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "fromRunnerId is derived from the authenticated session",
      });
      expect(dbMocks.insert).not.toHaveBeenCalled();
      expect(insertedValues).toEqual([]);
    });

    it("creates a message from the session-resolved runner", async () => {
      authenticateAsRunner(14);
      selectResults.push([{ id: 15 }]);
      insertResult = [{
        id: 34,
        fromRunnerId: 14,
        toRunnerId: 15,
        content: "Are you running this weekend?",
        isRead: false,
        createdAt: new Date("2026-09-30T12:00:00.000Z"),
      }];

      const response = await request(app)
        .post("/api/messages")
        .send({ toRunnerId: 15, content: "Are you running this weekend?" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 34,
        fromRunnerId: 14,
        toRunnerId: 15,
        content: "Are you running this weekend?",
        isRead: false,
        createdAt: "2026-09-30T12:00:00.000Z",
      });
      expect(insertedValues).toEqual([{
        fromRunnerId: 14,
        toRunnerId: 15,
        content: "Are you running this weekend?",
      }]);
    });

    it("rejects a message with a forged sender", async () => {
      authenticateAsRunner(14);

      const response = await request(app)
        .post("/api/messages")
        .send({
          fromRunnerId: 99,
          toRunnerId: 15,
          content: "A forged message",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "fromRunnerId is derived from the authenticated session",
      });
      expect(dbMocks.insert).not.toHaveBeenCalled();
      expect(insertedValues).toEqual([]);
    });
  });
});
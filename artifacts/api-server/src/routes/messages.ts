import { Router } from "express";
import { db, messagesTable, runnersTable } from "@workspace/db";
import { eq, or, and, desc, sql, notInArray, inArray } from "drizzle-orm";
import {
  GetConversationQueryParams,
  SendMessageBody,
} from "@workspace/api-zod";
import {
  getAuthenticatedRunner,
  publicRunnerSelection,
  requireAuthentication,
  requireRunner,
} from "../lib/authorization";
import {
  publishUnreadCountUpdate,
  subscribeToUnreadCountUpdates,
} from "../lib/inbox-message-events";
import { createRateLimiter } from "../middlewares/rateLimit";
import { areRunnersBlocked, getHiddenRunnerIds } from "../lib/safety";

const router = Router();
const sendMessageRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
});

router.get("/messages/inbox", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const runnerId = currentRunner.id;

  const allMessages = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        eq(messagesTable.fromRunnerId, runnerId),
        eq(messagesTable.toRunnerId, runnerId)
      )
    )
    .orderBy(desc(messagesTable.createdAt));
  const hiddenRunnerIds = new Set(await getHiddenRunnerIds(runnerId));
  const msgs = allMessages.filter((message) => {
    const otherId =
      message.fromRunnerId === runnerId
        ? message.toRunnerId
        : message.fromRunnerId;
    return !hiddenRunnerIds.has(otherId);
  });

  const conversationMap = new Map<number, {
    otherId: number;
    latestMessage: typeof msgs[0];
    unreadCount: number;
  }>();

  for (const msg of msgs) {
    const otherId = msg.fromRunnerId === runnerId ? msg.toRunnerId : msg.fromRunnerId;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, { otherId, latestMessage: msg, unreadCount: 0 });
    }
    if (!msg.isRead && msg.toRunnerId === runnerId) {
      conversationMap.get(otherId)!.unreadCount++;
    }
  }

  const otherIds = Array.from(conversationMap.keys());
  if (otherIds.length === 0) return res.json([]);

  const others = await db
    .select(publicRunnerSelection)
    .from(runnersTable)
    .where(inArray(runnersTable.id, otherIds));

  const otherMap = new Map(others.map((r) => [r.id, r]));

  const conversations = Array.from(conversationMap.values())
    .map(({ otherId, latestMessage, unreadCount }) => ({
      otherId,
      otherRunner: otherMap.get(otherId) ?? null,
      latestMessage,
      unreadCount,
    }))
    .sort(
      (a, b) =>
        new Date(b.latestMessage.createdAt).getTime() -
        new Date(a.latestMessage.createdAt).getTime()
    );

  return res.json(conversations);
});

router.get("/messages/conversation", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = GetConversationQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { otherId } = parsed.data;
  const meId = currentRunner.id;

  if (meId === otherId) {
    return res.status(400).json({ error: "Cannot open a conversation with yourself" });
  }
  if (await areRunnersBlocked(meId, otherId)) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(
          eq(messagesTable.fromRunnerId, meId),
          eq(messagesTable.toRunnerId, otherId)
        ),
        and(
          eq(messagesTable.fromRunnerId, otherId),
          eq(messagesTable.toRunnerId, meId)
        )
      )
    )
    .orderBy(messagesTable.createdAt);

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.fromRunnerId, otherId),
        eq(messagesTable.toRunnerId, meId),
        eq(messagesTable.isRead, false)
      )
    );

  return res.json(msgs);
});

router.get("/messages/unread-count", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const runnerId = currentRunner.id;
  const hiddenRunnerIds = await getHiddenRunnerIds(runnerId);
  const unreadConditions = [
    eq(messagesTable.toRunnerId, runnerId),
    eq(messagesTable.isRead, false),
  ];
  if (hiddenRunnerIds.length > 0) {
    unreadConditions.push(notInArray(messagesTable.fromRunnerId, hiddenRunnerIds));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(
      and(...unreadConditions)
    );

  return res.json({ count: row?.count ?? 0 });
});

router.get("/messages/events", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendUnreadCountUpdate = () => {
    if (res.destroyed || res.writableEnded) return;
    res.write("event: unread-count\ndata: {}\n\n");
  };
  const unsubscribe = await subscribeToUnreadCountUpdates(
    currentRunner.id,
    sendUnreadCountUpdate,
  );
  const heartbeat = setInterval(() => {
    if (res.destroyed || res.writableEnded) return;
    res.write(": keep-alive\n\n");
  }, 25_000);
  let isClosed = false;
  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(heartbeat);
    unsubscribe();
  };

  res.once("close", cleanup);
  req.once("aborted", cleanup);
  res.flushHeaders();
  res.write(": connected\n\n");
});

router.post("/messages", sendMessageRateLimit, async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { toRunnerId, content } = parsed.data;
  const fromRunnerId = currentRunner.id;

  if (fromRunnerId === toRunnerId) {
    return res.status(400).json({ error: "Cannot message yourself" });
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "fromRunnerId")) {
    return res.status(400).json({
      error: "fromRunnerId is derived from the authenticated session",
    });
  }

  const [target] = await db
    .select({ id: runnersTable.id })
    .from(runnersTable)
    .where(eq(runnersTable.id, toRunnerId));
  if (!target) {
    return res.status(404).json({ error: "Target runner not found" });
  }
  if (await areRunnersBlocked(fromRunnerId, toRunnerId)) {
    return res.status(404).json({ error: "Target runner not found" });
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ fromRunnerId, toRunnerId, content })
    .returning();

  await publishUnreadCountUpdate(toRunnerId);
  return res.status(201).json(msg);
});

export default router;

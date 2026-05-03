import { Router } from "express";
import { db, messagesTable, runnersTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import {
  GetInboxQueryParams,
  GetConversationQueryParams,
  GetUnreadCountQueryParams,
  SendMessageBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/messages/inbox", async (req, res) => {
  const parsed = GetInboxQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { runnerId } = parsed.data;

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        eq(messagesTable.fromRunnerId, runnerId),
        eq(messagesTable.toRunnerId, runnerId)
      )
    )
    .orderBy(desc(messagesTable.createdAt));

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
    .select()
    .from(runnersTable)
    .where(sql`${runnersTable.id} = ANY(${otherIds})`);

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
  const parsed = GetConversationQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { meId, otherId } = parsed.data;

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
  const parsed = GetUnreadCountQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { runnerId } = parsed.data;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.toRunnerId, runnerId),
        eq(messagesTable.isRead, false)
      )
    );

  return res.json({ count: row?.count ?? 0 });
});

router.post("/messages", async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { fromRunnerId, toRunnerId, content } = parsed.data;

  if (fromRunnerId === toRunnerId) {
    return res.status(400).json({ error: "Cannot message yourself" });
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ fromRunnerId, toRunnerId, content })
    .returning();

  return res.status(201).json(msg);
});

export default router;

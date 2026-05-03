import { Router } from "express";
import { db, runnersTable, connectionsTable } from "@workspace/db";
import {
  ListConnectionsQueryParams,
  CreateConnectionBody,
  UpdateConnectionParams,
  UpdateConnectionBody,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/connections", async (req, res) => {
  const parsed = ListConnectionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { runnerId, type, status } = parsed.data;

  const conditions = [
    eq(connectionsTable.fromRunnerId, runnerId),
  ];
  if (type) conditions.push(eq(connectionsTable.type, type));
  if (status) conditions.push(eq(connectionsTable.status, status));

  const rawConnections = await db
    .select()
    .from(connectionsTable)
    .where(and(...conditions));

  const runnerIds = [
    ...new Set(rawConnections.flatMap((c) => [c.fromRunnerId, c.toRunnerId])),
  ];

  const runners =
    runnerIds.length > 0
      ? await db.select().from(runnersTable)
      : [];

  const runnerMap = Object.fromEntries(runners.map((r) => [r.id, r]));

  const connections = rawConnections.map((c) => ({
    ...c,
    fromRunner: runnerMap[c.fromRunnerId] ?? null,
    toRunner: runnerMap[c.toRunnerId] ?? null,
  }));

  return res.json(connections);
});

router.post("/connections", async (req, res) => {
  const parsed = CreateConnectionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const [connection] = await db
    .insert(connectionsTable)
    .values(parsed.data)
    .returning();
  return res.status(201).json(connection);
});

router.put("/connections/:id", async (req, res) => {
  const paramsParsed = UpdateConnectionParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: paramsParsed.error.issues });
  }

  const bodyParsed = UpdateConnectionBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues });
  }

  const [updated] = await db
    .update(connectionsTable)
    .set(bodyParsed.data)
    .where(eq(connectionsTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Connection not found" });
  }
  return res.json(updated);
});

export default router;

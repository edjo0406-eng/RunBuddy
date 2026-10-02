import { Router } from "express";
import { db, runnersTable, connectionsTable } from "@workspace/db";
import {
  ListConnectionsQueryParams,
  CreateConnectionBody,
  UpdateConnectionParams,
  UpdateConnectionBody,
  DeleteConnectionParams,
} from "@workspace/api-zod";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  getAuthenticatedRunner,
  publicRunnerSelection,
  requireAuthentication,
  requireRunner,
} from "../lib/authorization";
import { createRateLimiter } from "../middlewares/rateLimit";
import { areRunnersBlocked, getHiddenRunnerIds } from "../lib/safety";

const router = Router();
const createConnectionRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
});

router.get("/connections", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = ListConnectionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { type, status } = parsed.data;

  const conditions = [
    or(
      eq(connectionsTable.fromRunnerId, currentRunner.id),
      eq(connectionsTable.toRunnerId, currentRunner.id),
    ),
  ];
  if (type) conditions.push(eq(connectionsTable.type, type));
  if (status) conditions.push(eq(connectionsTable.status, status));

  const allConnections = await db
    .select()
    .from(connectionsTable)
    .where(and(...conditions));
  const hiddenRunnerIds = new Set(await getHiddenRunnerIds(currentRunner.id));
  const rawConnections = allConnections.filter((connection) => {
    const otherRunnerId =
      connection.fromRunnerId === currentRunner.id
        ? connection.toRunnerId
        : connection.fromRunnerId;
    return !hiddenRunnerIds.has(otherRunnerId);
  });

  const runnerIds = [
    ...new Set(rawConnections.flatMap((c) => [c.fromRunnerId, c.toRunnerId])),
  ];

  const runners = runnerIds.length > 0
    ? await db
        .select(publicRunnerSelection)
        .from(runnersTable)
        .where(inArray(runnersTable.id, runnerIds))
    : [];

  const runnerMap = Object.fromEntries(runners.map((r) => [r.id, r]));

  const connections = rawConnections.map((c) => ({
    ...c,
    fromRunner: runnerMap[c.fromRunnerId] ?? null,
    toRunner: runnerMap[c.toRunnerId] ?? null,
  }));

  return res.json(connections);
});

router.post("/connections", createConnectionRateLimit, async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = CreateConnectionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "fromRunnerId")) {
    return res.status(400).json({
      error: "fromRunnerId is derived from the authenticated session",
    });
  }

  if (parsed.data.toRunnerId === currentRunner.id) {
    return res.status(400).json({ error: "Cannot connect to yourself" });
  }

  const [target] = await db
    .select({ id: runnersTable.id })
    .from(runnersTable)
    .where(eq(runnersTable.id, parsed.data.toRunnerId));
  if (!target) {
    return res.status(404).json({ error: "Target runner not found" });
  }
  if (await areRunnersBlocked(currentRunner.id, parsed.data.toRunnerId)) {
    return res.status(404).json({ error: "Target runner not found" });
  }

  const [connection] = await db
    .insert(connectionsTable)
    .values({ ...parsed.data, fromRunnerId: currentRunner.id })
    .returning();
  return res.status(201).json(connection);
});

router.put("/connections/:id", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const paramsParsed = UpdateConnectionParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: paramsParsed.error.issues });
  }

  const bodyParsed = UpdateConnectionBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues });
  }

  const [existing] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, paramsParsed.data.id));

  if (!existing) {
    return res.status(404).json({ error: "Connection not found" });
  }
  if (await areRunnersBlocked(existing.fromRunnerId, existing.toRunnerId)) {
    return res.status(404).json({ error: "Connection not found" });
  }
  if (existing.toRunnerId !== currentRunner.id) {
    return res.status(403).json({ error: "Only the recipient can update a connection" });
  }
  if (existing.status !== "pending") {
    return res.status(409).json({ error: "Connection is no longer pending" });
  }

  const [updated] = await db
    .update(connectionsTable)
    .set(bodyParsed.data)
    .where(
      and(
        eq(connectionsTable.id, paramsParsed.data.id),
        eq(connectionsTable.toRunnerId, currentRunner.id),
        eq(connectionsTable.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Connection not found" });
  }
  return res.json(updated);
});

router.delete("/connections/:id", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const paramsParsed = DeleteConnectionParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: paramsParsed.error.issues });
  }

  const [existing] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, paramsParsed.data.id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Connection not found" });
  if (
    existing.fromRunnerId !== currentRunner.id &&
    existing.toRunnerId !== currentRunner.id
  ) {
    return res.status(403).json({ error: "Only a connection participant can remove it" });
  }

  const [deleted] = await db
    .delete(connectionsTable)
    .where(
      and(
        eq(connectionsTable.id, paramsParsed.data.id),
        or(
          eq(connectionsTable.fromRunnerId, currentRunner.id),
          eq(connectionsTable.toRunnerId, currentRunner.id),
        ),
      ),
    )
    .returning({ id: connectionsTable.id });
  if (!deleted) return res.status(404).json({ error: "Connection not found" });
  return res.status(204).end();
});

export default router;

import { Router } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import {
  CreateRunnerBlockBody,
  CreateRunnerReportBody,
  DeleteRunnerBlockParams,
} from "@workspace/api-zod";
import {
  db,
  connectionsTable,
  runnerBlocksTable,
  runnerReportsTable,
  runnersTable,
} from "@workspace/db";
import {
  getAuthenticatedRunner,
  publicRunnerSelection,
  requireAuthentication,
  requireRunner,
} from "../lib/authorization";
import { createRateLimiter } from "../middlewares/rateLimit";

const router = Router();
const createBlockRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
});
const createReportRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
});

router.get("/runner-blocks", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const blocks = await db
    .select()
    .from(runnerBlocksTable)
    .where(eq(runnerBlocksTable.blockerRunnerId, currentRunner.id));
  if (blocks.length === 0) return res.json([]);

  const blockedRunnerIds = blocks.map((block) => block.blockedRunnerId);
  const runners = await db
    .select(publicRunnerSelection)
    .from(runnersTable)
    .where(inArray(runnersTable.id, blockedRunnerIds));
  const runnerMap = new Map(runners.map((runner) => [runner.id, runner]));

  return res.json(
    blocks.map((block) => ({
      ...block,
      blockedRunner: runnerMap.get(block.blockedRunnerId) ?? null,
    })),
  );
});

router.post("/runner-blocks", createBlockRateLimit, async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = CreateRunnerBlockBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "blockerRunnerId")) {
    return res.status(400).json({
      error: "blockerRunnerId is derived from the authenticated session",
    });
  }

  const { blockedRunnerId } = parsed.data;
  if (blockedRunnerId === currentRunner.id) {
    return res.status(400).json({ error: "Cannot block yourself" });
  }

  const [target] = await db
    .select(publicRunnerSelection)
    .from(runnersTable)
    .where(eq(runnersTable.id, blockedRunnerId))
    .limit(1);
  if (!target) return res.status(404).json({ error: "Runner not found" });

  await db.transaction(async (tx) => {
    await tx
      .insert(runnerBlocksTable)
      .values({
        blockerRunnerId: currentRunner.id,
        blockedRunnerId,
      })
      .onConflictDoNothing();
    await tx
      .delete(connectionsTable)
      .where(
        or(
          and(
            eq(connectionsTable.fromRunnerId, currentRunner.id),
            eq(connectionsTable.toRunnerId, blockedRunnerId),
          ),
          and(
            eq(connectionsTable.fromRunnerId, blockedRunnerId),
            eq(connectionsTable.toRunnerId, currentRunner.id),
          ),
        ),
      )
  });

  const [block] = await db
    .select()
    .from(runnerBlocksTable)
    .where(
      and(
        eq(runnerBlocksTable.blockerRunnerId, currentRunner.id),
        eq(runnerBlocksTable.blockedRunnerId, blockedRunnerId),
      ),
    )
    .limit(1);
  if (!block) {
    return res.status(500).json({ error: "Unable to save the block" });
  }

  return res.status(201).json({ ...block, blockedRunner: target });
});

router.delete("/runner-blocks/:runnerId", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = DeleteRunnerBlockParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (parsed.data.runnerId === currentRunner.id) {
    return res.status(400).json({ error: "Cannot unblock yourself" });
  }

  await db
    .delete(runnerBlocksTable)
    .where(
      and(
        eq(runnerBlocksTable.blockerRunnerId, currentRunner.id),
        eq(runnerBlocksTable.blockedRunnerId, parsed.data.runnerId),
      ),
    );
  return res.status(204).end();
});

router.post("/runner-reports", createReportRateLimit, async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const parsed = CreateRunnerReportBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "reporterRunnerId")) {
    return res.status(400).json({
      error: "reporterRunnerId is derived from the authenticated session",
    });
  }
  if (parsed.data.reportedRunnerId === currentRunner.id) {
    return res.status(400).json({ error: "Cannot report yourself" });
  }

  const [target] = await db
    .select({ id: runnersTable.id })
    .from(runnersTable)
    .where(eq(runnersTable.id, parsed.data.reportedRunnerId))
    .limit(1);
  if (!target) return res.status(404).json({ error: "Runner not found" });

  const [report] = await db
    .insert(runnerReportsTable)
    .values({
      reporterRunnerId: currentRunner.id,
      reportedRunnerId: parsed.data.reportedRunnerId,
      reason: parsed.data.reason,
      details: parsed.data.details?.trim() || null,
    })
    .returning({
      id: runnerReportsTable.id,
      status: runnerReportsTable.status,
      createdAt: runnerReportsTable.createdAt,
    });

  return res.status(201).json(report);
});

export default router;
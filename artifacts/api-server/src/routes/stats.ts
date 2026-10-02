import { Router } from "express";
import { db, runnersTable, connectionsTable } from "@workspace/db";
import { sql, desc, eq, notInArray } from "drizzle-orm";
import {
  getAuthenticatedRunner,
  getOptionalAuthenticatedRunner,
  getAuthenticatedUserId,
  publicRunnerSelection,
  discoverableRunnerSelection,
} from "../lib/authorization";
import { getHiddenRunnerIds } from "../lib/safety";

const router = Router();

router.get("/stats/summary", async (req, res) => {
  const [totals] = await db
    .select({
      totalRunners: sql<number>`count(*)::int`,
      dateRunners: sql<number>`count(*) filter (where looking_for = 'date')::int`,
      buddyRunners: sql<number>`count(*) filter (where looking_for = 'buddy')::int`,
      bothRunners: sql<number>`count(*) filter (where looking_for = 'both')::int`,
      countriesRepresented: sql<number>`count(distinct country)::int`,
    })
    .from(runnersTable);

  const [connTotals] = await db
    .select({ totalConnections: sql<number>`count(*)::int` })
    .from(connectionsTable);

  return res.json({
    totalRunners: totals.totalRunners ?? 0,
    dateRunners: totals.dateRunners ?? 0,
    buddyRunners: totals.buddyRunners ?? 0,
    bothRunners: totals.bothRunners ?? 0,
    countriesRepresented: totals.countriesRepresented ?? 0,
    totalConnections: connTotals.totalConnections ?? 0,
  });
});

router.get("/stats/countries", async (req, res) => {
  const results = await db
    .select({
      country: runnersTable.country,
      count: sql<number>`count(*)::int`,
    })
    .from(runnersTable)
    .groupBy(runnersTable.country)
    .orderBy(sql`count(*) desc`);

  return res.json(
    results
      .filter((r) => r.country)
      .map((r) => ({ country: r.country!, count: r.count }))
  );
});

router.get("/stats/featured", async (req, res) => {
  const currentRunner = await getOptionalAuthenticatedRunner(req);
  const signedIn = Boolean(getAuthenticatedUserId(req));
  if (signedIn) {
    const hiddenRunnerIds = currentRunner
      ? await getHiddenRunnerIds(currentRunner.id)
      : [];
    const runners = await db
      .select(publicRunnerSelection)
      .from(runnersTable)
      .where(hiddenRunnerIds.length ? notInArray(runnersTable.id, hiddenRunnerIds) : undefined)
      .orderBy(desc(runnersTable.createdAt))
      .limit(12);
    return res.json(runners);
  }

  const runners = await db
    .select(discoverableRunnerSelection)
    .from(runnersTable)
    .where(eq(runnersTable.publicListing, true))
    .orderBy(desc(runnersTable.createdAt))
    .limit(12);

  return res.json(runners);
});

export default router;

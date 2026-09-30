import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, runnersTable } from "@workspace/db";
import {
  ListRunnersQueryParams,
  CreateRunnerBody,
  GetRunnerParams,
  UpdateRunnerBody,
  UpdateRunnerParams,
} from "@workspace/api-zod";
import { eq, and, or, sql, desc } from "drizzle-orm";
import {
  getAuthenticatedRunner,
  publicRunnerSelection,
  discoverableRunnerSelection,
  requireAuthentication,
  requireRunner,
} from "../lib/authorization";
import { createRateLimiter } from "../middlewares/rateLimit";

const router = Router();
const listRunnersRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});
const createRunnerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
});

router.get("/runners", listRunnersRateLimit, async (req, res) => {
  const signedIn = Boolean(getAuth(req).userId);

  const parsed = ListRunnersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { mode, country, city, experience } = parsed.data;

  const conditions = [];
  if (!signedIn) conditions.push(eq(runnersTable.publicListing, true));
  if (mode && mode !== "both") {
    conditions.push(
      or(eq(runnersTable.lookingFor, mode), eq(runnersTable.lookingFor, "both"))
    );
  }
  if (country) {
    conditions.push(signedIn
      ? or(
          sql`lower(${runnersTable.country}) = lower(${country})`,
          sql`lower(${runnersTable.travelCountry}) = lower(${country})`
        )
      : sql`lower(${runnersTable.country}) = lower(${country})`);
  }
  if (city) {
    conditions.push(signedIn
      ? or(
          sql`lower(${runnersTable.city}) = lower(${city})`,
          sql`lower(${runnersTable.travelCity}) = lower(${city})`
        )
      : sql`lower(${runnersTable.city}) = lower(${city})`);
  }
  if (experience) {
    conditions.push(eq(runnersTable.experience, experience));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const runners = signedIn
    ? await db.select(publicRunnerSelection).from(runnersTable).where(where).orderBy(desc(runnersTable.createdAt)).limit(100)
    : await db.select(discoverableRunnerSelection).from(runnersTable).where(where).orderBy(desc(runnersTable.createdAt)).limit(100);

  return res.json(runners);
});

router.post("/runners", createRunnerRateLimit, async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const existingRunner = await getAuthenticatedRunner(req);
  if (existingRunner) {
    return res.status(409).json({ error: "A runner profile already exists for this account" });
  }

  const parsed = CreateRunnerBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const trackingApps = parsed.data.trackingApps;
  const hasTrackingApp = trackingApps
    ? Object.values(trackingApps).some((value) =>
        typeof value === "string" ? value.trim().length > 0 : value === true
      )
    : false;
  if (!hasTrackingApp) {
    return res.status(400).json({
      error: [{ path: ["trackingApps"], message: "At least one tracking app is required" }],
    });
  }

  if (parsed.data.profileType !== "individual" && !parsed.data.clubName?.trim()) {
    return res.status(400).json({
      error: [{ path: ["clubName"], message: "Club name is required for club profiles" }],
    });
  }

  if (parsed.data.profileType === "official_club" && !parsed.data.clubAssociation?.trim()) {
    return res.status(400).json({
      error: [{ path: ["clubAssociation"], message: "Official clubs must name their registered athletics association" }],
    });
  }

  const [runner] = await db
    .insert(runnersTable)
    .values({ ...parsed.data, authUserId: req.dbUser!.id })
    .returning();
  return res.status(201).json(runner);
});

router.get("/runners/me", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  const response = { runnerId: currentRunner?.id ?? null };
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res.type("application/json").end(JSON.stringify(response));
});

router.get("/runners/:id", async (req, res) => {
  const parsed = GetRunnerParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const signedIn = Boolean(getAuth(req).userId);
  const where = signedIn
    ? eq(runnersTable.id, parsed.data.id)
    : and(eq(runnersTable.id, parsed.data.id), eq(runnersTable.publicListing, true));
  const [runner] = signedIn
    ? await db.select(publicRunnerSelection).from(runnersTable).where(where)
    : await db.select(discoverableRunnerSelection).from(runnersTable).where(where);
  if (!runner) {
    return res.status(404).json({ error: "Runner not found" });
  }
  return res.json(runner);
});

router.put("/runners/:id", async (req, res) => {
  if (!(await requireAuthentication(req, res))) return;
  const currentRunner = await getAuthenticatedRunner(req);
  if (!requireRunner(currentRunner, res)) return;

  const paramsParsed = UpdateRunnerParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: paramsParsed.error.issues });
  }

  const bodyParsed = UpdateRunnerBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues });
  }

  if (currentRunner.id !== paramsParsed.data.id) {
    return res.status(403).json({ error: "You can only update your own runner profile" });
  }

  const [updated] = await db
    .update(runnersTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(runnersTable.id, paramsParsed.data.id),
        eq(runnersTable.authUserId, req.dbUser!.id),
      ),
    )
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Runner not found" });
  }
  return res.json(updated);
});

export default router;

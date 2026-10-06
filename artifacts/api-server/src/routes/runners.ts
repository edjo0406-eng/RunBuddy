import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  connectionsTable,
  messagesTable,
  runnersTable,
  usersTable,
} from "@workspace/db";
import {
  ListRunnersQueryParams,
  CreateRunnerBody,
  GetRunnerParams,
  UpdateRunnerBody,
  UpdateRunnerParams,
} from "@workspace/api-zod";
import { eq, and, or, sql, desc, notInArray } from "drizzle-orm";
import {
  getAuthenticatedRunner,
  getAuthenticatedUserId,
  publicRunnerSelection,
  discoverableRunnerSelection,
  getOptionalAuthenticatedRunner,
  requireAuthentication,
  requireRunner,
} from "../lib/authorization";
import { createRateLimiter } from "../middlewares/rateLimit";
import { ObjectStorageService } from "../lib/objectStorage";
import { getHiddenRunnerIds } from "../lib/safety";

const router = Router();
const objectStorageService = new ObjectStorageService();
const listRunnersRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});
const createRunnerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
});

function getOwnedAvatarObjectPath(
  avatarUrl: string | null | undefined,
  runnerId: number,
): string | null {
  if (!avatarUrl) return null;
  const pathname = avatarUrl.split("?")[0];
  const storagePrefix = "/api/storage";
  if (!pathname.startsWith(`${storagePrefix}/objects/`)) return null;

  const objectPath = pathname.slice(storagePrefix.length);
  const ownedAvatarPattern = new RegExp(
    `^/objects/uploads/avatars/${runnerId}/[0-9a-f-]{36}$`,
  );
  return ownedAvatarPattern.test(objectPath) ? objectPath : null;
}

router.get("/runners", listRunnersRateLimit, async (req, res) => {
  const signedIn = Boolean(getAuthenticatedUserId(req));
  const currentRunner = await getOptionalAuthenticatedRunner(req);

  const parsed = ListRunnersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { mode, country, city, experience } = parsed.data;

  const conditions = [];
  conditions.push(eq(runnersTable.publicListing, true));
  if (currentRunner) {
    const hiddenRunnerIds = await getHiddenRunnerIds(currentRunner.id);
    if (hiddenRunnerIds.length > 0) {
      conditions.push(notInArray(runnersTable.id, hiddenRunnerIds));
    }
  }
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

router.delete("/runners/me", async (req, res) => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "A Clerk account is required to delete this account" });
  }

  const localUser = await requireAuthentication(req, res);
  if (!localUser) return;

  const currentRunner = await getAuthenticatedRunner(req);

  try {
    await db.transaction(async (tx) => {
      if (currentRunner) {
        await tx
          .delete(messagesTable)
          .where(
            or(
              eq(messagesTable.fromRunnerId, currentRunner.id),
              eq(messagesTable.toRunnerId, currentRunner.id),
            ),
          );
        await tx
          .delete(connectionsTable)
          .where(
            or(
              eq(connectionsTable.fromRunnerId, currentRunner.id),
              eq(connectionsTable.toRunnerId, currentRunner.id),
            ),
          );
        await tx
          .delete(runnersTable)
          .where(
            and(
              eq(runnersTable.id, currentRunner.id),
              eq(runnersTable.authUserId, localUser.id),
            ),
          );
      }

      await tx.delete(usersTable).where(eq(usersTable.id, localUser.id));
      await clerkClient.users.deleteUser(clerkUserId);
    });

    const oldAvatarObjectPath = currentRunner
      ? getOwnedAvatarObjectPath(currentRunner.avatarUrl, currentRunner.id)
      : null;
    if (oldAvatarObjectPath) {
      try {
        await objectStorageService.deleteObjectEntity(oldAvatarObjectPath);
      } catch (error) {
        req.log.warn({ err: error }, "Profile photo cleanup failed after account deletion");
      }
    }

    return res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "RunBuddy account deletion failed");
    return res.status(500).json({ error: "Account deletion failed" });
  }
});

router.get("/runners/:id", async (req, res) => {
  const parsed = GetRunnerParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const signedIn = Boolean(getAuthenticatedUserId(req));
  const currentRunner = await getOptionalAuthenticatedRunner(req);
  const isOwner = currentRunner?.id === parsed.data.id;
  if (
    currentRunner &&
    (await getHiddenRunnerIds(currentRunner.id)).includes(parsed.data.id)
  ) {
    return res.status(404).json({ error: "Runner not found" });
  }
  const where = isOwner
    ? eq(runnersTable.id, parsed.data.id)
    : and(
        eq(runnersTable.id, parsed.data.id),
        eq(runnersTable.publicListing, true),
      );
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

  const oldAvatarObjectPath = getOwnedAvatarObjectPath(
    currentRunner.avatarUrl,
    currentRunner.id,
  );
  const newAvatarObjectPath = getOwnedAvatarObjectPath(
    updated.avatarUrl,
    updated.id,
  );
  if (oldAvatarObjectPath && oldAvatarObjectPath !== newAvatarObjectPath) {
    try {
      await objectStorageService.deleteObjectEntity(oldAvatarObjectPath);
    } catch (error) {
      req.log.warn({ err: error }, "Previous profile photo cleanup failed");
    }
  }

  return res.json(updated);
});

export default router;

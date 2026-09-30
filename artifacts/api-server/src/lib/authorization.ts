import { getAuth } from "@clerk/express";
import { db, runnersTable, usersTable, type Runner } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

type LocalUser = typeof usersTable.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      dbUser?: LocalUser;
    }
  }
}

export const publicRunnerSelection = {
  id: runnersTable.id,
  publicListing: runnersTable.publicListing,
  name: runnersTable.name,
  age: runnersTable.age,
  bio: runnersTable.bio,
  avatarUrl: runnersTable.avatarUrl,
  city: runnersTable.city,
  country: runnersTable.country,
  gender: runnersTable.gender,
  profileType: runnersTable.profileType,
  clubName: runnersTable.clubName,
  clubDescription: runnersTable.clubDescription,
  clubAssociation: runnersTable.clubAssociation,
  lookingFor: runnersTable.lookingFor,
  experience: runnersTable.experience,
  runningStats: runnersTable.runningStats,
  travelCity: runnersTable.travelCity,
  travelCountry: runnersTable.travelCountry,
  travelUntil: runnersTable.travelUntil,
  travelNote: runnersTable.travelNote,
  createdAt: runnersTable.createdAt,
  updatedAt: runnersTable.updatedAt,
};

// Do not reuse the authenticated selection for anonymous requests: even an
// opted-in runner's biography or travel details may contain contact information.
export const discoverableRunnerSelection = {
  id: runnersTable.id,
  name: runnersTable.name,
  city: runnersTable.city,
  country: runnersTable.country,
  profileType: runnersTable.profileType,
  clubName: runnersTable.clubName,
  lookingFor: runnersTable.lookingFor,
  experience: runnersTable.experience,
  createdAt: runnersTable.createdAt,
  updatedAt: runnersTable.updatedAt,
};

export async function getAuthenticatedRunner(
  req: Request,
): Promise<Runner | null> {
  if (!req.dbUser) return null;

  const [runner] = await db
    .select()
    .from(runnersTable)
    .where(eq(runnersTable.authUserId, req.dbUser.id))
    .limit(1);

  return runner ?? null;
}

export async function requireAuthentication(
  req: Request,
  res: Response,
): Promise<LocalUser | null> {
  const auth = getAuth(req);
  const sessionClaims = auth.sessionClaims as
    | { userId?: unknown }
    | null
    | undefined;
  const claimedUserId = sessionClaims?.userId;
  const userId =
    typeof claimedUserId === "string" ? claimedUserId : auth.userId;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  let [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!dbUser) {
    const [inserted] = await db
      .insert(usersTable)
      .values({ id: userId })
      .onConflictDoNothing()
      .returning();
    dbUser = inserted;

    if (!dbUser) {
      [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
    }
  }

  if (!dbUser) {
    req.log.error("Unable to provision the authenticated account");
    res.status(500).json({ error: "Unable to load your account" });
    return null;
  }

  req.dbUser = dbUser;
  return dbUser;
}

export function requireRunner(
  runner: Runner | null,
  res: Response,
): runner is Runner {
  if (!runner) {
    res.status(403).json({ error: "A runner profile is required" });
    return false;
  }
  return true;
}
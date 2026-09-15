import { db, runnersTable, type Runner } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

export const publicRunnerSelection = {
  id: runnersTable.id,
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

export async function getAuthenticatedRunner(
  req: Request,
): Promise<Runner | null> {
  if (!req.isAuthenticated()) return null;

  const [runner] = await db
    .select()
    .from(runnersTable)
    .where(eq(runnersTable.authUserId, req.user.id))
    .limit(1);

  return runner ?? null;
}

export function requireAuthentication(
  req: Request,
  res: Response,
): req is Request & { user: NonNullable<Request["user"]> } {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
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
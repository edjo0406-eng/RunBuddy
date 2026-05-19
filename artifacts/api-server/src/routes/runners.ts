import { Router } from "express";
import { db, runnersTable, connectionsTable } from "@workspace/db";
import {
  ListRunnersQueryParams,
  CreateRunnerBody,
  GetRunnerParams,
  UpdateRunnerBody,
  UpdateRunnerParams,
} from "@workspace/api-zod";
import { eq, and, or, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/runners", async (req, res) => {
  const parsed = ListRunnersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { mode, country, city, experience } = parsed.data;

  const conditions = [];
  if (mode && mode !== "both") {
    conditions.push(
      or(eq(runnersTable.lookingFor, mode), eq(runnersTable.lookingFor, "both"))
    );
  }
  if (country) {
    conditions.push(
      or(
        sql`lower(${runnersTable.country}) = lower(${country})`,
        sql`lower(${runnersTable.travelCountry}) = lower(${country})`
      )
    );
  }
  if (city) {
    conditions.push(
      or(
        sql`lower(${runnersTable.city}) = lower(${city})`,
        sql`lower(${runnersTable.travelCity}) = lower(${city})`
      )
    );
  }
  if (experience) {
    conditions.push(eq(runnersTable.experience, experience));
  }

  const runners = conditions.length > 0
    ? await db.select().from(runnersTable).where(and(...conditions)).orderBy(desc(runnersTable.createdAt))
    : await db.select().from(runnersTable).orderBy(desc(runnersTable.createdAt));

  return res.json(runners);
});

router.post("/runners", async (req, res) => {
  const parsed = CreateRunnerBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const [runner] = await db.insert(runnersTable).values(parsed.data).returning();
  return res.status(201).json(runner);
});

router.get("/runners/:id", async (req, res) => {
  const parsed = GetRunnerParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, parsed.data.id));
  if (!runner) {
    return res.status(404).json({ error: "Runner not found" });
  }
  return res.json(runner);
});

router.put("/runners/:id", async (req, res) => {
  const paramsParsed = UpdateRunnerParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: paramsParsed.error.issues });
  }

  const bodyParsed = UpdateRunnerBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues });
  }

  const [updated] = await db
    .update(runnersTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(eq(runnersTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Runner not found" });
  }
  return res.json(updated);
});

export default router;

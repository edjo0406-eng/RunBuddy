import { and, eq, or } from "drizzle-orm";
import { db, runnerBlocksTable } from "@workspace/db";

export async function getHiddenRunnerIds(runnerId: number): Promise<number[]> {
  const blocks = await db
    .select({
      blockerRunnerId: runnerBlocksTable.blockerRunnerId,
      blockedRunnerId: runnerBlocksTable.blockedRunnerId,
    })
    .from(runnerBlocksTable)
    .where(
      or(
        eq(runnerBlocksTable.blockerRunnerId, runnerId),
        eq(runnerBlocksTable.blockedRunnerId, runnerId),
      ),
    );

  return blocks.map((block) =>
    block.blockerRunnerId === runnerId
      ? block.blockedRunnerId
      : block.blockerRunnerId,
  );
}

export async function areRunnersBlocked(
  firstRunnerId: number,
  secondRunnerId: number,
): Promise<boolean> {
  const [block] = await db
    .select({ id: runnerBlocksTable.id })
    .from(runnerBlocksTable)
    .where(
      or(
        and(
          eq(runnerBlocksTable.blockerRunnerId, firstRunnerId),
          eq(runnerBlocksTable.blockedRunnerId, secondRunnerId),
        ),
        and(
          eq(runnerBlocksTable.blockerRunnerId, secondRunnerId),
          eq(runnerBlocksTable.blockedRunnerId, firstRunnerId),
        ),
      ),
    )
    .limit(1);

  return Boolean(block);
}
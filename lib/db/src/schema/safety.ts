import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { runnersTable } from "./runners";

export const runnerReportReasonEnum = pgEnum("runner_report_reason", [
  "spam",
  "harassment",
  "impersonation",
  "inappropriate_content",
  "unsafe_behavior",
  "other",
]);

export const runnerBlocksTable = pgTable(
  "runner_blocks",
  {
    id: serial("id").primaryKey(),
    blockerRunnerId: integer("blocker_runner_id")
      .notNull()
      .references(() => runnersTable.id, { onDelete: "cascade" }),
    blockedRunnerId: integer("blocked_runner_id")
      .notNull()
      .references(() => runnersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("runner_blocks_pair_unique").on(
      table.blockerRunnerId,
      table.blockedRunnerId,
    ),
    index("runner_blocks_blocked_idx").on(table.blockedRunnerId),
  ],
);

export const runnerReportsTable = pgTable(
  "runner_reports",
  {
    id: serial("id").primaryKey(),
    reporterRunnerId: integer("reporter_runner_id")
      .notNull()
      .references(() => runnersTable.id, { onDelete: "cascade" }),
    reportedRunnerId: integer("reported_runner_id")
      .notNull()
      .references(() => runnersTable.id, { onDelete: "cascade" }),
    reason: runnerReportReasonEnum("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("runner_reports_status_created_idx").on(table.status, table.createdAt),
    index("runner_reports_reported_idx").on(table.reportedRunnerId),
  ],
);

export const insertRunnerBlockSchema = createInsertSchema(runnerBlocksTable).omit({
  id: true,
  createdAt: true,
});
export const insertRunnerReportSchema = createInsertSchema(runnerReportsTable).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type RunnerBlock = typeof runnerBlocksTable.$inferSelect;
export type RunnerReport = typeof runnerReportsTable.$inferSelect;
export type InsertRunnerBlock = z.infer<typeof insertRunnerBlockSchema>;
export type InsertRunnerReport = z.infer<typeof insertRunnerReportSchema>;
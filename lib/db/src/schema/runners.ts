import { pgTable, serial, text, integer, real, boolean, jsonb, timestamp, pgEnum, index, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lookingForEnum = pgEnum("looking_for", ["date", "buddy", "both"]);
export const experienceEnum = pgEnum("experience", ["beginner", "intermediate", "advanced", "elite"]);
export const profileTypeEnum = pgEnum("profile_type", ["individual", "social_club", "official_club"]);
export const connectionTypeEnum = pgEnum("connection_type", ["date", "buddy"]);
export const connectionStatusEnum = pgEnum("connection_status", ["pending", "accepted", "declined"]);

export const runnersTable = pgTable("runners", {
  id: serial("id").primaryKey(),
  authUserId: varchar("auth_user_id").unique(),
  name: text("name").notNull(),
  age: integer("age"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  city: text("city"),
  country: text("country"),
  gender: text("gender"),
  profileType: profileTypeEnum("profile_type").notNull().default("individual"),
  clubName: text("club_name"),
  clubDescription: text("club_description"),
  clubWebsite: text("club_website"),
  clubSocialUrl: text("club_social_url"),
  clubAssociation: text("club_association"),
  lookingFor: lookingForEnum("looking_for").notNull().default("both"),
  experience: experienceEnum("experience"),
  trackingApps: jsonb("tracking_apps").$type<{
    stravaUrl?: string | null;
    garminUrl?: string | null;
    nikeRunClubUrl?: string | null;
    wahooPlan?: string | null;
    polarUrl?: string | null;
    suuntoUrl?: string | null;
    appleHealthConnected?: boolean | null;
    garminConnectUrl?: string | null;
  }>(),
  runningStats: jsonb("running_stats").$type<{
    weeklyMileageKm?: number | null;
    totalRaces?: number | null;
    personalBest5k?: string | null;
    personalBest10k?: string | null;
    personalBestHalfMarathon?: string | null;
    personalBestMarathon?: string | null;
    avgPacePerKm?: string | null;
    preferredRunTypes?: string[] | null;
  }>(),
  lat: real("lat"),
  lng: real("lng"),
  travelCity: text("travel_city"),
  travelCountry: text("travel_country"),
  travelUntil: text("travel_until"),
  travelNote: text("travel_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  fromRunnerId: integer("from_runner_id").notNull().references(() => runnersTable.id),
  toRunnerId: integer("to_runner_id").notNull().references(() => runnersTable.id),
  type: connectionTypeEnum("type").notNull(),
  status: connectionStatusEnum("status").notNull().default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromRunnerId: integer("from_runner_id").notNull().references(() => runnersTable.id),
  toRunnerId: integer("to_runner_id").notNull().references(() => runnersTable.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("msg_from_idx").on(t.fromRunnerId),
  index("msg_to_idx").on(t.toRunnerId),
]);

export const insertRunnerSchema = createInsertSchema(runnersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConnectionSchema = createInsertSchema(connectionsTable).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true, isRead: true });

export type InsertRunner = z.infer<typeof insertRunnerSchema>;
export type Runner = typeof runnersTable.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connectionsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

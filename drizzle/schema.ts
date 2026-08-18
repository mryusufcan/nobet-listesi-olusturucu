import { boolean, index, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  gender: mysqlEnum("gender", ["female", "male", "unspecified"]).default("unspecified").notNull(),
  active: boolean("active").default(true).notNull(),
  competencies: text("competencies").notNull(),
  historicalTotal: int("historicalTotal").default(0).notNull(),
  historicalMorning: int("historicalMorning").default(0).notNull(),
  historicalEvening: int("historicalEvening").default(0).notNull(),
  historicalNight: int("historicalNight").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("staff_owner_name_unique").on(table.userId, table.name)]);

export const unavailabilities = mysqlTable("unavailabilities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  staffId: int("staffId").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  type: mysqlEnum("type", ["leave", "report"]).default("leave").notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("unavailability_unique").on(table.userId, table.staffId, table.date)]);

export const staffConstraints = mysqlTable("staffConstraints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  staffId: int("staffId").notNull(),
  rule: mysqlEnum("rule", ["only_shift", "blocked_shift", "blocked_weekday", "blocked_device", "weekly_max"]).notNull(),
  value: varchar("value", { length: 80 }).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("staff_constraint_unique").on(table.userId, table.staffId, table.rule, table.value)]);

export const specialDays = mysqlTable("specialDays", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  morningSlots: int("morningSlots").notNull(),
  eveningSlots: int("eveningSlots").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("special_day_unique").on(table.userId, table.date)]);

export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  plan: mediumtext("plan").notNull(),
  validation: mediumtext("validation").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("schedule_owner_period_unique").on(table.userId, table.year, table.month)]);

export const scheduleVersions = mysqlTable("scheduleVersions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scheduleId: int("scheduleId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  plan: mediumtext("plan").notNull(),
  validation: mediumtext("validation").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("schedule_version_period_index").on(table.userId, table.year, table.month)]);

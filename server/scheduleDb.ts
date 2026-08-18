import { and, asc, eq } from "drizzle-orm";
import { schedules, staff, unavailabilities, type InsertUser } from "../drizzle/schema";
import type { Equipment, Gender, SchedulePlan, StaffForSchedule } from "../shared/scheduling";
import { getDb } from "./db";

type StaffRecordInput = {
  name: string;
  gender: Gender;
  active: boolean;
  competencies: Equipment[];
  historicalTotal?: number;
  historicalMorning?: number;
  historicalEvening?: number;
  historicalNight?: number;
};

function toScheduleStaff(row: typeof staff.$inferSelect): StaffForSchedule {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    active: row.active,
    competencies: JSON.parse(row.competencies) as Equipment[],
    historicalTotal: row.historicalTotal,
    historicalMorning: row.historicalMorning,
    historicalEvening: row.historicalEvening,
    historicalNight: row.historicalNight,
  };
}

export async function listStaff(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const rows = await db.select().from(staff).where(eq(staff.userId, userId)).orderBy(asc(staff.name));
  return rows.map(toScheduleStaff);
}

export async function upsertStaff(userId: number, input: StaffRecordInput & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const values = {
    name: input.name.trim(),
    gender: input.gender,
    active: input.active,
    competencies: JSON.stringify(input.competencies),
    historicalTotal: input.historicalTotal ?? 0,
    historicalMorning: input.historicalMorning ?? 0,
    historicalEvening: input.historicalEvening ?? 0,
    historicalNight: input.historicalNight ?? 0,
  };
  if (input.id) {
    await db.update(staff).set(values).where(and(eq(staff.id, input.id), eq(staff.userId, userId)));
    const result = await db.select().from(staff).where(eq(staff.id, input.id)).limit(1);
    return toScheduleStaff(result[0]);
  }
  const result = await db.insert(staff).values({ userId, ...values });
  const inserted = await db.select().from(staff).where(eq(staff.id, Number(result[0].insertId))).limit(1);
  return toScheduleStaff(inserted[0]);
}

export async function importStaffRecords(userId: number, records: StaffRecordInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  for (const record of records) {
    const values = {
      name: record.name.trim(),
      gender: record.gender,
      active: record.active,
      competencies: JSON.stringify(record.competencies),
      historicalTotal: record.historicalTotal ?? 0,
      historicalMorning: record.historicalMorning ?? 0,
      historicalEvening: record.historicalEvening ?? 0,
      historicalNight: record.historicalNight ?? 0,
    };
    await db.insert(staff).values({ userId, ...values }).onDuplicateKeyUpdate({ set: values });
  }
  return listStaff(userId);
}

export async function listUnavailabilities(userId: number, year?: number, month?: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const rows = await db.select().from(unavailabilities).where(eq(unavailabilities.userId, userId)).orderBy(asc(unavailabilities.date));
  const prefix = year && month ? `${year}-${String(month).padStart(2, "0")}` : undefined;
  return rows.filter(row => !prefix || row.date.startsWith(prefix));
}

export async function upsertUnavailability(userId: number, input: { staffId: number; date: string; type: "leave" | "report"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(unavailabilities).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { type: input.type, note: input.note ?? null } });
}

export async function deleteUnavailability(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.delete(unavailabilities).where(and(eq(unavailabilities.id, id), eq(unavailabilities.userId, userId)));
}

export async function getSchedule(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const rows = await db.select().from(schedules).where(and(eq(schedules.userId, userId), eq(schedules.year, year), eq(schedules.month, month))).limit(1);
  if (!rows[0]) return null;
  return { ...rows[0], plan: JSON.parse(rows[0].plan) as SchedulePlan, validation: JSON.parse(rows[0].validation) };
}

export async function saveSchedule(userId: number, plan: SchedulePlan) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const values = {
    name: `${plan.year} / ${String(plan.month).padStart(2, "0")} Nöbet Listesi`,
    plan: JSON.stringify(plan),
    validation: JSON.stringify(plan.issues),
  };
  await db.insert(schedules).values({ userId, year: plan.year, month: plan.month, ...values }).onDuplicateKeyUpdate({ set: values });
  return getSchedule(userId, plan.year, plan.month);
}

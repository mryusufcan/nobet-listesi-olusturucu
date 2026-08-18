import { and, asc, eq, isNull } from "drizzle-orm";
import { schedules, staff, staffConstraints, unavailabilities } from "../drizzle/schema";
import type { ConstraintRule, Equipment, Gender, PersonalConstraint, SchedulePlan, StaffForSchedule } from "../shared/scheduling";
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

export async function listStaff(userId: number, includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const rows = await db.select().from(staff).where(includeArchived ? eq(staff.userId, userId) : and(eq(staff.userId, userId), isNull(staff.deletedAt))).orderBy(asc(staff.name));
  const constraints = await listConstraints(userId);
  return rows.map(row => ({ ...toScheduleStaff(row), constraints: constraints.filter(item => item.staffId === row.id) }));
}

export async function listConstraints(userId: number, staffId?: number): Promise<PersonalConstraint[]> {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const rows = await db.select().from(staffConstraints).where(staffId ? and(eq(staffConstraints.userId, userId), eq(staffConstraints.staffId, staffId)) : eq(staffConstraints.userId, userId)).orderBy(asc(staffConstraints.id));
  return rows.map(row => ({ id: row.id, staffId: row.staffId, rule: row.rule as ConstraintRule, value: row.value, note: row.note }));
}

export async function upsertConstraint(userId: number, input: Omit<PersonalConstraint, "id"> & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const values = { staffId: input.staffId, rule: input.rule, value: input.value, note: input.note ?? null };
  if (input.id) {
    await db.update(staffConstraints).set(values).where(and(eq(staffConstraints.id, input.id), eq(staffConstraints.userId, userId)));
    return;
  }
  await db.insert(staffConstraints).values({ userId, ...values }).onDuplicateKeyUpdate({ set: { note: values.note } });
}

export async function deleteConstraint(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.delete(staffConstraints).where(and(eq(staffConstraints.id, id), eq(staffConstraints.userId, userId)));
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
    deletedAt: null,
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
      deletedAt: null,
    };
    await db.insert(staff).values({ userId, ...values }).onDuplicateKeyUpdate({ set: values });
  }
  return listStaff(userId);
}

function planUsesStaff(plan: SchedulePlan, staffId: number) {
  return plan.days.some(day =>
    Object.values(day.morning).some(value => value === staffId) ||
    day.evening.some(value => value === staffId) ||
    day.night === staffId,
  );
}

export async function deleteStaff(userId: number, staffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const ownerSchedules = await db.select({ plan: schedules.plan }).from(schedules).where(eq(schedules.userId, userId));
  const isUsedInHistory = ownerSchedules.some(record => planUsesStaff(JSON.parse(record.plan) as SchedulePlan, staffId));
  await db.delete(unavailabilities).where(and(eq(unavailabilities.userId, userId), eq(unavailabilities.staffId, staffId)));
  await db.delete(staffConstraints).where(and(eq(staffConstraints.userId, userId), eq(staffConstraints.staffId, staffId)));
  if (isUsedInHistory) {
    await db.update(staff).set({ active: false, deletedAt: new Date() }).where(and(eq(staff.userId, userId), eq(staff.id, staffId)));
    return;
  }
  await db.delete(staff).where(and(eq(staff.userId, userId), eq(staff.id, staffId)));
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

export async function listScheduleHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const rows = await db.select().from(schedules).where(eq(schedules.userId, userId)).orderBy(asc(schedules.year), asc(schedules.month));
  return rows.map(row => ({ ...row, plan: JSON.parse(row.plan) as SchedulePlan }));
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

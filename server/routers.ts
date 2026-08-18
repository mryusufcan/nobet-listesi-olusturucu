import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { EQUIPMENT, generateSchedule, planStatistics, type SchedulePlan, validateSchedule } from "../shared/scheduling";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { exportScheduleToExcel } from "./scheduleExport";
import { deleteConstraint, deleteSpecialDay, deleteStaff, deleteUnavailability, getSchedule, importStaffRecords, listConstraints, listScheduleHistory, listScheduleVersions, listSpecialDays, listStaff, listUnavailabilities, restoreScheduleVersion, saveSchedule, upsertConstraint, upsertSpecialDay, upsertStaff, upsertUnavailability } from "./scheduleDb";

const equipmentSchema = z.enum(EQUIPMENT);
const personSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(120),
  gender: z.enum(["female", "male", "unspecified"]),
  active: z.boolean(),
  competencies: z.array(equipmentSchema).min(1),
  historicalTotal: z.number().int().min(0).optional(),
  historicalMorning: z.number().int().min(0).optional(),
  historicalEvening: z.number().int().min(0).optional(),
  historicalNight: z.number().int().min(0).optional(),
});

const periodSchema = z.object({ year: z.number().int().min(2025).max(2100), month: z.number().int().min(1).max(12) });
const constraintSchema = z.object({
  id: z.number().int().positive().optional(),
  staffId: z.number().int().positive(),
  rule: z.enum(["only_shift", "blocked_shift", "blocked_weekday", "blocked_device", "weekly_max"]),
  value: z.string().min(1).max(80),
  note: z.string().trim().max(255).optional(),
});
const specialDaySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().trim().min(2).max(120), morningSlots: z.number().int().min(1).max(4), eveningSlots: z.number().int().min(1).max(2) });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  schedule: router({
    staff: protectedProcedure.query(({ ctx }) => listStaff(ctx.user.id)),
    upsertStaff: protectedProcedure.input(personSchema).mutation(({ ctx, input }) => upsertStaff(ctx.user.id, input)),
    deleteStaff: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteStaff(ctx.user.id, input.id);
      return { success: true };
    }),
    importStaff: protectedProcedure.input(z.object({ records: z.array(personSchema.omit({ id: true })).min(1).max(200) })).mutation(({ ctx, input }) => importStaffRecords(ctx.user.id, input.records)),
    constraints: protectedProcedure.input(z.object({ staffId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => listConstraints(ctx.user.id, input?.staffId)),
    upsertConstraint: protectedProcedure.input(constraintSchema).mutation(({ ctx, input }) => upsertConstraint(ctx.user.id, input)),
    deleteConstraint: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteConstraint(ctx.user.id, input.id)),
    unavailabilities: protectedProcedure.input(periodSchema.optional()).query(({ ctx, input }) => listUnavailabilities(ctx.user.id, input?.year, input?.month)),
    upsertUnavailability: protectedProcedure.input(z.object({ staffId: z.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), type: z.enum(["leave", "report"]), note: z.string().trim().max(255).optional() })).mutation(({ ctx, input }) => upsertUnavailability(ctx.user.id, input)),
    deleteUnavailability: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteUnavailability(ctx.user.id, input.id)),
    specialDays: protectedProcedure.input(periodSchema.optional()).query(({ ctx, input }) => listSpecialDays(ctx.user.id, input?.year, input?.month)),
    upsertSpecialDay: protectedProcedure.input(specialDaySchema).mutation(async ({ ctx, input }) => { await upsertSpecialDay(ctx.user.id, input); return { success: true }; }),
    deleteSpecialDay: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await deleteSpecialDay(ctx.user.id, input.id); return { success: true }; }),
    get: protectedProcedure.input(periodSchema).query(({ ctx, input }) => getSchedule(ctx.user.id, input.year, input.month)),
    history: protectedProcedure.query(async ({ ctx }) => {
      const [history, people] = await Promise.all([listScheduleHistory(ctx.user.id), listStaff(ctx.user.id, true)]);
      return history.map(item => ({ id: item.id, year: item.year, month: item.month, createdAt: item.createdAt, statistics: planStatistics(item.plan, people) }));
    }),
    versions: protectedProcedure.input(periodSchema).query(({ ctx, input }) => listScheduleVersions(ctx.user.id, input.year, input.month)),
    restoreVersion: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => restoreScheduleVersion(ctx.user.id, input.id)),
    generate: protectedProcedure.input(periodSchema).mutation(async ({ ctx, input }) => {
      const [people, unavailable, specialDays] = await Promise.all([listStaff(ctx.user.id), listUnavailabilities(ctx.user.id, input.year, input.month), listSpecialDays(ctx.user.id, input.year, input.month)]);
      const plan = generateSchedule({ year: input.year, month: input.month, staff: people, unavailable: unavailable.map(item => ({ staffId: item.staffId, date: item.date })), specialDays });
      return { plan };
    }),
    complete: protectedProcedure.input(z.object({ plan: z.custom<SchedulePlan>() })).mutation(async ({ ctx, input }) => {
      const [people, unavailable, specialDays] = await Promise.all([listStaff(ctx.user.id), listUnavailabilities(ctx.user.id, input.plan.year, input.plan.month), listSpecialDays(ctx.user.id, input.plan.year, input.plan.month)]);
      const plan = generateSchedule({ year: input.plan.year, month: input.plan.month, staff: people, unavailable: unavailable.map(item => ({ staffId: item.staffId, date: item.date })), specialDays, lockedPlan: input.plan });
      return { plan };
    }),
    save: protectedProcedure.input(z.object({ plan: z.custom<SchedulePlan>() })).mutation(async ({ ctx, input }) => {
      const [people, unavailable, specialDays] = await Promise.all([listStaff(ctx.user.id), listUnavailabilities(ctx.user.id, input.plan.year, input.plan.month), listSpecialDays(ctx.user.id, input.plan.year, input.plan.month)]);
      const plan = { ...input.plan, issues: validateSchedule(input.plan, people, unavailable.map(item => ({ staffId: item.staffId, date: item.date })), specialDays) };
      return saveSchedule(ctx.user.id, plan);
    }),
    export: protectedProcedure.input(periodSchema).mutation(async ({ ctx, input }) => {
      const [saved, people] = await Promise.all([getSchedule(ctx.user.id, input.year, input.month), listStaff(ctx.user.id)]);
      if (!saved) throw new Error("Dışa aktarılacak kayıtlı bir çizelge bulunamadı.");
      if (saved.plan.issues.some(issue => issue.level === "error")) throw new Error("Kritik kural ihlalleri bulunan çizelge Excel'e aktarılamaz.");
      return exportScheduleToExcel(ctx.user.id, saved.plan, people);
    }),
  }),
});

export type AppRouter = typeof appRouter;

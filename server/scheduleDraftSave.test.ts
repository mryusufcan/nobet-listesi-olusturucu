import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { generateSchedule, type StaffForSchedule } from "../shared/scheduling";

const db = vi.hoisted(() => ({
  deleteConstraint: vi.fn(), deleteSpecialDay: vi.fn(), deleteStaff: vi.fn(), deleteUnavailability: vi.fn(),
  getSchedule: vi.fn(), importStaffRecords: vi.fn(), listConstraints: vi.fn(), listScheduleHistory: vi.fn(),
  listSpecialDays: vi.fn(), listStaff: vi.fn(), listUnavailabilities: vi.fn(), saveSchedule: vi.fn(),
  upsertConstraint: vi.fn(), upsertSpecialDay: vi.fn(), upsertStaff: vi.fn(), upsertUnavailability: vi.fn(),
}));

vi.mock("./scheduleDb", () => db);

const { appRouter } = await import("./routers");

const staff: StaffForSchedule[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Personel ${index + 1}`,
  gender: index < 4 ? "female" : "male",
  active: true,
  competencies: ["MR", "BT", "RÖNT-PORT", "RÖNTGEN", "RÖNT-MAMO"],
}));

function context(): TrpcContext {
  return {
    user: { id: 1, openId: "planner", email: null, name: "Planlayıcı", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("schedule generate ve save", () => {
  it("liste oluşturma sırasında mevcut kaydı değiştirmeden bir taslak döndürür", async () => {
    db.listStaff.mockResolvedValue(staff);
    db.listUnavailabilities.mockResolvedValue([]);
    db.listSpecialDays.mockResolvedValue([]);
    db.saveSchedule.mockClear();
    const result = await appRouter.createCaller(context()).schedule.generate({ year: 2026, month: 8 });
    expect(result.plan.days).toHaveLength(31);
    expect(db.saveSchedule).not.toHaveBeenCalled();
  });

  it("kritik doğrulama notları bulunan taslağı hata fırlatmadan kaydeder", async () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff, unavailable: [] });
    plan.days[0].night = null;
    db.listStaff.mockResolvedValue(staff);
    db.listUnavailabilities.mockResolvedValue([]);
    db.listSpecialDays.mockResolvedValue([]);
    db.saveSchedule.mockImplementation(async (_userId: number, savedPlan: unknown) => ({ plan: savedPlan }));
    const result = await appRouter.createCaller(context()).schedule.save({ plan });
    expect(result.plan.issues.some(issue => issue.level === "error" && issue.message.includes("Gece vardiyasına"))).toBe(true);
    expect(db.saveSchedule).toHaveBeenCalledWith(1, expect.objectContaining({ year: 2026, month: 8 }));
  });
});

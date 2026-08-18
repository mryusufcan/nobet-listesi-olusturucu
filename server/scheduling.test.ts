import { describe, expect, it } from "vitest";
import { generateSchedule, validateSchedule, type StaffForSchedule } from "../shared/scheduling";

const people: StaffForSchedule[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Personel ${index + 1}`,
  active: true,
  gender: index < 4 ? "female" : "male",
  competencies: ["MR", "BT", "RÖNT-PORT", "RÖNTGEN", "RÖNT-MAMO"],
}));

describe("nöbet algoritması", () => {
  it("gece nöbeti sonrasında personeli ertesi gün dinlendirir", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    const firstNight = plan.days[0].night;
    const nextDay = plan.days[1];
    expect([...
      Object.values(nextDay.morning),
      ...nextDay.evening,
      nextDay.night,
    ]).not.toContain(firstNight);
  });

  it("izinli personeli ilgili güne atamaz", () => {
    const unavailable = [{ staffId: 1, date: "2026-08-05" }];
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable });
    const values = plan.days.find(day => day.date === "2026-08-05");
    expect([...Object.values(values!.morning), ...values!.evening, values!.night]).not.toContain(1);
  });

  it("oluşturulan listeyi zorunlu kural hatası olmadan doğrular", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    const issues = validateSchedule(plan, people, []);
    expect(issues.filter(issue => issue.level === "error")).toHaveLength(0);
  });

  it("eksik manuel atamayı kritik kural ihlali olarak bildirir", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    plan.days[0].night = null;
    const issues = validateSchedule(plan, people, []);
    expect(issues.some(issue => issue.level === "error" && issue.message.includes("Gece vardiyasına"))).toBe(true);
  });
});

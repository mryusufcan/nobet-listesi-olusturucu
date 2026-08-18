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

  it("akşam vardiyası sonrası personeli ertesi gün sabah vardiyasına atamaz", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    const firstEvening = plan.days[0].evening.filter((value): value is number => value !== null);
    const nextMorning = Array.from(new Set(Object.values(plan.days[1].morning).filter((value): value is number => value !== null)));
    firstEvening.forEach(id => expect(nextMorning).not.toContain(id));
  });

  it("Pazar gününde tek kişi sabah tüm cihazları, akşam vardiyasını ise tek başına kapsar", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    const sunday = plan.days.find(day => day.weekday === 0)!;
    expect(sunday.morning.MR).not.toBeNull();
    expect(sunday.morning.BT).toBeNull();
    expect(sunday.morning["RÖNT-MAMO"]).toBeNull();
    expect(sunday.evening.filter(value => value !== null)).toHaveLength(1);
  });

  it("Mamografi cihazına yalnızca kadın personel atar", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    plan.days.filter(day => day.weekday !== 0).forEach(day => {
      const assigned = people.find(person => person.id === day.morning["RÖNT-MAMO"]);
      expect(assigned?.gender).toBe("female");
    });
  });

  it("aynı personelin aynı gün birden fazla vardiyaya yazılmasını hata olarak bildirir", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    plan.days[0].evening[0] = plan.days[0].morning.MR;
    const issues = validateSchedule(plan, people, []);
    expect(issues.some(issue => issue.level === "error" && issue.message.includes("birden fazla vardiyaya"))).toBe(true);
  });

  it("erkek personelin Mamografi cihazına elle atanmasını hata olarak bildirir", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    plan.days[0].morning["RÖNT-MAMO"] = 6;
    const issues = validateSchedule(plan, people, []);
    expect(issues.some(issue => issue.level === "error" && issue.message.includes("Mamografi cihazına atanamaz"))).toBe(true);
  });

  it("kişiye özel engellenen vardiya kısıtını uygular", () => {
    const constrained = people.map(person => person.id === 1 ? { ...person, constraints: [{ staffId: 1, rule: "blocked_shift" as const, value: "evening" }] } : person);
    const plan = generateSchedule({ year: 2026, month: 8, staff: constrained, unavailable: [] });
    expect(plan.days.flatMap(day => day.evening)).not.toContain(1);
  });

  it("özel gün şablonundaki sabah ve akşam kadro sayılarını uygular", () => {
    const plan = generateSchedule({
      year: 2026,
      month: 8,
      staff: people,
      unavailable: [],
      specialDays: [{ date: "2026-08-03", name: "Resmî tatil", morningSlots: 1, eveningSlots: 1 }],
    });
    const holiday = plan.days.find(day => day.date === "2026-08-03")!;
    expect(holiday.specialDayName).toBe("Resmî tatil");
    expect(Object.values(holiday.morning).filter(value => value !== null)).toHaveLength(1);
    expect(holiday.evening.filter(value => value !== null)).toHaveLength(1);
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

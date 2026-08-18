import { describe, expect, it } from "vitest";
import { generateSchedule, planStatistics, validateSchedule, type StaffForSchedule } from "../shared/scheduling";

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

  it("haftalar arasında aynı gün ve cihaz için personel rotasyonu uygular", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    const mondayMamoStaff = plan.days.filter(day => day.weekday === 1).map(day => day.morning["RÖNT-MAMO"]);
    expect(new Set(mondayMamoStaff).size).toBeGreaterThan(1);
  });

  it("farklı yeni liste üretimlerinde aynı girdiyi farklı dengeli taslaklara dönüştürür", () => {
    const firstPlan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [], seed: 101 });
    const secondPlan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [], seed: 202 });
    const firstAssignments = firstPlan.days.map(day => [day.morning.MR, day.morning.BT, day.morning["RÖNT-PORT"], day.morning["RÖNT-MAMO"], ...day.evening, day.night]);
    const secondAssignments = secondPlan.days.map(day => [day.morning.MR, day.morning.BT, day.morning["RÖNT-PORT"], day.morning["RÖNT-MAMO"], ...day.evening, day.night]);
    expect(secondAssignments).not.toEqual(firstAssignments);
    expect(validateSchedule(secondPlan, people, []).filter(issue => issue.level === "error")).toHaveLength(0);
  });

  it("uygun personelleri akşam ve gece vardiyalarında sıfır görevde bırakmaz", () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [], seed: 303 });
    const statistics = planStatistics(plan, people);
    expect(statistics.every(entry => entry.evening > 0)).toBe(true);
    expect(statistics.every(entry => entry.night > 0)).toBe(true);
  });

  it("normal gece adayı kalmadığında personel 6'yı son çare olarak atar", () => {
    const lockedPlan = {
      days: [
        ...Array.from({ length: 5 }, (_, offset) => ({
        date: `2026-08-${String(24 + offset).padStart(2, "0")}`,
        weekday: new Date(Date.UTC(2026, 7, 24 + offset)).getUTCDay(),
        morning: { MR: 6, BT: null, "RÖNT-PORT": null, RÖNTGEN: null, "RÖNT-MAMO": null },
        evening: [null, null] as [number | null, number | null],
        night: null,
        })),
        {
          date: "2026-08-29",
          weekday: 6,
          morning: { MR: null, BT: null, "RÖNT-PORT": null, RÖNTGEN: null, "RÖNT-MAMO": null },
          evening: [null, null] as [number | null, number | null],
          night: 4,
        },
        {
          date: "2026-08-30",
          weekday: 0,
          morning: { MR: 1, BT: null, "RÖNT-PORT": null, RÖNTGEN: null, "RÖNT-MAMO": null },
          evening: [2, 3] as [number | null, number | null],
          night: null,
        },
      ],
    };
    const unavailable = [
      ...Array.from({ length: 23 }, (_, offset) => ({ staffId: 6, date: `2026-08-${String(offset + 1).padStart(2, "0")}` })),
      ...people.filter(person => person.id > 3 && person.id !== 6).map(person => ({ staffId: person.id, date: "2026-08-30" })),
    ];
    const specialDays = [{ date: "2026-08-30", name: "Özel Pazar", morningSlots: 1, eveningSlots: 2 }];
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable, specialDays, lockedPlan, seed: 11 });
    const fallbackDay = plan.days.find(day => day.date === "2026-08-30")!;
    expect(fallbackDay.night).toBe(6);
    expect(fallbackDay.fallbackNight).toBe(true);
    expect(plan.issues.some(issue => issue.level === "warning" && issue.date === "2026-08-30" && issue.message.includes("personel ID 6 güvenli son çare"))).toBe(true);
    expect(validateSchedule(plan, people, unavailable, specialDays).filter(issue => issue.level === "error" && issue.date === "2026-08-30")).toEqual([]);
  });

  it("personel 6 aynı gün görevli veya önceki gece çalışmışsa güvenlik kuralını ihlal ederek geceye atanmaz", () => {
    const lockedPlan = {
      days: [
        {
          date: "2026-08-22",
          weekday: 6,
          morning: { MR: null, BT: null, "RÖNT-PORT": null, RÖNTGEN: null, "RÖNT-MAMO": null },
          evening: [null, null] as [number | null, number | null],
          night: 6,
        },
        {
          date: "2026-08-23",
          weekday: 0,
          morning: { MR: 6, BT: null, "RÖNT-PORT": null, RÖNTGEN: null, "RÖNT-MAMO": null },
          evening: [1, null] as [number | null, number | null],
          night: null,
        },
      ],
    };
    const unavailable = [
      ...Array.from({ length: 21 }, (_, offset) => ({ staffId: 6, date: `2026-08-${String(offset + 1).padStart(2, "0")}` })),
      ...people.filter(person => person.id !== 1 && person.id !== 6).map(person => ({ staffId: person.id, date: "2026-08-23" })),
    ];
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable, lockedPlan, seed: 17 });
    const emergencyDay = plan.days.find(day => day.date === "2026-08-23")!;
    expect(emergencyDay.night).toBeNull();
    expect(plan.issues.some(issue => issue.level === "error" && issue.date === "2026-08-23" && issue.message.includes("aynı gün başka vardiyada görevli"))).toBe(true);
    expect(validateSchedule(plan, people, unavailable).some(issue => issue.level === "error" && issue.date === "2026-08-23")).toBe(true);
  });

  it("personel 6 da izinliyse boş gece vardiyasının güvenlik nedeniyle oluştuğunu açıkça bildirir", () => {
    const unavailable = people.map(person => ({ staffId: person.id, date: "2026-08-12" }));
    const plan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable, seed: 23 });
    const day = plan.days.find(item => item.date === "2026-08-12")!;
    expect(day.night).toBeNull();
    expect(plan.issues.some(issue => issue.level === "error" && issue.date === "2026-08-12" && issue.message.includes("izinli veya raporlu"))).toBe(true);
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
    expect(issues.some(issue => issue.level === "error" && issue.message.includes("yalnızca kadın personel"))).toBe(true);
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

  it("elle atanmış vardiyaları korur ve yalnızca boş vardiyaları tamamlar", () => {
    const fullPlan = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [] });
    const partialDays = fullPlan.days.map(day => ({ ...day, morning: { MR: null, BT: null, "RÖNT-PORT": null, RÖNTGEN: null, "RÖNT-MAMO": null }, evening: [null, null] as [number | null, number | null], night: null }));
    const lockedMorningId = fullPlan.days[0].morning.MR;
    partialDays[0].morning.MR = lockedMorningId;
    const completed = generateSchedule({ year: 2026, month: 8, staff: people, unavailable: [], lockedPlan: { days: partialDays } });
    expect(completed.days[0].morning.MR).toBe(lockedMorningId);
    expect(completed.issues.filter(issue => issue.level === "error")).toHaveLength(0);
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

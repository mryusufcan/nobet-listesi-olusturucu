export const EQUIPMENT = ["MR", "BT", "RÖNT-PORT", "RÖNTGEN", "RÖNT-MAMO"] as const;
export type Equipment = (typeof EQUIPMENT)[number];
export type Gender = "female" | "male" | "unspecified";

export const FIXED_RULES = {
  morning: "08:00–16:00",
  evening: "16:00–24:00",
  night: "24:00–08:00",
  weekdayMorningSlots: 4,
  sundayMorningSlots: 2,
  eveningSlots: 2,
  nightSlots: 1,
  weeklyMaximum: 5,
} as const;

export type StaffForSchedule = {
  id: number;
  name: string;
  active: boolean;
  gender: Gender;
  competencies: Equipment[];
  historicalTotal?: number;
  historicalMorning?: number;
  historicalEvening?: number;
  historicalNight?: number;
};

export type ScheduleDay = {
  date: string;
  weekday: number;
  morning: Record<Equipment, number | null>;
  evening: [number | null, number | null];
  night: number | null;
};

export type RuleIssue = {
  level: "error" | "warning";
  date?: string;
  message: string;
};

export type SchedulePlan = {
  year: number;
  month: number;
  days: ScheduleDay[];
  issues: RuleIssue[];
  createdAt: string;
};

type Counts = { total: number; morning: number; evening: number; night: number };

const zeroCounts = (): Counts => ({ total: 0, morning: 0, evening: 0, night: 0 });

export function localDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizedName(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function hasName(staff: StaffForSchedule, name: string) {
  return normalizedName(staff.name) === normalizedName(name);
}

function isTuesdayOrWednesday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 3;
}

function allowsShift(staff: StaffForSchedule, shift: "morning" | "evening" | "night", date: string) {
  if (hasName(staff, "Emre Coşkun")) return shift === "morning";
  if (hasName(staff, "Burak Badur")) return shift === "morning" || (shift === "night" && isTuesdayOrWednesday(date));
  if (hasName(staff, "Yusuf Can Özdemir") && shift === "morning") {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 5;
  }
  return true;
}

function staffCount(staff: StaffForSchedule) {
  return {
    total: staff.historicalTotal ?? 0,
    morning: staff.historicalMorning ?? 0,
    evening: staff.historicalEvening ?? 0,
    night: staff.historicalNight ?? 0,
  };
}

function createEmptyDay(date: string, weekday: number): ScheduleDay {
  return {
    date,
    weekday,
    morning: Object.fromEntries(EQUIPMENT.map(equipment => [equipment, null])) as Record<Equipment, number | null>,
    evening: [null, null],
    night: null,
  };
}

function weekKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  const weekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - weekday + 1);
  return value.toISOString().slice(0, 10);
}

function addCount(counts: Map<number, Counts>, id: number, shift: "morning" | "evening" | "night") {
  const value = counts.get(id) ?? zeroCounts();
  value.total += 1;
  value[shift] += 1;
  counts.set(id, value);
}

function decrementCount(counts: Map<number, Counts>, id: number, shift: "morning" | "evening" | "night") {
  const value = counts.get(id);
  if (!value) return;
  value.total -= 1;
  value[shift] -= 1;
}

export function generateSchedule(input: {
  year: number;
  month: number;
  staff: StaffForSchedule[];
  unavailable: Array<{ staffId: number; date: string }>;
}): SchedulePlan {
  const issues: RuleIssue[] = [];
  const staff = input.staff.filter(item => item.active);
  const unavailable = new Map<string, Set<number>>();
  input.unavailable.forEach(item => {
    const values = unavailable.get(item.date) ?? new Set<number>();
    values.add(item.staffId);
    unavailable.set(item.date, values);
  });

  const liveCounts = new Map<number, Counts>();
  const weeklyCounts = new Map<string, Map<number, number>>();
  const days: ScheduleDay[] = [];
  const dayCount = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
  let priorNight: number | null = null;

  for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
    const date = localDateString(input.year, input.month, dayNumber);
    const weekday = new Date(Date.UTC(input.year, input.month - 1, dayNumber)).getUTCDay();
    const day = createEmptyDay(date, weekday);
    const unavailableToday = unavailable.get(date) ?? new Set<number>();
    const assigned = new Set<number>();
    const weekly = weeklyCounts.get(weekKey(date)) ?? new Map<number, number>();
    weeklyCounts.set(weekKey(date), weekly);
    const mandatoryNight = staff.find(item => hasName(item, "Burak Badur") && isTuesdayOrWednesday(date));

    const availableFor = (shift: "morning" | "evening" | "night", equipment?: Equipment) =>
      staff.filter(item => {
        if (unavailableToday.has(item.id) || assigned.has(item.id) || priorNight === item.id) return false;
        if (mandatoryNight && mandatoryNight.id === item.id && shift !== "night") return false;
        if ((weekly.get(item.id) ?? 0) >= FIXED_RULES.weeklyMaximum) return false;
        if (!allowsShift(item, shift, date)) return false;
        if (shift === "morning" && equipment && !item.competencies.includes(equipment)) return false;
        return true;
      });

    const score = (item: StaffForSchedule, shift: "morning" | "evening" | "night") => {
      const past = staffCount(item);
      const current = liveCounts.get(item.id) ?? zeroCounts();
      const baseline = past.total + current.total;
      const specific = past[shift] + current[shift];
      const week = weekly.get(item.id) ?? 0;
      return baseline * 100 + specific * 24 + week * 7 + item.name.localeCompare("", "tr");
    };

    const assign = (person: StaffForSchedule, shift: "morning" | "evening" | "night") => {
      assigned.add(person.id);
      addCount(liveCounts, person.id, shift);
      weekly.set(person.id, (weekly.get(person.id) ?? 0) + 1);
    };

    const morningTarget = weekday === 0 ? FIXED_RULES.sundayMorningSlots : FIXED_RULES.weekdayMorningSlots;
    let morningAssigned = 0;
    const devicesByScarcity = [...EQUIPMENT].sort((a, b) => availableFor("morning", a).length - availableFor("morning", b).length);
    if (weekday !== 0) {
      const femalePair = devicesByScarcity
        .map(equipment => ({ equipment, people: availableFor("morning", equipment).filter(item => item.gender === "female") }))
        .find(item => item.people.length > 0);
      if (femalePair) {
        const chosen = femalePair.people.sort((a, b) => score(a, "morning") - score(b, "morning"))[0];
        day.morning[femalePair.equipment] = chosen.id;
        assign(chosen, "morning");
        morningAssigned += 1;
      } else {
        issues.push({ level: "warning", date, message: "Sabah vardiyası için uygun kadın personel bulunamadı." });
      }
    }

    for (const equipment of devicesByScarcity) {
      if (morningAssigned >= morningTarget || day.morning[equipment]) continue;
      const chosen = availableFor("morning", equipment).sort((a, b) => score(a, "morning") - score(b, "morning"))[0];
      if (!chosen) continue;
      day.morning[equipment] = chosen.id;
      assign(chosen, "morning");
      morningAssigned += 1;
    }
    if (morningAssigned !== morningTarget) {
      issues.push({ level: "error", date, message: `Sabah vardiyasında ${morningTarget} kişi yerine ${morningAssigned} kişi atanabildi.` });
    }

    for (let slot = 0; slot < FIXED_RULES.eveningSlots; slot += 1) {
      const chosen = availableFor("evening").sort((a, b) => score(a, "evening") - score(b, "evening"))[0];
      if (!chosen) {
        issues.push({ level: "error", date, message: "Akşam vardiyası için yeterli uygun personel bulunamadı." });
        continue;
      }
      day.evening[slot as 0 | 1] = chosen.id;
      assign(chosen, "evening");
    }

    const nightCandidates = availableFor("night");
    const chosenNight = mandatoryNight && nightCandidates.some(item => item.id === mandatoryNight.id)
      ? mandatoryNight
      : nightCandidates.sort((a, b) => score(a, "night") - score(b, "night"))[0];
    if (!chosenNight) {
      issues.push({ level: "error", date, message: "Gece vardiyası için uygun personel bulunamadı." });
    } else {
      day.night = chosenNight.id;
      assign(chosenNight, "night");
    }

    priorNight = day.night;
    days.push(day);
  }

  const plan: SchedulePlan = { year: input.year, month: input.month, days, issues, createdAt: new Date().toISOString() };
  plan.issues.push(...validateSchedule(plan, input.staff, input.unavailable));
  return plan;
}

export function validateSchedule(
  plan: Pick<SchedulePlan, "days">,
  staff: StaffForSchedule[],
  unavailable: Array<{ staffId: number; date: string }>,
): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const byId = new Map(staff.map(item => [item.id, item]));
  const unavailableByDate = new Map<string, Set<number>>();
  unavailable.forEach(item => {
    const values = unavailableByDate.get(item.date) ?? new Set<number>();
    values.add(item.staffId);
    unavailableByDate.set(item.date, values);
  });
  const weekly = new Map<string, Map<number, number>>();
  let previousNight: number | null = null;

  for (const day of plan.days) {
    const morningIds = EQUIPMENT.map(equipment => day.morning[equipment]).filter((value): value is number => value !== null);
    const expectedMorning = day.weekday === 0 ? FIXED_RULES.sundayMorningSlots : FIXED_RULES.weekdayMorningSlots;
    if (morningIds.length !== expectedMorning) {
      issues.push({ level: "error", date: day.date, message: `Sabah vardiyasında ${expectedMorning} cihaz bazlı atama olmalıdır.` });
    }
    if (day.evening.some(value => value === null)) {
      issues.push({ level: "error", date: day.date, message: "Akşam vardiyasına iki personel atanmalıdır." });
    }
    if (day.night === null) {
      issues.push({ level: "error", date: day.date, message: "Gece vardiyasına bir personel atanmalıdır." });
    }
    const ids = [
      ...morningIds,
      ...day.evening,
      day.night,
    ].filter((value): value is number => value !== null);
    const unique = new Set(ids);
    if (unique.size !== ids.length) issues.push({ level: "error", date: day.date, message: "Bir personel aynı güne birden fazla vardiyaya atandı." });
    if (previousNight !== null && unique.has(previousNight)) issues.push({ level: "error", date: day.date, message: "Gece nöbeti sonrası dinlenme kuralı ihlal edildi." });
    const noWork = unavailableByDate.get(day.date) ?? new Set<number>();
    ids.forEach(id => {
      if (noWork.has(id)) issues.push({ level: "error", date: day.date, message: "İzinli/raporlu personel vardiyaya atandı." });
    });
    EQUIPMENT.forEach(equipment => {
      const id = day.morning[equipment];
      const person = id ? byId.get(id) : undefined;
      if (person && !person.competencies.includes(equipment)) {
        issues.push({ level: "error", date: day.date, message: `${person.name}, ${equipment} cihazında yetkin değil.` });
      }
      if (person && !allowsShift(person, "morning", day.date)) {
        issues.push({ level: "error", date: day.date, message: `${person.name} sabah vardiyası için tanımlı kısıta uymuyor.` });
      }
    });
    day.evening.forEach(id => {
      const person = id ? byId.get(id) : undefined;
      if (person && !allowsShift(person, "evening", day.date)) issues.push({ level: "error", date: day.date, message: `${person.name} akşam vardiyası için tanımlı kısıta uymuyor.` });
    });
    if (day.night) {
      const person = byId.get(day.night);
      if (person && !allowsShift(person, "night", day.date)) issues.push({ level: "error", date: day.date, message: `${person.name} gece vardiyası için tanımlı kısıta uymuyor.` });
    }
    if (day.weekday !== 0 && !EQUIPMENT.some(equipment => byId.get(day.morning[equipment] ?? -1)?.gender === "female")) {
      issues.push({ level: "warning", date: day.date, message: "Sabah vardiyasında kadın personel yok." });
    }
    ids.forEach(id => {
      const values = weekly.get(weekKey(day.date)) ?? new Map<number, number>();
      values.set(id, (values.get(id) ?? 0) + 1);
      weekly.set(weekKey(day.date), values);
    });
    previousNight = day.night;
  }
  weekly.forEach((values, week) => values.forEach((count, id) => {
    if (count > FIXED_RULES.weeklyMaximum) {
      issues.push({ level: "error", date: week, message: `${byId.get(id)?.name ?? "Personel"} bir haftada ${count} vardiyaya atandı.` });
    }
  }));
  return issues;
}

export function planStatistics(plan: Pick<SchedulePlan, "days">, staff: StaffForSchedule[]) {
  const counts = new Map<number, Counts>(staff.map(item => [item.id, zeroCounts()]));
  plan.days.forEach(day => {
    EQUIPMENT.forEach(equipment => {
      const id = day.morning[equipment];
      if (id) addCount(counts, id, "morning");
    });
    day.evening.forEach(id => id && addCount(counts, id, "evening"));
    if (day.night) addCount(counts, day.night, "night");
  });
  return staff.map(item => ({ staffId: item.id, name: item.name, ...(counts.get(item.id) ?? zeroCounts()) }));
}

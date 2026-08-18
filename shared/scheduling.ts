export const EQUIPMENT = ["MR", "BT", "RÖNT-PORT", "RÖNTGEN", "RÖNT-MAMO"] as const;
export type Equipment = (typeof EQUIPMENT)[number];
export const MORNING_EQUIPMENT = ["MR", "BT", "RÖNT-PORT", "RÖNT-MAMO"] as const;
export type Gender = "female" | "male" | "unspecified";
export type ConstraintRule = "only_shift" | "blocked_shift" | "blocked_weekday" | "blocked_device" | "weekly_max";
export type PersonalConstraint = { id?: number; staffId: number; rule: ConstraintRule; value: string; note?: string | null };
export type SpecialDayTemplate = { id?: number; date: string; name: string; morningSlots: number; eveningSlots: number };

export const FIXED_RULES = {
  morning: "08:00–16:00",
  evening: "16:00–24:00",
  night: "24:00–08:00",
  weekdayMorningSlots: 4,
  sundayMorningSlots: 1,
  eveningSlots: 2,
  sundayEveningSlots: 1,
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
  constraints?: PersonalConstraint[];
};

export type ScheduleDay = {
  date: string;
  weekday: number;
  morning: Record<Equipment, number | null>;
  evening: [number | null, number | null];
  night: number | null;
  specialDayName?: string;
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
  const constraints = staff.constraints ?? [];
  const onlyShifts = constraints.filter(item => item.rule === "only_shift").map(item => item.value);
  if (onlyShifts.length > 0 && !onlyShifts.includes(shift)) return false;
  if (constraints.some(item => item.rule === "blocked_shift" && item.value === shift)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (constraints.some(item => item.rule === "blocked_weekday" && Number(item.value) === weekday)) return false;
  if (hasName(staff, "Emre Coşkun")) return shift === "morning";
  if (hasName(staff, "Burak Badur")) return shift === "morning" || (shift === "night" && isTuesdayOrWednesday(date));
  if (hasName(staff, "Yusuf Can Özdemir") && shift === "morning") {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 5;
  }
  return true;
}

function allowsEquipment(staff: StaffForSchedule, equipment: Equipment) {
  if (equipment === "RÖNT-MAMO" && staff.gender !== "female") return false;
  return !staff.constraints?.some(item => item.rule === "blocked_device" && item.value === equipment);
}

function weeklyMaximum(staff: StaffForSchedule) {
  const values = staff.constraints?.filter(item => item.rule === "weekly_max").map(item => Number(item.value)).filter(value => Number.isInteger(value) && value > 0) ?? [];
  return Math.min(FIXED_RULES.weeklyMaximum, ...values);
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

function seededTieBreak(seed: number, key: string) {
  let value = seed >>> 0;
  for (let index = 0; index < key.length; index += 1) value = Math.imul(value ^ key.charCodeAt(index), 16777619) >>> 0;
  return value % 84;
}

export function generateSchedule(input: {
  year: number;
  month: number;
  staff: StaffForSchedule[];
  unavailable: Array<{ staffId: number; date: string }>;
  specialDays?: SpecialDayTemplate[];
  lockedPlan?: Pick<SchedulePlan, "days">;
  seed?: number;
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
  const specialDayByDate = new Map((input.specialDays ?? []).map(item => [item.date, item]));
  const recurringAssignments = new Map<string, number>();
  const dayCount = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
  let priorNight: number | null = null;
  let priorEvening = new Set<number>();

  for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
    const date = localDateString(input.year, input.month, dayNumber);
    const weekday = new Date(Date.UTC(input.year, input.month - 1, dayNumber)).getUTCDay();
    const day = createEmptyDay(date, weekday);
    const lockedDay = input.lockedPlan?.days.find(item => item.date === date);
    if (lockedDay) {
      day.morning = { ...lockedDay.morning };
      day.evening = [...lockedDay.evening] as [number | null, number | null];
      day.night = lockedDay.night;
    }
    const specialDay = specialDayByDate.get(date);
    if (specialDay) day.specialDayName = specialDay.name;
    const unavailableToday = unavailable.get(date) ?? new Set<number>();
    const assigned = new Set<number>();
    const weekly = weeklyCounts.get(weekKey(date)) ?? new Map<number, number>();
    weeklyCounts.set(weekKey(date), weekly);
    const mandatoryNight = staff.find(item => hasName(item, "Burak Badur") && isTuesdayOrWednesday(date));

    const availableFor = (shift: "morning" | "evening" | "night", equipment?: Equipment) =>
      staff.filter(item => {
        if (unavailableToday.has(item.id) || assigned.has(item.id) || priorNight === item.id) return false;
        if (shift === "morning" && priorEvening.has(item.id)) return false;
        if (mandatoryNight && mandatoryNight.id === item.id && shift !== "night") return false;
        if ((weekly.get(item.id) ?? 0) >= weeklyMaximum(item)) return false;
        if (!allowsShift(item, shift, date)) return false;
        if (shift === "morning" && equipment && (!item.competencies.includes(equipment) || !allowsEquipment(item, equipment))) return false;
        return true;
      });

    const score = (item: StaffForSchedule, shift: "morning" | "evening" | "night", equipment?: Equipment) => {
      const past = staffCount(item);
      const current = liveCounts.get(item.id) ?? zeroCounts();
      const baseline = past.total + current.total;
      const specific = past[shift] + current[shift];
      const week = weekly.get(item.id) ?? 0;
      const rotationKey = `${item.id}:${weekday}:${shift}:${equipment ?? "genel"}`;
      const repetition = recurringAssignments.get(rotationKey) ?? 0;
      const tieBreakKey = `${item.id}:${date}:${shift}:${equipment ?? "genel"}`;
      return baseline * 100 + specific * 24 + week * 7 + repetition * 340 + seededTieBreak(input.seed ?? 0, tieBreakKey);
    };

    const assign = (person: StaffForSchedule, shift: "morning" | "evening" | "night", equipment?: Equipment) => {
      assigned.add(person.id);
      addCount(liveCounts, person.id, shift);
      weekly.set(person.id, (weekly.get(person.id) ?? 0) + 1);
      const rotationKey = `${person.id}:${weekday}:${shift}:${equipment ?? "genel"}`;
      recurringAssignments.set(rotationKey, (recurringAssignments.get(rotationKey) ?? 0) + 1);
    };

    const morningTarget = specialDay?.morningSlots ?? (weekday === 0 ? FIXED_RULES.sundayMorningSlots : FIXED_RULES.weekdayMorningSlots);
    let morningAssigned = 0;
    const registerLocked = (id: number | null, shift: "morning" | "evening" | "night", equipment?: Equipment) => {
      if (!id) return;
      const person = staff.find(item => item.id === id);
      if (!person) { issues.push({ level: "error", date, message: "Elle atanmış personel aktif kadroda bulunamadı." }); return; }
      assign(person, shift, equipment);
      if (shift === "morning") morningAssigned += 1;
    };
    MORNING_EQUIPMENT.forEach(equipment => registerLocked(day.morning[equipment], "morning", equipment));
    day.evening.forEach(id => registerLocked(id, "evening"));
    registerLocked(day.night, "night");
    const devicesByScarcity = [...MORNING_EQUIPMENT].sort((a, b) => availableFor("morning", a).length - availableFor("morning", b).length);
    if (morningTarget === 1 && morningAssigned === 0) {
      const chosen = availableFor("morning", "MR").sort((a, b) => score(a, "morning", "MR") - score(b, "morning", "MR"))[0];
      if (!chosen) {
        issues.push({ level: "error", date, message: "Tek kişilik sabah şablonu için uygun personel bulunamadı." });
      } else {
        day.morning.MR = chosen.id;
        assign(chosen, "morning", "MR");
        morningAssigned = 1;
      }
    }
    if (weekday !== 0 && morningTarget > 1 && morningAssigned < morningTarget) {
      const femalePair = devicesByScarcity
        .map(equipment => ({ equipment, people: availableFor("morning", equipment).filter(item => item.gender === "female") }))
        .find(item => item.people.length > 0);
      if (femalePair) {
        const chosen = femalePair.people.sort((a, b) => score(a, "morning", femalePair.equipment) - score(b, "morning", femalePair.equipment))[0];
        day.morning[femalePair.equipment] = chosen.id;
        assign(chosen, "morning", femalePair.equipment);
        morningAssigned += 1;
      } else {
        issues.push({ level: "warning", date, message: "Sabah vardiyası için uygun kadın personel bulunamadı." });
      }
    }

    for (const equipment of devicesByScarcity) {
      if (morningAssigned >= morningTarget || day.morning[equipment]) continue;
      const chosen = availableFor("morning", equipment).sort((a, b) => score(a, "morning", equipment) - score(b, "morning", equipment))[0];
      if (!chosen) continue;
      day.morning[equipment] = chosen.id;
      assign(chosen, "morning", equipment);
      morningAssigned += 1;
    }
    if (morningAssigned !== morningTarget) {
      issues.push({ level: "error", date, message: `Sabah vardiyasında ${morningTarget} kişi yerine ${morningAssigned} kişi atanabildi.` });
    }

    const eveningTarget = specialDay?.eveningSlots ?? (weekday === 0 ? FIXED_RULES.sundayEveningSlots : FIXED_RULES.eveningSlots);
    for (let slot = 0; slot < eveningTarget; slot += 1) {
      if (day.evening[slot as 0 | 1] !== null) continue;
      const chosen = availableFor("evening").sort((a, b) => score(a, "evening") - score(b, "evening"))[0];
      if (!chosen) {
        issues.push({ level: "error", date, message: "Akşam vardiyası için yeterli uygun personel bulunamadı." });
        continue;
      }
      day.evening[slot as 0 | 1] = chosen.id;
      assign(chosen, "evening");
    }

    if (day.night === null) {
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
    }

    priorNight = day.night;
    priorEvening = new Set(day.evening.filter((value): value is number => value !== null));
    days.push(day);
  }

  const plan: SchedulePlan = { year: input.year, month: input.month, days, issues, createdAt: new Date().toISOString() };
  plan.issues.push(...validateSchedule(plan, input.staff, input.unavailable, input.specialDays));
  return plan;
}

export function validateSchedule(
  plan: Pick<SchedulePlan, "days">,
  staff: StaffForSchedule[],
  unavailable: Array<{ staffId: number; date: string }>,
  specialDays: SpecialDayTemplate[] = [],
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
  let previousEvening: number[] = [];
  const specialDayByDate = new Map(specialDays.map(item => [item.date, item]));

  for (const day of plan.days) {
    const morningAssignments = EQUIPMENT.map(equipment => day.morning[equipment]).filter((value): value is number => value !== null);
    const morningIds = morningAssignments;
    const specialDay = specialDayByDate.get(day.date);
    const expectedMorning = specialDay?.morningSlots ?? (day.weekday === 0 ? FIXED_RULES.sundayMorningSlots : FIXED_RULES.weekdayMorningSlots);
    if (morningIds.length !== expectedMorning) {
      issues.push({ level: "error", date: day.date, message: `Sabah vardiyasında ${expectedMorning} cihaz bazlı atama olmalıdır.` });
    }
    const expectedEvening = specialDay?.eveningSlots ?? (day.weekday === 0 ? FIXED_RULES.sundayEveningSlots : FIXED_RULES.eveningSlots);
    if (day.evening.filter(value => value !== null).length !== expectedEvening) {
      issues.push({ level: "error", date: day.date, message: `Akşam vardiyasına ${expectedEvening} personel atanmalıdır.` });
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
    if (previousEvening.some(id => morningIds.includes(id))) issues.push({ level: "error", date: day.date, message: "Akşam vardiyası sonrası ertesi gün sabah dinlenme kuralı ihlal edildi." });
    const noWork = unavailableByDate.get(day.date) ?? new Set<number>();
    ids.forEach(id => {
      if (noWork.has(id)) issues.push({ level: "error", date: day.date, message: "İzinli/raporlu personel vardiyaya atandı." });
    });
    MORNING_EQUIPMENT.forEach(equipment => {
      const id = day.morning[equipment];
      const person = id ? byId.get(id) : undefined;
      if (person && equipment === "RÖNT-MAMO" && person.gender !== "female") issues.push({ level: "error", date: day.date, message: `${person.name}, Mamografi cihazına yalnızca kadın personel atanabildiği için görevlendirilemez.` });
      else if (person && !person.competencies.includes(equipment)) issues.push({ level: "error", date: day.date, message: `${person.name}, ${equipment} cihazında yetkin değil.` });
      else if (person && !allowsEquipment(person, equipment)) issues.push({ level: "error", date: day.date, message: `${person.name} için ${equipment} cihazı özel kısıtla kapatılmış.` });
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
    previousEvening = day.evening.filter((value): value is number => value !== null);
  }
  weekly.forEach((values, week) => values.forEach((count, id) => {
    if (count > weeklyMaximum(byId.get(id) ?? { id, name: "Personel", active: true, gender: "unspecified", competencies: [] })) {
      issues.push({ level: "error", date: week, message: `${byId.get(id)?.name ?? "Personel"} bir haftada ${count} vardiyaya atandı.` });
    }
  }));
  return issues;
}

export function planStatistics(plan: Pick<SchedulePlan, "days">, staff: StaffForSchedule[]) {
  const counts = new Map<number, Counts>(staff.map(item => [item.id, zeroCounts()]));
  plan.days.forEach(day => {
    Array.from(new Set(Object.values(day.morning).filter((value): value is number => value !== null))).forEach(id => addCount(counts, id, "morning"));
    day.evening.forEach(id => id && addCount(counts, id, "evening"));
    if (day.night) addCount(counts, day.night, "night");
  });
  return staff.map(item => ({ staffId: item.id, name: item.name, ...(counts.get(item.id) ?? zeroCounts()) }));
}

import * as XLSX from "xlsx";
import { EQUIPMENT, type Equipment, type Gender } from "../../../shared/scheduling";

export type ImportedStaff = {
  name: string;
  gender: Gender;
  active: boolean;
  competencies: Equipment[];
  historicalTotal: number;
  historicalMorning: number;
  historicalEvening: number;
  historicalNight: number;
};

const normalize = (value: unknown) => String(value ?? "").trim();
const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);

export async function parseScheduleWorkbook(file: File): Promise<ImportedStaff[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const collected = new Map<string, ImportedStaff>();
  workbook.SheetNames.forEach(sheetName => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "" });
    rows.forEach(row => {
      const name = normalize(row[10]);
      if (!name || /çalışma sayısı/i.test(name) || name.length < 3 || /vardiya|cihaz/i.test(name)) return;
      const normalized = name.toLocaleUpperCase("tr-TR");
      const previous = collected.get(normalized) ?? {
        name: name.replace(/\b\w/g, letter => letter.toLocaleUpperCase("tr-TR")),
        gender: "unspecified" as Gender,
        active: true,
        competencies: [...EQUIPMENT],
        historicalTotal: 0,
        historicalMorning: 0,
        historicalEvening: 0,
        historicalNight: 0,
      };
      previous.historicalTotal += asNumber(row[11]);
      previous.historicalMorning += asNumber(row[12]);
      previous.historicalEvening += asNumber(row[13]);
      previous.historicalNight += asNumber(row[14]);
      collected.set(normalized, previous);
    });
  });
  return Array.from(collected.values());
}

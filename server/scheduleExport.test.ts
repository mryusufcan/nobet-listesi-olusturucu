import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildScheduleWorkbook } from "./scheduleExport";
import { generateSchedule, type StaffForSchedule } from "../shared/scheduling";

const staff: StaffForSchedule[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Personel ${index + 1}`,
  gender: index < 4 ? "female" : "male",
  active: true,
  competencies: ["MR", "BT", "RÖNT-PORT", "RÖNTGEN", "RÖNT-MAMO"],
}));

describe("Excel dışa aktarma", () => {
  it("çizelgeyi mevcut şablonla eşdeğer haftalık blok hücre konumlarında üretir", async () => {
    const plan = generateSchedule({ year: 2026, month: 8, staff, unavailable: [] });
    const workbook = buildScheduleWorkbook(plan, staff);
    const sheet = workbook.worksheets[0];
    const reference = new ExcelJS.Workbook();
    await reference.xlsx.readFile("/home/ubuntu/upload/ListeYedekleri.xlsx");
    const template = reference.getWorksheet("TEMİZ");
    expect(sheet.getCell("A7").value).toBe(template?.getCell("A7").value);
    expect(sheet.getCell("B7").value).toBe(template?.getCell("B7").value);
    expect(sheet.getCell("B8").value).toBe(template?.getCell("B8").value);
    expect(sheet.getCell("B12").value).toBe(template?.getCell("B12").value);
    expect(sheet.getCell("K7").value).toBe(template?.getCell("K7").value);
    expect(sheet.getCell("Q7").value).toBe(template?.getCell("Q7").value);
    expect(sheet.getCell("A14").value).toBe(template?.getCell("A14").value);
    expect(sheet.getCell("A16").value).toBe(template?.getCell("A16").value);
    expect(sheet.rowCount).toBeGreaterThan(20);
  });
});

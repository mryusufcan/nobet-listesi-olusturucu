import ExcelJS from "exceljs";
import { EQUIPMENT, FIXED_RULES, planStatistics, type SchedulePlan, type StaffForSchedule } from "../shared/scheduling";
import { storagePut } from "./storage";

const weekdayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function buildScheduleWorkbook(plan: SchedulePlan, staff: StaffForSchedule[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nöbet Listesi Oluşturucu";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(`${plan.year} ${String(plan.month).padStart(2, "0")}`);
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [
    { width: 15 }, { width: 16 }, ...Array.from({ length: 7 }, () => ({ width: 20 })), { width: 3 },
    { width: 24 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 4 }, { width: 34 },
  ];
  const byId = new Map(staff.map(item => [item.id, item.name.toLocaleUpperCase("tr-TR")]));
  const name = (id: number | null | undefined) => (id ? byId.get(id) ?? "" : "");
  const headerFill = "1F3A5F";
  const accentFill = "DCE8F5";
  const rowBorder = { bottom: { style: "thin" as const, color: { argb: "D7E2EE" } } };

  for (let start = 0; start < plan.days.length; start += 7) {
    const week = plan.days.slice(start, start + 7);
    const stats = planStatistics({ days: week }, staff);
    const weekStart = start === 0 ? 7 : sheet.rowCount + 1;
    const header = sheet.getRow(weekStart);
    header.values = ["Vardiya", "Cihaz", ...week.map(day => new Date(`${day.date}T00:00:00`)), "", "ÇALIŞMA SAYISI", "TOPLAM", "SABAH", "AKŞAM", "GECE", "", "HAFTANIN NOTLARI"];
    header.height = 28;
    header.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerFill } };
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    week.forEach((_, index) => { header.getCell(index + 3).numFmt = "dd ddd"; });
    const assignmentRows: Array<[string, string, (day: SchedulePlan["days"][number]) => number | null]> = [
      ["08:00 - 16:00", "MR", day => day.morning.MR],
      ["", "BT", day => day.morning.BT],
      ["", "RÖNT-PORT", day => day.morning["RÖNT-PORT"]],
      ["", "RÖNTGEN", day => day.morning.RÖNTGEN],
      ["", "RÖNT-MAMO", day => day.morning["RÖNT-MAMO"]],
      ["08:00-16:00", "", () => null],
      ["16:00-24:00", "", day => day.evening[0]],
      ["", "", day => day.evening[1]],
      ["24:00-08:00", "", day => day.night],
    ];
    assignmentRows.forEach(([shift, device, getter], index) => {
      const row = sheet.getRow(weekStart + 1 + index);
      row.values = [shift, device, ...week.map(day => name(getter(day)))];
      row.height = 24;
      row.eachCell((cell, columnNumber) => {
        cell.border = rowBorder;
        cell.alignment = { horizontal: columnNumber <= 2 ? "center" : "left", vertical: "middle", wrapText: true };
      });
      row.getCell(1).font = { bold: Boolean(shift), color: { argb: "17324D" } };
      row.getCell(2).font = { bold: Boolean(device) };
      if (index < 6) row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F6FAFD" } }; });
    });
    const blockEnd = weekStart + assignmentRows.length;
    stats.forEach((entry, index) => {
      const row = sheet.getRow(weekStart + 1 + index);
      row.getCell(11).value = entry.name;
      row.getCell(12).value = entry.total;
      row.getCell(13).value = entry.morning;
      row.getCell(14).value = entry.evening;
      row.getCell(15).value = entry.night;
      [11, 12, 13, 14, 15].forEach(column => {
        row.getCell(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "F7FAFC" : accentFill } };
        row.getCell(column).border = rowBorder;
        row.getCell(column).alignment = { vertical: "middle", horizontal: column === 11 ? "left" : "center" };
      });
    });
    const notes = plan.issues.filter(issue => issue.date && week.some(day => day.date === issue.date)).map(issue => `• ${issue.date}: ${issue.message}`).join("\n") || "Kural ihlali bulunmuyor.";
    sheet.mergeCells(weekStart + 1, 17, Math.max(blockEnd, weekStart + stats.length), 17);
    const noteCell = sheet.getCell(weekStart + 1, 17);
    noteCell.value = notes;
    noteCell.alignment = { vertical: "top", wrapText: true };
    noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8E8" } };
    noteCell.border = { left: { style: "thin", color: { argb: "F0D8A4" } }, right: { style: "thin", color: { argb: "F0D8A4" } } };
    sheet.getRow(Math.max(blockEnd, weekStart + stats.length) + 1).height = 8;
  }
  return workbook;
}

export async function exportScheduleToExcel(userId: number, plan: SchedulePlan, staff: StaffForSchedule[]) {
  const workbook = buildScheduleWorkbook(plan, staff);
  const bytes = await workbook.xlsx.writeBuffer();
  const filename = `nobet-listesi-${plan.year}-${String(plan.month).padStart(2, "0")}.xlsx`;
  return storagePut(`schedule-exports/${userId}/${Date.now()}-${filename}`, Buffer.from(bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQUIPMENT, type Equipment, type SchedulePlan, type StaffForSchedule } from "../../../shared/scheduling";

const weekdayShort = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const weekdayLong = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function personName(id: number | null, staffById: Map<number, StaffForSchedule>) {
  return id ? staffById.get(id)?.name ?? "Bilinmiyor" : "Atama yok";
}

function AssignmentCell({ value, staff, eligible, onChange, disabled }: { value: number | null; staff: StaffForSchedule[]; eligible?: (person: StaffForSchedule) => boolean; onChange: (value: number | null) => void; disabled: boolean }) {
  const choices = staff.filter(person => person.active && (!eligible || eligible(person)));
  const selected = value ? String(value) : "empty";
  return <Select value={selected} disabled={disabled} onValueChange={next => onChange(next === "empty" ? null : Number(next))}><SelectTrigger className="h-9 min-w-[132px] border-0 bg-transparent px-2 text-xs font-medium shadow-none hover:bg-white focus:ring-1"><SelectValue>{value ? personName(value, new Map(staff.map(item => [item.id, item]))) : "—"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="empty">— Atama yok —</SelectItem>{choices.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name}</SelectItem>)}</SelectContent></Select>;
}

export function ScheduleTable({ plan, staff, editable, onPlanChange }: { plan: SchedulePlan; staff: StaffForSchedule[]; editable: boolean; onPlanChange: (plan: SchedulePlan) => void }) {
  const groups = Array.from({ length: Math.ceil(plan.days.length / 7) }, (_, index) => plan.days.slice(index * 7, index * 7 + 7));
  const update = (date: string, kind: "morning" | "evening" | "night", slot: Equipment | 0 | 1 | null, value: number | null) => {
    const days = plan.days.map(day => {
      if (day.date !== date) return day;
      if (kind === "morning") return { ...day, morning: { ...day.morning, [slot as Equipment]: value } };
      if (kind === "evening") { const evening: [number | null, number | null] = [...day.evening] as [number | null, number | null]; evening[slot as 0 | 1] = value; return { ...day, evening }; }
      return { ...day, night: value };
    });
    onPlanChange({ ...plan, days });
  };
  return <div className="grid gap-7">{groups.map((days, index) => <section key={days[0].date} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3"><div><p className="text-sm font-semibold text-slate-800">Hafta {index + 1}</p><p className="text-xs text-slate-500">{days[0].date} — {days.at(-1)?.date}</p></div><span className="rounded-full bg-[#e7f1fb] px-3 py-1 text-xs font-medium text-[#1f4d78]">Haftalık blok</span></div><div className="overflow-x-auto"><table className="min-w-full border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><th className="w-32 px-4 py-3">Vardiya</th><th className="w-32 px-4 py-3">Cihaz</th>{days.map(day => <th key={day.date} className="min-w-40 px-3 py-3 text-center"><span className="block">{weekdayShort[day.weekday]}</span><span className="font-semibold text-slate-700">{day.date.slice(8)}</span></th>)}</tr></thead><tbody>{EQUIPMENT.map((equipment, equipmentIndex) => <tr key={equipment} className="border-b border-slate-100 bg-[#fbfdff]"><td className="px-4 py-2 text-xs font-semibold text-[#1f4d78]">{equipmentIndex === 0 ? "08:00–16:00" : ""}</td><td className="px-4 py-2 text-xs font-semibold text-slate-700">{equipment}</td>{days.map(day => <td key={day.date} className="border-l border-slate-100 px-1 py-1"><AssignmentCell disabled={!editable} staff={staff} value={day.morning[equipment]} eligible={person => person.competencies.includes(equipment)} onChange={value => update(day.date, "morning", equipment, value)} /></td>)}</tr>)}<tr className="border-b border-slate-100"><td rowSpan={2} className="px-4 py-2 text-xs font-semibold text-[#7a4b10]">16:00–24:00</td><td className="px-4 py-2 text-xs text-slate-500">1. kişi</td>{days.map(day => <td key={day.date} className="border-l border-slate-100 px-1 py-1"><AssignmentCell disabled={!editable} staff={staff} value={day.evening[0]} onChange={value => update(day.date, "evening", 0, value)} /></td>)}</tr><tr className="border-b border-slate-100"><td className="px-4 py-2 text-xs text-slate-500">2. kişi</td>{days.map(day => <td key={day.date} className="border-l border-slate-100 px-1 py-1"><AssignmentCell disabled={!editable} staff={staff} value={day.evening[1]} onChange={value => update(day.date, "evening", 1, value)} /></td>)}</tr><tr><td className="px-4 py-2 text-xs font-semibold text-[#643a80]">24:00–08:00</td><td className="px-4 py-2 text-xs text-slate-500">Gece</td>{days.map(day => <td key={day.date} className="border-l border-slate-100 px-1 py-1"><AssignmentCell disabled={!editable} staff={staff} value={day.night} onChange={value => update(day.date, "night", null, value)} /></td>)}</tr></tbody></table></div><div className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">{days.map(day => <span className="mr-5" key={day.date}>{day.date.slice(8)} {weekdayLong[day.weekday]}</span>)}</div></section>)}</div>;
}

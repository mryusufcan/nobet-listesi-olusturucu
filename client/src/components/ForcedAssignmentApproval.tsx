import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { SchedulePlan } from "../../../shared/scheduling";

export function ForcedAssignmentApproval({ plan, onPlanChange }: { plan: SchedulePlan; onPlanChange: (plan: SchedulePlan) => void }) {
  const forcedDates = plan.days.filter(day => day.fallbackNight).map(day => day.date);
  if (!forcedDates.length) return null;
  const approved = plan.forcedAssignmentsApproved ?? false;
  return <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm"><div className="flex gap-3"><div className="mt-0.5 rounded-lg bg-rose-100 p-2 text-rose-700"><AlertTriangle className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-rose-900">Zorunlu gece ataması yönetici onayı bekliyor</p><p className="mt-1 text-xs leading-5 text-rose-800">{forcedDates.join(", ")} tarihinde haftalık üst sınır istisnasıyla gece ataması yapıldı. Çizelge kaydedilmeden önce yöneticinin bu istisnayı onaylaması gerekir.</p><label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-rose-200 bg-white/70 px-3 py-2.5 text-sm font-medium text-rose-950"><Checkbox checked={approved} onCheckedChange={checked => onPlanChange({ ...plan, forcedAssignmentsApproved: checked === true })} /><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-rose-700" />Zorunlu atamaları yönetici olarak onaylıyorum.</span></label></div></div></section>;
}

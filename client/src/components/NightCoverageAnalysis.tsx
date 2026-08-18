import { AlertTriangle, CheckCircle2, Loader2, MoonStar, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function NightCoverageAnalysis({ year, month }: { year: number; month: number }) {
  const analysis = trpc.schedule.nightRisk.useQuery({ year, month });
  if (analysis.isLoading) return <section className="mb-6 flex min-h-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gece kapsamı analiz ediliyor…</section>;
  const result = analysis.data;
  if (!result) return null;
  const critical = result.days.filter(day => day.level === "critical");
  const watch = result.days.filter(day => day.level === "watch");
  const tone = critical.length ? "border-rose-200 bg-rose-50" : watch.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
  const Icon = critical.length ? ShieldAlert : watch.length ? AlertTriangle : CheckCircle2;
  return <section className={`mb-6 rounded-2xl border p-4 shadow-sm ${tone}`}><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="flex gap-3"><div className="rounded-xl bg-white/70 p-2"><MoonStar className="h-5 w-5 text-[#1f4d78]" /></div><div><p className="text-sm font-semibold text-slate-900">Liste öncesi gece kapsam analizi</p><p className="mt-1 text-xs leading-5 text-slate-700">İzinler, gece sonrası dinlenme, vardiya kısıtları ve haftalık sınır kullanılarak olası gece boşlukları önceden değerlendirilir.</p></div></div><div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800"><Icon className="h-4 w-4" />{critical.length ? `${critical.length} kritik boşluk riski` : watch.length ? `${watch.length} gün yakından izlenmeli` : "Gece kapsam riski görünmüyor"}</div></div>{(critical.length || watch.length) ? <div className="mt-3 flex flex-wrap gap-2">{[...critical, ...watch].map(day => <span key={day.date} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${day.level === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{day.date} · {day.candidateCount} uygun aday</span>)}</div> : null}</section>;
}

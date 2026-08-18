import { useAuth } from "@/_core/hooks/useAuth";
import { AppTopbar } from "@/components/AppTopbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EQUIPMENT, type ConstraintRule } from "../../../shared/scheduling";

const rules: Array<{ value: ConstraintRule; label: string; description: string }> = [
  { value: "only_shift", label: "Sadece seçili vardiyada çalışır", description: "Diğer vardiya türlerine hiç atanmaz." },
  { value: "blocked_shift", label: "Belirli vardiyaya atanmaz", description: "Seçilen vardiya türünde çalıştırılmaz." },
  { value: "blocked_weekday", label: "Belirli günde çalışmaz", description: "Seçilen haftanın gününde atama yapılmaz." },
  { value: "blocked_device", label: "Belirli cihazda çalışmaz", description: "Sabah vardiyasında seçilen cihaza atanmaz." },
  { value: "weekly_max", label: "Kişisel haftalık üst sınır", description: "Tanımlanan sayının üzerinde vardiyaya atanmaz." },
];
const weekday = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const shifts = [{ value: "morning", label: "08:00–16:00 Sabah" }, { value: "evening", label: "16:00–24:00 Akşam" }, { value: "night", label: "24:00–08:00 Gece" }];

function valueLabel(rule: ConstraintRule, value: string) {
  if (rule === "blocked_weekday") return weekday[Number(value)] ?? value;
  if (rule === "only_shift" || rule === "blocked_shift") return shifts.find(item => item.value === value)?.label ?? value;
  return rule === "weekly_max" ? `${value} vardiya` : value;
}

export default function Constraints() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const staffQuery = trpc.schedule.staff.useQuery(undefined, { enabled: isAuthenticated });
  const constraintQuery = trpc.schedule.constraints.useQuery(undefined, { enabled: isAuthenticated });
  const staff = staffQuery.data ?? [];
  const constraints = constraintQuery.data ?? [];
  const [staffId, setStaffId] = useState("");
  const [rule, setRule] = useState<ConstraintRule>("blocked_shift");
  const [value, setValue] = useState("morning");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const selectedRule = rules.find(item => item.value === rule)!;
  const values = useMemo(() => {
    if (rule === "only_shift" || rule === "blocked_shift") return shifts;
    if (rule === "blocked_weekday") return weekday.map((label, index) => ({ value: String(index), label }));
    if (rule === "blocked_device") return EQUIPMENT.map(item => ({ value: item, label: item }));
    return [1, 2, 3, 4, 5].map(item => ({ value: String(item), label: `${item} vardiya` }));
  }, [rule]);
  const reset = () => { setEditingId(null); setStaffId(""); setRule("blocked_shift"); setValue("morning"); setNote(""); };
  const save = trpc.schedule.upsertConstraint.useMutation({
    onSuccess: async () => { await Promise.all([utils.schedule.constraints.invalidate(), utils.schedule.staff.invalidate()]); toast.success(editingId ? "Özel kısıt güncellendi." : "Özel kısıt kaydedildi."); reset(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.schedule.deleteConstraint.useMutation({ onSuccess: async () => { await Promise.all([utils.schedule.constraints.invalidate(), utils.schedule.staff.invalidate()]); toast.success("Özel kısıt kaldırıldı."); }, onError: error => toast.error(error.message) });
  const changeRule = (next: ConstraintRule) => { setRule(next); setValue(next === "blocked_weekday" ? "1" : next === "blocked_device" ? EQUIPMENT[0] : next === "weekly_max" ? "5" : "morning"); };
  const submit = () => { if (!staffId) { toast.error("Önce bir personel seçin."); return; } save.mutate({ id: editingId ?? undefined, staffId: Number(staffId), rule, value, note: note || undefined }); };
  const edit = (item: (typeof constraints)[number]) => { setEditingId(item.id ?? null); setStaffId(String(item.staffId)); setRule(item.rule); setValue(item.value); setNote(item.note ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f8fc]"><Loader2 className="h-6 w-6 animate-spin text-[#1f4d78]" /></div>;
  if (!isAuthenticated) return <div className="grid min-h-screen place-items-center bg-[#f5f8fc] p-6 text-center"><div><SlidersHorizontal className="mx-auto h-10 w-10 text-[#2b689e]" /><h1 className="mt-4 text-xl font-semibold text-[#17324d]">Kısıt yönetimi için giriş yapın</h1><Button className="mt-5" onClick={() => startLogin()}>Giriş yap</Button></div></div>;
  return <div className="min-h-screen bg-[#f5f8fc]"><AppTopbar /><main className="mx-auto max-w-6xl px-4 py-7 sm:px-6"><section className="rounded-3xl bg-[#17324d] p-6 text-white"><p className="text-sm font-medium text-blue-200">KİŞİ BAZLI PLANLAMA</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Özel kısıtlar</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Sabit kurum kurallarına ek olarak, belirli personellerin vardiya, gün, cihaz ve haftalık üst sınır tercihlerini yönetin.</p></section><section className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Card className="border-slate-200 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base text-[#17324d]">{editingId ? "Kısıtı düzenle" : "Yeni özel kısıt"}</CardTitle>{editingId && <Button variant="ghost" size="sm" onClick={reset}>Yeni kısıt</Button>}</CardHeader><CardContent className="grid gap-4"><div className="grid gap-2"><Label>Personel</Label><Select value={staffId} onValueChange={setStaffId}><SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger><SelectContent>{staff.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name} {person.active ? "" : "(pasif)"}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Kısıt türü</Label><Select value={rule} onValueChange={next => changeRule(next as ConstraintRule)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{rules.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-slate-500">{selectedRule.description}</p></div><div className="grid gap-2"><Label>Değer</Label><Select value={value} onValueChange={setValue}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{values.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Not <span className="font-normal text-slate-400">(isteğe bağlı)</span></Label><Input value={note} onChange={event => setNote(event.target.value)} placeholder="Örn. eğitim günü" /></div><Button onClick={submit} disabled={save.isPending}><Plus className="mr-2 h-4 w-4" />{save.isPending ? "Kaydediliyor…" : editingId ? "Kısıtı güncelle" : "Kısıt ekle"}</Button></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base text-[#17324d]">Tanımlı kısıtlar</CardTitle></CardHeader><CardContent className="p-0">{constraintQuery.isLoading ? <div className="p-8 text-center text-sm text-slate-500">Kısıtlar yükleniyor…</div> : constraints.length === 0 ? <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-medium text-slate-700">Ek bir personel kısıtı tanımlanmadı.</p><p className="mt-1 text-sm text-slate-500">Sabit vardiya kuralları varsayılan olarak uygulanmaya devam eder.</p></div> : <div className="divide-y divide-slate-100">{constraints.map(item => <div key={item.id} className="flex items-start justify-between gap-4 p-4"><div><p className="font-medium text-slate-800">{staff.find(person => person.id === item.staffId)?.name ?? "Silinmiş personel"}</p><p className="mt-1 text-sm text-[#1f4d78]">{rules.find(ruleItem => ruleItem.value === item.rule)?.label}: <strong>{valueLabel(item.rule, item.value)}</strong></p>{item.note && <p className="mt-1 text-xs text-slate-500">Not: {item.note}</p>}</div><div className="flex shrink-0"><Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#1f4d78]" onClick={() => edit(item)} aria-label="Kısıtı düzenle"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-600" onClick={() => remove.mutate({ id: item.id! })} aria-label="Kısıtı kaldır"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}</CardContent></Card></section><div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-[#1f4d78]"><AlertCircle className="mr-2 inline h-4 w-4" />Yeni bir liste üretildiğinde bu kısıtlar zorunlu uygulanır. Mevcut bir liste elle değiştirilirse kaydetme öncesinde yeniden denetlenir.</div></main></div>;
}

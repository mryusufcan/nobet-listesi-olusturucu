import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EQUIPMENT, type Equipment, type Gender, type StaffForSchedule } from "../../../shared/scheduling";

export type StaffForm = {
  id?: number;
  name: string;
  gender: Gender;
  active: boolean;
  competencies: Equipment[];
  historicalTotal: number;
  historicalMorning: number;
  historicalEvening: number;
  historicalNight: number;
};

export const blankStaffForm = (): StaffForm => ({
  name: "", gender: "unspecified", active: true, competencies: [...EQUIPMENT],
  historicalTotal: 0, historicalMorning: 0, historicalEvening: 0, historicalNight: 0,
});

export const staffToForm = (staff: StaffForSchedule): StaffForm => ({
  id: staff.id, name: staff.name, gender: staff.gender, active: staff.active,
  competencies: staff.competencies, historicalTotal: staff.historicalTotal ?? 0,
  historicalMorning: staff.historicalMorning ?? 0, historicalEvening: staff.historicalEvening ?? 0, historicalNight: staff.historicalNight ?? 0,
});

export function StaffDialog({ open, onOpenChange, value, onChange, onSave, saving, onDelete, deleting }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: StaffForm;
  onChange: (value: StaffForm) => void;
  onSave: () => void;
  saving: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const update = (key: keyof StaffForm, next: StaffForm[keyof StaffForm]) => onChange({ ...value, [key]: next });
  const toggleEquipment = (equipment: Equipment) => {
    const competencies = value.competencies.includes(equipment)
      ? value.competencies.filter(item => item !== equipment)
      : [...value.competencies, equipment];
    update("competencies", competencies);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{value.id ? "Personeli düzenle" : "Yeni personel ekle"}</DialogTitle>
          <DialogDescription>Bu bilgiler, nöbet atama algoritmasının uygunluk ve dengeleme değerlendirmesinde kullanılır.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-2"><Label htmlFor="staff-name">Ad soyad</Label><Input id="staff-name" value={value.name} onChange={event => update("name", event.target.value)} placeholder="Örn. Bahar Yarenoğlu" /></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Cinsiyet</Label><Select value={value.gender} onValueChange={gender => update("gender", gender as Gender)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="female">Kadın</SelectItem><SelectItem value="male">Erkek</SelectItem><SelectItem value="unspecified">Belirtilmedi</SelectItem></SelectContent></Select></div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><div><p className="text-sm font-medium text-slate-800">Aktif personel</p><p className="text-xs text-slate-500">Pasif personel planlamaya alınmaz.</p></div><Switch checked={value.active} onCheckedChange={active => update("active", active)} /></div>
          </div>
          <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-medium text-slate-700">Cihaz yetkinlikleri</legend><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{EQUIPMENT.map(equipment => <label key={equipment} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><Checkbox checked={value.competencies.includes(equipment)} onCheckedChange={() => toggleEquipment(equipment)} />{equipment}</label>)}</div></fieldset>
          <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-medium text-slate-700">İçe aktarılan geçmiş nöbet sayıları</legend><p className="mb-3 text-xs text-slate-500">Dengeleme için önceki listelerden gelen toplamları saklayabilirsiniz.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(["historicalTotal", "historicalMorning", "historicalEvening", "historicalNight"] as const).map((key, index) => <div key={key} className="grid gap-1"><Label className="text-xs">{["Toplam", "Sabah", "Akşam", "Gece"][index]}</Label><Input type="number" min="0" value={value[key]} onChange={event => update(key, Math.max(0, Number(event.target.value) || 0))} /></div>)}</div></fieldset>
        </div>
        <DialogFooter className="gap-2 sm:justify-between"><div>{value.id && onDelete ? <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">Personeli sil</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{value.name} silinsin mi?</AlertDialogTitle><AlertDialogDescription>Personelin izin ve rapor kayıtları silinir. Geçmiş çizelgede atanmışsa, geçmiş kayıtlar korunur ve personel yalnızca aktif listeden kaldırılır.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction disabled={deleting} className="bg-rose-600 hover:bg-rose-700" onClick={onDelete}>{deleting ? "Siliniyor…" : "Personeli sil"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}</div><div className="flex gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button><Button disabled={!value.name.trim() || value.competencies.length === 0 || saving} onClick={onSave}>{saving ? "Kaydediliyor…" : "Personeli kaydet"}</Button></div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

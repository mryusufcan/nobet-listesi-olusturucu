import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

export function SaveDraftCallout({ visible, saving, onSave }: { visible: boolean; saving: boolean; onSave: () => void }) {
  if (!visible) return null;
  return <div className="fixed right-5 top-20 z-40 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 p-2 pl-4 shadow-[0_14px_32px_rgba(120,82,24,.16)] backdrop-blur"><p className="text-xs font-semibold text-amber-900">Kaydedilmemiş taslak</p><Button size="sm" disabled={saving} onClick={onSave}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Taslağı kaydet</Button></div>;
}

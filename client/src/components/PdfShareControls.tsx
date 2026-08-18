import { Button } from "@/components/ui/button";
import { downloadFile, schedulePdfFile } from "@/lib/pdfExport";
import { Download, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function PdfShareControls({ year, month }: { year: number; month: number }) {
  const [loading, setLoading] = useState<"download" | "share" | null>(null);
  const create = async (action: "download" | "share") => {
    setLoading(action);
    try { return await schedulePdfFile(year, month); }
    catch (error) { toast.error(error instanceof Error ? error.message : "PDF oluşturulamadı."); return null; }
    finally { setLoading(null); }
  };
  const download = async () => { const file = await create("download"); if (file) { downloadFile(file); toast.success("PDF indirilmeye hazır."); } };
  const share = async () => {
    const file = await create("share");
    if (!file) return;
    const shareData = { title: "Radyoloji nöbet listesi", text: `${year}/${String(month).padStart(2, "0")} nöbet çizelgesi`, files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try { await navigator.share(shareData); } catch (error) { if ((error as DOMException).name !== "AbortError") toast.error("Paylaşım tamamlanamadı."); }
      return;
    }
    downloadFile(file);
    toast.message("Bu tarayıcıda doğrudan dosya paylaşımı desteklenmiyor; PDF indirildi.");
  };
  return <div className="fixed bottom-5 right-5 z-40 flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_16px_40px_rgba(23,50,77,.18)] backdrop-blur"><Button variant="outline" size="sm" disabled={loading !== null} onClick={download}>{loading === "download" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}PDF indir</Button><Button size="sm" disabled={loading !== null} onClick={share}>{loading === "share" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}Paylaş</Button></div>;
}

import { Button } from "@/components/ui/button";
import { BarChart3, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";

export function PageShortcuts() {
  return <nav aria-label="Planlama araçları" className="fixed bottom-5 left-5 z-40 hidden gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_16px_40px_rgba(23,50,77,.14)] backdrop-blur md:flex"><Button asChild variant="ghost" size="sm"><Link href="/kisitlar"><SlidersHorizontal className="mr-2 h-4 w-4" />Kısıtlar</Link></Button><Button asChild variant="ghost" size="sm"><Link href="/denge-raporu"><BarChart3 className="mr-2 h-4 w-4" />Denge raporu</Link></Button></nav>;
}

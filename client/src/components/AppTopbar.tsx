import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BarChart3, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";

const links = [
  { href: "/", label: "Planlama", icon: CalendarDays },
  { href: "/kisitlar", label: "Kısıtlar", icon: SlidersHorizontal },
  { href: "/denge-raporu", label: "Denge raporu", icon: BarChart3 },
];

export function AppTopbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  return <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-5"><Link href="/" className="flex shrink-0 items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1f4d78] text-white shadow-sm"><CalendarDays className="h-5 w-5" /></div><div className="hidden sm:block"><p className="text-sm font-semibold tracking-tight text-[#17324d]">Nöbet Yönetimi</p><p className="text-[11px] font-medium text-slate-500">RADYOLOJİ BİRİMİ</p></div></Link><nav className="flex items-center gap-1 overflow-x-auto">{links.map(item => <Link key={item.href} href={item.href} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${location === item.href ? "bg-[#e8f2fb] text-[#1f4d78]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}><item.icon className="h-4 w-4" /><span className="hidden md:inline">{item.label}</span></Link>)}</nav></div><div className="flex shrink-0 items-center gap-2"><span className="hidden text-sm text-slate-500 lg:block">{user?.name}</span><Button variant="ghost" size="sm" onClick={logout}>Çıkış</Button></div></div></header>;
}

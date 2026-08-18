import { useEffect } from "react";

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const linkGuard = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target || link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      if (!window.confirm("Kaydedilmemiş bir taslak var. Sayfadan ayrılmak istiyor musunuz?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", linkGuard, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", linkGuard, true); };
  }, [isDirty]);
}

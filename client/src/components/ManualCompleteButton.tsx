import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { SchedulePlan } from "../../../shared/scheduling";
import { Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";

export function ManualCompleteButton({ plan, editing, onCompleted }: { plan: SchedulePlan; editing: boolean; onCompleted: (plan: SchedulePlan) => void }) {
  const complete = trpc.schedule.complete.useMutation({
    onSuccess: data => { onCompleted(data.plan); toast.success("Elle yaptığınız atamalar korundu; boş vardiyalar tamamlandı. Kaydetmeyi unutmayın."); },
    onError: error => toast.error(error.message),
  });
  if (!editing) return null;
  return <div className="fixed bottom-5 left-5 z-40"><Button disabled={complete.isPending} className="shadow-[0_16px_40px_rgba(23,50,77,.18)]" onClick={() => complete.mutate({ plan })}>{complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}Kalanı doldur</Button></div>;
}

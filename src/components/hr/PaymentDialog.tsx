import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  worker_id: z.string().min(1, "Worker required"),
  date: z.string().min(1, "Date required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const fetchWorkers = async () => {
      const { data } = await supabase.from("workers").select("id, name").order("name");
      setWorkers(data || []);
    };
    fetchWorkers();
  }, []);

  const workerValue = watch("worker_id");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("payments").insert([data as any]);
      if (error) throw error;
      toast({ title: "Payment recorded" });
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-construction-slate border-construction-steel/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">New Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Worker</Label>
            <Select value={workerValue} onValueChange={(v) => setValue("worker_id", v)}>
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel z-50">
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.worker_id && <p className="text-red-400 text-sm mt-1">{errors.worker_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" {...register("date")} className="bg-construction-dark border-construction-steel text-white" />
              {errors.date && <p className="text-red-400 text-sm mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" {...register("amount")} className="bg-construction-dark border-construction-steel text-white" />
              {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={2} {...register("description")} className="bg-construction-dark border-construction-steel text-white" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-construction-steel text-construction-concrete">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-hero hover:opacity-90">
              {loading ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

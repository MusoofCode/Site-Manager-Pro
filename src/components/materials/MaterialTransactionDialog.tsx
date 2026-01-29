import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  transaction_type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  occurred_at: z.string().min(1, "Date required"),
  project_id: z.string().optional(),
  note: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: any;
  onSuccess: () => void;
}

export function MaterialTransactionDialog({ open, onOpenChange, material, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      transaction_type: "out",
      occurred_at: today,
      project_id: material?.project_id ?? "",
    },
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!open) return;
    reset({
      transaction_type: "out",
      occurred_at: today,
      project_id: material?.project_id ?? "",
      note: "",
      quantity: 1,
    });
  }, [open, material, reset, today]);

  const projectValue = watch("project_id");
  const typeValue = watch("transaction_type");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("material_transactions").insert({
        material_id: material.id,
        project_id: data.project_id ? data.project_id : null,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        occurred_at: data.occurred_at,
        note: data.note ? data.note : null,
        unit_cost: material.unit_cost,
      } as any);
      if (error) throw error;

      toast({ title: typeValue === "in" ? "Stock added" : "Stock used" });
      onSuccess();
      onOpenChange(false);
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
          <DialogTitle className="text-2xl">{material?.name} — Stock Movement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Movement Type</Label>
            <Select value={typeValue} onValueChange={(v) => setValue("transaction_type", v as any)}>
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel z-50">
                <SelectItem value="in">Stock In</SelectItem>
                <SelectItem value="out">Stock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                {...register("occurred_at")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.occurred_at && (
                <p className="text-red-400 text-sm mt-1">{errors.occurred_at.message}</p>
              )}
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                step={1}
                {...register("quantity")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.quantity && (
                <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Project (Optional)</Label>
            <Select value={projectValue} onValueChange={(v) => setValue("project_id", v)}>
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel z-50">
                <SelectItem value="">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea
              {...register("note")}
              rows={3}
              className="bg-construction-dark border-construction-steel text-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-construction-steel text-construction-concrete"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-hero hover:opacity-90">
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

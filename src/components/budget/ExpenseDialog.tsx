import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const expenseSchema = z.object({
  project_id: z.string().min(1, "Project required"),
  date: z.string().min(1, "Date required"),
  category: z.string().min(1, "Category required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ExpenseDialog = ({ open, onOpenChange, onSuccess }: ExpenseDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name, budget").order("name");
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("expenses").insert([data as any]);
      if (error) throw error;
      toast({ title: "Expense recorded successfully" });
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const projectValue = watch("project_id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-construction-slate border-construction-steel/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">New Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Project</Label>
            <Select value={projectValue} onValueChange={(val) => setValue("project_id", val)}>
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} (Budget: ${Number(p.budget).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.project_id && <p className="text-red-400 text-sm mt-1">{errors.project_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                {...register("date")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.date && <p className="text-red-400 text-sm mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("amount")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Input
              {...register("category")}
              placeholder="e.g., Labor, Materials, Equipment"
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              {...register("description")}
              className="bg-construction-dark border-construction-steel text-white"
              rows={2}
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
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-hero hover:opacity-90"
            >
              {loading ? "Saving..." : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
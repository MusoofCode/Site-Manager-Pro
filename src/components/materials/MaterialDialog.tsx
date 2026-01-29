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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const materialSchema = z.object({
  name: z.string().min(1, "Material name required"),
  category: z.string().min(1, "Category required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be positive"),
  supplier: z.string().optional(),
  project_id: z.string().optional(),
  low_stock_threshold: z.coerce.number().min(0).default(10),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: any;
  onSuccess: () => void;
}

export const MaterialDialog = ({ open, onOpenChange, material, onSuccess }: MaterialDialogProps) => {
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
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (material) {
      setValue("name", material.name);
      setValue("category", material.category);
      setValue("quantity", material.quantity);
      setValue("unit_cost", material.unit_cost);
      setValue("supplier", material.supplier || "");
      setValue("project_id", material.project_id || "");
      setValue("low_stock_threshold", material.low_stock_threshold || 10);
    } else {
      reset();
    }
  }, [material, setValue, reset]);

  const onSubmit = async (data: MaterialFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        project_id: data.project_id || null,
        supplier: data.supplier || null,
      };

      if (material) {
        const { error } = await supabase.from("materials").update(payload as any).eq("id", material.id);
        if (error) throw error;
        toast({ title: "Material updated successfully" });
      } else {
        const { error } = await supabase.from("materials").insert([payload as any]);
        if (error) throw error;
        toast({ title: "Material created successfully" });
      }
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
          <DialogTitle className="text-2xl">
            {material ? "Edit Material" : "New Material"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Material Name</Label>
            <Input
              {...register("name")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Category</Label>
            <Input
              {...register("category")}
              placeholder="e.g., Cement, Steel, Wood"
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                {...register("quantity")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("unit_cost")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.unit_cost && <p className="text-red-400 text-sm mt-1">{errors.unit_cost.message}</p>}
            </div>
          </div>

          <div>
            <Label>Supplier</Label>
            <Input
              {...register("supplier")}
              className="bg-construction-dark border-construction-steel text-white"
            />
          </div>

          <div>
            <Label>Low Stock Alert Threshold</Label>
            <Input
              type="number"
              {...register("low_stock_threshold")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.low_stock_threshold && <p className="text-red-400 text-sm mt-1">{errors.low_stock_threshold.message}</p>}
          </div>

          <div>
            <Label>Assign to Project (Optional)</Label>
            <Select value={projectValue} onValueChange={(val) => setValue("project_id", val)}>
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel">
                <SelectItem value="">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {loading ? "Saving..." : material ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
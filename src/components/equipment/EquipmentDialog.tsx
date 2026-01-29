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

const equipmentSchema = z.object({
  name: z.string().min(1, "Equipment name required"),
  type: z.string().min(1, "Type required"),
  condition: z.enum(["Excellent", "Good", "Fair", "Poor"]),
  available: z.boolean().default(true),
  project_id: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: any;
  onSuccess: () => void;
}

export const EquipmentDialog = ({ open, onOpenChange, equipment, onSuccess }: EquipmentDialogProps) => {
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
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (equipment) {
      setValue("name", equipment.name);
      setValue("type", equipment.type);
      setValue("condition", equipment.condition);
      setValue("available", equipment.available);
      setValue("project_id", equipment.project_id || "");
    } else {
      reset({ condition: "Good", available: true });
    }
  }, [equipment, setValue, reset]);

  const onSubmit = async (data: EquipmentFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        project_id: data.project_id || null,
      };

      if (equipment) {
        const { error } = await supabase.from("equipment").update(payload as any).eq("id", equipment.id);
        if (error) throw error;
        toast({ title: "Equipment updated successfully" });
      } else {
        const { error } = await supabase.from("equipment").insert([payload as any]);
        if (error) throw error;
        toast({ title: "Equipment created successfully" });
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

  const conditionValue = watch("condition");
  const projectValue = watch("project_id");
  const availableValue = watch("available");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-construction-slate border-construction-steel/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {equipment ? "Edit Equipment" : "New Equipment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Equipment Name</Label>
            <Input
              {...register("name")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Type</Label>
            <Input
              {...register("type")}
              placeholder="e.g., Excavator, Crane, Drill"
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.type && <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>}
          </div>

          <div>
            <Label>Condition</Label>
            <Select value={conditionValue} onValueChange={(val) => setValue("condition", val as any)}>
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel">
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Availability</Label>
            <Select
              value={availableValue ? "true" : "false"}
              onValueChange={(val) => setValue("available", val === "true")}
            >
              <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-construction-slate border-construction-steel">
                <SelectItem value="true">Available</SelectItem>
                <SelectItem value="false">In Use</SelectItem>
              </SelectContent>
            </Select>
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
              {loading ? "Saving..." : equipment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
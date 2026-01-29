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
import { DatePickerInput } from "@/components/common/DatePickerInput";

const projectSchema = z.object({
  name: z.string().min(1, "Project name required"),
  client_name: z.string().min(1, "Client name required"),
  location: z.string().min(1, "Location required"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  status: z.enum(["Planned", "Active", "On Hold", "Completed"]),
  budget: z.coerce.number().min(0, "Budget must be positive"),
  description: z.string().optional(),
  progress_percentage: z.coerce.number().min(0).max(100).default(0),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
  onSuccess: () => void;
}

export const ProjectDialog = ({ open, onOpenChange, project, onSuccess }: ProjectDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "Planned",
      progress_percentage: 0,
    },
  });

  useEffect(() => {
    if (project) {
      setValue("name", project.name);
      setValue("client_name", project.client_name);
      setValue("location", project.location);
      setValue("start_date", project.start_date);
      setValue("end_date", project.end_date);
      setValue("status", project.status);
      setValue("budget", project.budget);
      setValue("description", project.description || "");
      setValue("progress_percentage", project.progress_percentage || 0);
    } else {
      reset();
    }
  }, [project, setValue, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    try {
      if (project) {
        const { error } = await supabase
          .from("projects")
          .update(data as any)
          .eq("id", project.id);
        if (error) throw error;
        toast({ title: "Project updated successfully" });
      } else {
        const { error } = await supabase.from("projects").insert([data as any]);
        if (error) throw error;
        toast({ title: "Project created successfully" });
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

  const statusValue = watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-construction-slate border-construction-steel/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {project ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Project Name</Label>
              <Input
                {...register("name")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label>Client Name</Label>
              <Input
                {...register("client_name")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.client_name && <p className="text-red-400 text-sm mt-1">{errors.client_name.message}</p>}
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input
              {...register("location")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.location && <p className="text-red-400 text-sm mt-1">{errors.location.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <DatePickerInput
                value={watch("start_date")}
                onChange={(val) => setValue("start_date", val, { shouldValidate: true })}
                align="start"
              />
              {errors.start_date && <p className="text-red-400 text-sm mt-1">{errors.start_date.message}</p>}
            </div>

            <div>
              <Label>End Date</Label>
              <DatePickerInput
                value={watch("end_date")}
                onChange={(val) => setValue("end_date", val, { shouldValidate: true })}
                align="start"
              />
              {errors.end_date && <p className="text-red-400 text-sm mt-1">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={statusValue} onValueChange={(val) => setValue("status", val as any)}>
                <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-construction-slate border-construction-steel">
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Budget ($)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("budget")}
                className="bg-construction-dark border-construction-steel text-white"
              />
              {errors.budget && <p className="text-red-400 text-sm mt-1">{errors.budget.message}</p>}
            </div>
          </div>

          <div>
            <Label>Progress (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              {...register("progress_percentage")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.progress_percentage && <p className="text-red-400 text-sm mt-1">{errors.progress_percentage.message}</p>}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              {...register("description")}
              className="bg-construction-dark border-construction-steel text-white"
              rows={3}
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
              {loading ? "Saving..." : project ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
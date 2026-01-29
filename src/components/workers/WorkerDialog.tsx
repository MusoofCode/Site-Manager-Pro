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

const workerSchema = z.object({
  name: z.string().min(1, "Worker name required"),
  role: z.string().min(1, "Role required"),
  daily_rate: z.coerce.number().min(0, "Daily rate must be positive"),
  project_id: z.string().optional(),
});

type WorkerFormData = z.infer<typeof workerSchema>;

interface WorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker?: any;
  onSuccess: () => void;
}

export const WorkerDialog = ({ open, onOpenChange, worker, onSuccess }: WorkerDialogProps) => {
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
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (worker) {
      setValue("name", worker.name);
      setValue("role", worker.role);
      setValue("daily_rate", worker.daily_rate);
      setValue("project_id", worker.project_id || "");
    } else {
      reset();
    }
  }, [worker, setValue, reset]);

  const onSubmit = async (data: WorkerFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        project_id: data.project_id || null,
      };

      if (worker) {
        const { error } = await supabase.from("workers").update(payload as any).eq("id", worker.id);
        if (error) throw error;
        toast({ title: "Worker updated successfully" });
      } else {
        const { error } = await supabase.from("workers").insert([payload as any]);
        if (error) throw error;
        toast({ title: "Worker created successfully" });
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
            {worker ? "Edit Worker" : "New Worker"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Worker Name</Label>
            <Input
              {...register("name")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Role</Label>
            <Input
              {...register("role")}
              placeholder="e.g., Mason, Electrician, Plumber"
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.role && <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <Label>Daily Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              {...register("daily_rate")}
              className="bg-construction-dark border-construction-steel text-white"
            />
            {errors.daily_rate && <p className="text-red-400 text-sm mt-1">{errors.daily_rate.message}</p>}
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
              {loading ? "Saving..." : worker ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
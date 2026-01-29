import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { WorkerDialog } from "@/components/workers/WorkerDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Workers = () => {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<any>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    setWorkers(data || []);
  };

  const handleEdit = (worker: any) => {
    setSelectedWorker(worker);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!workerToDelete) return;
    try {
      const { error } = await supabase.from("workers").delete().eq("id", workerToDelete.id);
      if (error) throw error;
      toast({ title: "Worker deleted successfully" });
      fetchWorkers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setWorkerToDelete(null);
    }
  };

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Workers & Contractors</h1>
          <p className="text-construction-concrete">Manage workforce</p>
        </div>
        <Button
          onClick={() => {
            setSelectedWorker(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-hero hover:opacity-90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Worker
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <Card key={worker.id} className="bg-gradient-card border-construction-steel/30 hover-scale">
            <CardHeader>
              <CardTitle className="text-white">{worker.name}</CardTitle>
              <p className="text-construction-concrete text-sm">{worker.role}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-construction-concrete">
                <span>Daily Rate:</span>
                <span className="text-white font-medium">${Number(worker.daily_rate).toFixed(2)}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(worker)}
                  className="flex-1 border-construction-steel text-construction-concrete hover:text-white"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWorkerToDelete(worker);
                    setDeleteDialogOpen(true);
                  }}
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <WorkerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        worker={selectedWorker}
        onSuccess={fetchWorkers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-construction-slate border-construction-steel/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Worker</AlertDialogTitle>
            <AlertDialogDescription className="text-construction-concrete">
              Are you sure you want to delete "{workerToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-construction-steel text-construction-concrete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Workers;
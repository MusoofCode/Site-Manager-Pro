import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { EquipmentDialog } from "@/components/equipment/EquipmentDialog";
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

const Equipment = () => {
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase.from("equipment").select("*").order("name");
    setEquipment(data || []);
  };

  const handleEdit = (equipment: any) => {
    setSelectedEquipment(equipment);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!equipmentToDelete) return;
    try {
      const { error } = await supabase.from("equipment").delete().eq("id", equipmentToDelete.id);
      if (error) throw error;
      toast({ title: "Equipment deleted successfully" });
      fetchEquipment();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setEquipmentToDelete(null);
    }
  };

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Equipment</h1>
          <p className="text-construction-concrete">Manage equipment and tools</p>
        </div>
        <Button
          onClick={() => {
            setSelectedEquipment(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-hero hover:opacity-90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Equipment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item) => (
          <Card key={item.id} className="bg-gradient-card border-construction-steel/30 hover-scale">
            <CardHeader>
              <CardTitle className="text-foreground">{item.name}</CardTitle>
              <p className="text-construction-concrete text-sm">{item.type}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-construction-concrete">
                <span>Condition:</span>
                <span className="text-foreground font-medium">{item.condition}</span>
              </div>
              <div className="flex justify-between text-construction-concrete">
                <span>Status:</span>
                <span className={item.available ? "text-green-400" : "text-yellow-400"}>
                  {item.available ? "Available" : "In Use"}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(item)}
                  className="flex-1 border-construction-steel text-construction-concrete hover:text-white"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEquipmentToDelete(item);
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

      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        equipment={selectedEquipment}
        onSuccess={fetchEquipment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-construction-slate border-construction-steel/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription className="text-construction-concrete">
              Are you sure you want to delete "{equipmentToDelete?.name}"?
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

export default Equipment;
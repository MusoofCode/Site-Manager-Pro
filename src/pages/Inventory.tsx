import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Plus, Edit, Trash2, ArrowUpFromLine, History } from "lucide-react";
import { MaterialDialog } from "@/components/materials/MaterialDialog";
import { MaterialTransactionDialog } from "@/components/materials/MaterialTransactionDialog";
import { MaterialHistoryDialog } from "@/components/materials/MaterialHistoryDialog";
import { Button } from "@/components/ui/button";
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

const Inventory = () => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementMaterial, setMovementMaterial] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<any>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      const { data } = await supabase.from("materials").select("*").order("name");
      setMaterials(data || []);
    };
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const { data } = await supabase.from("materials").select("*").order("name");
    setMaterials(data || []);
  };

  const handleEdit = (material: any) => {
    setSelectedMaterial(material);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    try {
      const { error } = await supabase.from("materials").delete().eq("id", materialToDelete.id);
      if (error) throw error;
      toast({ title: "Material deleted successfully" });
      fetchMaterials();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Materials Inventory</h1>
          <p className="text-construction-concrete">Manage construction materials</p>
        </div>
        <Button
          onClick={() => {
            setSelectedMaterial(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-hero hover:opacity-90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Material
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material) => {
          const isLowStock = material.quantity <= material.low_stock_threshold;
          return (
            <Card key={material.id} className="bg-gradient-card border-construction-steel/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  {material.name}
                  {isLowStock && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                </CardTitle>
                <p className="text-construction-concrete text-sm">{material.category}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-construction-concrete">
                  <span>Quantity:</span>
                  <span className={`font-medium ${isLowStock ? "text-yellow-400" : "text-white"}`}>
                    {material.quantity}
                  </span>
                </div>
                <div className="flex justify-between text-construction-concrete">
                  <span>Unit Cost:</span>
                  <span className="text-white">${Number(material.unit_cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-construction-concrete">
                  <span>Supplier:</span>
                  <span className="text-white">{material.supplier || "N/A"}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMovementMaterial(material);
                      setMovementOpen(true);
                    }}
                    className="flex-1 border-construction-steel text-construction-concrete hover:text-white"
                  >
                    <ArrowUpFromLine className="h-4 w-4 mr-1" />
                    Stock
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHistoryMaterial(material);
                      setHistoryOpen(true);
                    }}
                    className="border-construction-steel text-construction-concrete hover:text-white"
                    title="History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(material)}
                    className="flex-1 border-construction-steel text-construction-concrete hover:text-white"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMaterialToDelete(material);
                      setDeleteDialogOpen(true);
                    }}
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <MaterialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        material={selectedMaterial}
        onSuccess={fetchMaterials}
      />

      {movementMaterial && (
        <MaterialTransactionDialog
          open={movementOpen}
          onOpenChange={setMovementOpen}
          material={movementMaterial}
          onSuccess={fetchMaterials}
        />
      )}

      {historyMaterial && (
        <MaterialHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          material={historyMaterial}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-construction-slate border-construction-steel/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Material</AlertDialogTitle>
            <AlertDialogDescription className="text-construction-concrete">
              Are you sure you want to delete "{materialToDelete?.name}"?
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

export default Inventory;
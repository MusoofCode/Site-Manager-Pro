import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MaintenanceDialog } from "@/components/equipment/MaintenanceDialog";

const Maintenance = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("maintenance_logs")
      .select("*, equipment(name)")
      .order("date", { ascending: false });
    setRows(data || []);
  };

  const totalCost = useMemo(() => rows.reduce((s, r) => s + Number(r.cost || 0), 0), [rows]);

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Maintenance</h1>
          <p className="text-construction-concrete">Equipment maintenance logs</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-hero hover:opacity-90">
          <Plus className="h-5 w-5 mr-2" />
          Add Log
        </Button>
      </div>

      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader>
          <CardTitle className="text-foreground">Total Maintenance Cost: ${Number(totalCost).toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="p-4 bg-construction-dark rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-foreground font-medium">{r.equipment?.name ?? "Unknown"}</p>
                <p className="text-construction-orange font-bold">${Number(r.cost || 0).toLocaleString()}</p>
              </div>
              <p className="text-construction-concrete text-sm">{r.date}</p>
              <p className="text-foreground mt-2">{r.description}</p>
            </div>
          ))}
          {rows.length === 0 && <p className="text-construction-concrete text-center py-8">No maintenance logs yet</p>}
        </CardContent>
      </Card>

      <MaintenanceDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchLogs} />
    </div>
  );
};

export default Maintenance;

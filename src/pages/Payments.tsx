import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PaymentDialog } from "@/components/hr/PaymentDialog";

const Payments = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, workers(name)")
      .order("date", { ascending: false });
    setRows(data || []);
  };

  const totals = useMemo(() => {
    const byWorker = new Map<string, number>();
    for (const p of rows) {
      const key = p.worker_id;
      byWorker.set(key, (byWorker.get(key) || 0) + Number(p.amount));
    }
    return Array.from(byWorker.entries())
      .map(([worker_id, total]) => ({
        worker_id,
        worker_name: rows.find((r) => r.worker_id === worker_id)?.workers?.name ?? "Unknown",
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Payments</h1>
          <p className="text-construction-concrete">Worker payment tracking</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-hero hover:opacity-90">
          <Plus className="h-5 w-5 mr-2" />
          Add Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-foreground">Totals by Worker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totals.map((t) => (
              <div key={t.worker_id} className="flex items-center justify-between p-3 bg-construction-dark rounded-lg">
                <p className="text-foreground font-medium">{t.worker_name}</p>
                <p className="text-construction-orange font-bold">${Number(t.total).toLocaleString()}</p>
              </div>
            ))}
            {totals.length === 0 && <p className="text-construction-concrete text-center py-8">No payments yet</p>}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-construction-dark rounded-lg">
                <div>
                  <p className="text-foreground font-medium">{p.workers?.name ?? "Unknown"}</p>
                  <p className="text-construction-concrete text-sm">{p.date}{p.description ? ` • ${p.description}` : ""}</p>
                </div>
                <p className="text-foreground font-medium">${Number(p.amount).toLocaleString()}</p>
              </div>
            ))}
            {rows.length === 0 && <p className="text-construction-concrete text-center py-8">No payments yet</p>}
          </CardContent>
        </Card>
      </div>

      <PaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchPayments} />
    </div>
  );
};

export default Payments;

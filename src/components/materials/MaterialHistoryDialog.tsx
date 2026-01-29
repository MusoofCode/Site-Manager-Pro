import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: any;
}

export function MaterialHistoryDialog({ open, onOpenChange, material }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);

  const materialId = useMemo(() => material?.id as string | undefined, [material]);

  useEffect(() => {
    if (!open || !materialId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("material_transactions")
          .select("*, projects(name)")
          .eq("material_id", materialId)
          .order("occurred_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setRows(data || []);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    })();
  }, [open, materialId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-construction-slate border-construction-steel/30 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{material?.name} — Usage History</DialogTitle>
        </DialogHeader>

        <Card className="bg-construction-dark border-construction-steel/30">
          <div className="p-4 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-construction-concrete">Date</TableHead>
                  <TableHead className="text-construction-concrete">Type</TableHead>
                  <TableHead className="text-construction-concrete">Qty</TableHead>
                  <TableHead className="text-construction-concrete">Project</TableHead>
                  <TableHead className="text-construction-concrete">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-white">{r.occurred_at}</TableCell>
                    <TableCell className={r.transaction_type === "in" ? "text-green-400" : "text-yellow-400"}>
                      {r.transaction_type === "in" ? "IN" : "OUT"}
                    </TableCell>
                    <TableCell className="text-white">{r.quantity}</TableCell>
                    <TableCell className="text-white">{r.projects?.name ?? "—"}</TableCell>
                    <TableCell className="text-white">{r.note ?? ""}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-construction-concrete">
                      No movements yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

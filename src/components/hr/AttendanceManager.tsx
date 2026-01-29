import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  date: string;
}

type Row = {
  worker_id: string;
  name: string;
  role: string;
  present: boolean;
  attendance_id?: string;
};

export function AttendanceManager({ date }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const dateKey = useMemo(() => date, [date]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [workersRes, attendanceRes] = await Promise.all([
          supabase.from("workers").select("id, name, role").order("name"),
          supabase.from("attendance").select("id, worker_id, present").eq("date", dateKey),
        ]);

        const workers = workersRes.data || [];
        const attendance = attendanceRes.data || [];
        const map = new Map(attendance.map((a) => [a.worker_id, a]));

        const merged: Row[] = workers.map((w) => {
          const a = map.get(w.id);
          return {
            worker_id: w.id,
            name: w.name,
            role: w.role,
            present: a?.present ?? true,
            attendance_id: a?.id,
          };
        });
        if (mounted) setRows(merged);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dateKey, toast]);

  const setPresent = (workerId: string, present: boolean) => {
    setRows((prev) => prev.map((r) => (r.worker_id === workerId ? { ...r, present } : r)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        worker_id: r.worker_id,
        date: dateKey,
        present: r.present,
      }));

      // No unique constraint on (worker_id,date), so update existing rows first, insert missing.
      const existing = rows.filter((r) => r.attendance_id);
      const missing = rows.filter((r) => !r.attendance_id);

      if (existing.length) {
        const updates = existing.map((r) =>
          supabase.from("attendance").update({ present: r.present } as any).eq("id", r.attendance_id)
        );
        const results = await Promise.all(updates);
        const err = results.find((x) => x.error)?.error;
        if (err) throw err;
      }

      if (missing.length) {
        const { error } = await supabase.from("attendance").insert(
          missing.map((r) => ({ worker_id: r.worker_id, date: dateKey, present: r.present })) as any
        );
        if (error) throw error;
      }

      toast({ title: "Attendance saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-construction-steel/30">
      <div className="p-4 flex items-center justify-between border-b border-construction-steel/30">
        <div>
          <p className="text-white font-medium">Daily Attendance</p>
          <p className="text-construction-concrete text-sm">Mark present/absent for {dateKey}</p>
        </div>
        <Button onClick={save} disabled={saving || loading} className="bg-gradient-hero hover:opacity-90">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="p-4 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-construction-concrete">Worker</TableHead>
              <TableHead className="text-construction-concrete">Role</TableHead>
              <TableHead className="text-construction-concrete">Present</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-construction-concrete">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-construction-concrete">
                  No workers found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((r) => (
                <TableRow key={r.worker_id}>
                  <TableCell className="text-white">{r.name}</TableCell>
                  <TableCell className="text-white">{r.role}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={r.present} onCheckedChange={(v) => setPresent(r.worker_id, Boolean(v))} />
                      <span className={r.present ? "text-green-400" : "text-yellow-400"}>
                        {r.present ? "Present" : "Absent"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

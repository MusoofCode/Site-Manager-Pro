import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import autoTable from "jspdf-autotable";

type ReportType = "monthly_financial" | "project_summary";

const Reports = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [reportType, setReportType] = useState<ReportType>("monthly_financial");
  const [projectId, setProjectId] = useState<string>("");
  const [from, setFrom] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  const [kpis, setKpis] = useState<{ totalSpent: number; count: number }>({ totalSpent: 0, count: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("id, name, budget, status").order("name");
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      if (reportType === "monthly_financial") {
        const { data, error } = await supabase
          .from("expenses")
          .select("id, date, category, amount, description, projects(name)")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: false });
        if (error) throw error;
        const list = data || [];
        setRows(list);
        setKpis({
          totalSpent: list.reduce((s, e) => s + Number(e.amount), 0),
          count: list.length,
        });
      } else {
        if (!projectId) {
          setRows([]);
          setKpis({ totalSpent: 0, count: 0 });
          return;
        }
        const [projectRes, expensesRes, docsRes, materialsRes] = await Promise.all([
          supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
          supabase.from("expenses").select("date, category, amount, description").eq("project_id", projectId).order("date", { ascending: false }),
          supabase.from("documents").select("name, file_type, file_size, uploaded_at").eq("project_id", projectId).order("uploaded_at", { ascending: false }),
          supabase.from("materials").select("name, category, quantity, unit_cost").eq("project_id", projectId).order("name"),
        ]);

        const p = projectRes.data;
        const expenses = expensesRes.data || [];
        const docs = docsRes.data || [];
        const mats = materialsRes.data || [];

        const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
        setKpis({ totalSpent: spent, count: expenses.length });

        setRows([
          { section: "Project", data: p },
          { section: "Expenses", data: expenses },
          { section: "Documents", data: docs },
          { section: "Materials", data: mats },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  const title = useMemo(() => {
    if (reportType === "monthly_financial") return `Financial Report (${from} → ${to})`;
    const projectName = projects.find((p) => p.id === projectId)?.name;
    return projectName ? `Project Report — ${projectName}` : "Project Report";
  }, [from, to, reportType, projectId, projects]);

  const exportExcel = () => {
    if (reportType === "monthly_financial") {
      const data = rows.map((r) => ({
        Date: r.date,
        Project: r.projects?.name ?? "",
        Category: r.category,
        Amount: Number(r.amount),
        Description: r.description ?? "",
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");
      XLSX.writeFile(wb, `financial_${from}_to_${to}.xlsx`);
      return;
    }

    // Project summary workbook
    const wb = XLSX.utils.book_new();
    const sectionMap = new Map(rows.map((r) => [r.section, r.data]));
    const project = sectionMap.get("Project") || {};
    const expenses = sectionMap.get("Expenses") || [];
    const docs = sectionMap.get("Documents") || [];
    const mats = sectionMap.get("Materials") || [];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([project]), "Project");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses), "Expenses");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(docs), "Documents");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mats), "Materials");
    XLSX.writeFile(wb, `project_${projectId || "report"}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(11);
    doc.text(`Total spent: $${Number(kpis.totalSpent).toLocaleString()}  •  Rows: ${kpis.count}`, 14, 24);

    if (reportType === "monthly_financial") {
      autoTable(doc, {
        startY: 30,
        head: [["Date", "Project", "Category", "Amount", "Description"]],
        body: rows.map((r) => [
          r.date,
          r.projects?.name ?? "",
          r.category,
          `$${Number(r.amount).toLocaleString()}`,
          r.description ?? "",
        ]),
      });
      doc.save(`financial_${from}_to_${to}.pdf`);
      return;
    }

    const sectionMap = new Map(rows.map((r) => [r.section, r.data]));
    const project = sectionMap.get("Project") || {};
    const expenses = sectionMap.get("Expenses") || [];
    const docsRows = sectionMap.get("Documents") || [];
    const mats = sectionMap.get("Materials") || [];

    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: Object.entries(project).map(([k, v]) => [k, String(v ?? "")]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Expenses", "Category", "Amount", "Description"]],
      body: expenses.map((e: any) => [e.date, e.category, `$${Number(e.amount).toLocaleString()}`, e.description ?? ""]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Documents", "Type", "Size", "Uploaded"]],
      body: docsRows.map((d: any) => [d.name, d.file_type, `${Math.round((d.file_size || 0) / 1024)} KB`, d.uploaded_at]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Materials", "Category", "Qty", "Unit Cost"]],
      body: mats.map((m: any) => [m.name, m.category, m.quantity, `$${Number(m.unit_cost).toFixed(2)}`]),
    });

    doc.save(`project_${projectId || "report"}.pdf`);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white">Reports</h1>
        <p className="text-construction-concrete">Generate PDF & Excel exports</p>
      </div>

      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Report Builder</CardTitle>
            <p className="text-construction-concrete text-sm">{title}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportPdf} variant="outline" className="border-construction-steel text-construction-concrete hover:text-white">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={exportExcel} className="bg-gradient-hero hover:opacity-90">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-construction-concrete text-sm mb-2">Type</p>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-construction-slate border-construction-steel z-50">
                  <SelectItem value="monthly_financial">Monthly Financial</SelectItem>
                  <SelectItem value="project_summary">Project Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly_financial" ? (
              <>
                <div>
                  <p className="text-construction-concrete text-sm mb-2">From</p>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-construction-dark border border-construction-steel/30 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <p className="text-construction-concrete text-sm mb-2">To</p>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-construction-dark border border-construction-steel/30 rounded-md px-3 py-2 text-white"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <p className="text-construction-concrete text-sm mb-2">Project</p>
                <Select value={projectId} onValueChange={(v) => setProjectId(v)}>
                  <SelectTrigger className="bg-construction-dark border-construction-steel text-white">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-construction-slate border-construction-steel z-50">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-construction-concrete text-sm">
              Total spent: <span className="text-white font-medium">${Number(kpis.totalSpent).toLocaleString()}</span> • Rows: <span className="text-white font-medium">{kpis.count}</span>
            </p>
            <Button onClick={run} disabled={loading} className="bg-gradient-hero hover:opacity-90">
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportType === "monthly_financial" ? (
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-white">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-construction-concrete">Date</TableHead>
                  <TableHead className="text-construction-concrete">Project</TableHead>
                  <TableHead className="text-construction-concrete">Category</TableHead>
                  <TableHead className="text-construction-concrete">Amount</TableHead>
                  <TableHead className="text-construction-concrete">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-white">{r.date}</TableCell>
                    <TableCell className="text-white">{r.projects?.name ?? ""}</TableCell>
                    <TableCell className="text-white">{r.category}</TableCell>
                    <TableCell className="text-white">${Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-white">{r.description ?? ""}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-construction-concrete">
                      No expenses in range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-white">Project Summary (Preview)</CardTitle>
          </CardHeader>
          <CardContent className="text-construction-concrete">
            {projectId ? "Use the export buttons for full PDF/Excel outputs." : "Select a project to generate."}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;

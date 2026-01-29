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
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import autoTable from "jspdf-autotable";
import logo from "@/assets/logo.png";

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

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

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SOMPROPERTY";
    workbook.created = new Date();

    const cover = workbook.addWorksheet("Cover");
    cover.getColumn(1).width = 5;
    cover.getColumn(2).width = 40;
    cover.getColumn(3).width = 24;
    cover.getColumn(4).width = 24;

    // Logo
    try {
      const res = await fetch(logo);
      const buf = await res.arrayBuffer();
      const imageId = workbook.addImage({ buffer: buf, extension: "png" });
      cover.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 120, height: 48 } });
    } catch {
      // If image fails, still export a branded sheet.
    }

    cover.mergeCells("B2:D2");
    cover.getCell("B2").value = "SOMPROPERTY";
    cover.getCell("B2").font = { bold: true, size: 20 };

    cover.mergeCells("B3:D3");
    cover.getCell("B3").value = title;
    cover.getCell("B3").font = { bold: true, size: 12 };

    cover.getCell("B5").value = "Summary";
    cover.getCell("B5").font = { bold: true };
    cover.getCell("B6").value = "Total spent";
    cover.getCell("C6").value = Number(kpis.totalSpent);
    cover.getCell("C6").numFmt = "$#,##0";
    cover.getCell("B7").value = "Rows";
    cover.getCell("C7").value = kpis.count;
    cover.getCell("B8").value = "Generated";
    cover.getCell("C8").value = new Date().toLocaleString();

    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FF1F2937" },
    };
    const headerFont = { color: { argb: "FFFFFFFF" }, bold: true };

    if (reportType === "monthly_financial") {
      const sheet = workbook.addWorksheet("Expenses");
      sheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Project", key: "project", width: 24 },
        { header: "Category", key: "category", width: 18 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Description", key: "description", width: 40 },
      ];
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont as any;
      });

      rows.forEach((r) => {
        sheet.addRow({
          date: r.date,
          project: r.projects?.name ?? "",
          category: r.category,
          amount: Number(r.amount),
          description: r.description ?? "",
        });
      });
      sheet.getColumn("amount").numFmt = "$#,##0";
    } else {
      const sectionMap = new Map(rows.map((r) => [r.section, r.data]));
      const project = sectionMap.get("Project") || {};
      const expenses = sectionMap.get("Expenses") || [];
      const docs = sectionMap.get("Documents") || [];
      const mats = sectionMap.get("Materials") || [];

      const projectSheet = workbook.addWorksheet("Project");
      projectSheet.columns = [
        { header: "Field", key: "field", width: 26 },
        { header: "Value", key: "value", width: 48 },
      ];
      projectSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont as any;
      });
      Object.entries(project).forEach(([k, v]) => projectSheet.addRow({ field: k, value: String(v ?? "") }));

      const expensesSheet = workbook.addWorksheet("Expenses");
      expensesSheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Category", key: "category", width: 18 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Description", key: "description", width: 40 },
      ];
      expensesSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont as any;
      });
      (expenses as any[]).forEach((e) => expensesSheet.addRow({ date: e.date, category: e.category, amount: Number(e.amount), description: e.description ?? "" }));
      expensesSheet.getColumn("amount").numFmt = "$#,##0";

      const docsSheet = workbook.addWorksheet("Documents");
      docsSheet.columns = [
        { header: "Name", key: "name", width: 30 },
        { header: "Type", key: "file_type", width: 14 },
        { header: "Size (KB)", key: "file_size", width: 12 },
        { header: "Uploaded", key: "uploaded_at", width: 22 },
      ];
      docsSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont as any;
      });
      (docs as any[]).forEach((d) => docsSheet.addRow({ name: d.name, file_type: d.file_type, file_size: Math.round((d.file_size || 0) / 1024), uploaded_at: d.uploaded_at }));

      const matsSheet = workbook.addWorksheet("Materials");
      matsSheet.columns = [
        { header: "Name", key: "name", width: 26 },
        { header: "Category", key: "category", width: 18 },
        { header: "Qty", key: "quantity", width: 10 },
        { header: "Unit Cost", key: "unit_cost", width: 14 },
      ];
      matsSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont as any;
      });
      (mats as any[]).forEach((m) => matsSheet.addRow({ name: m.name, category: m.category, quantity: m.quantity, unit_cost: Number(m.unit_cost) }));
      matsSheet.getColumn("unit_cost").numFmt = "$#,##0.00";
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = reportType === "monthly_financial"
      ? `financial_${from}_to_${to}.xlsx`
      : `project_${projectId || "report"}.xlsx`;
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
  };

  const exportPdf = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cover header with logo
    try {
      const dataUrl = await fetchAsDataUrl(logo);
      doc.addImage(dataUrl, "PNG", 40, 32, 96, 38);
    } catch {
      // ignore
    }

    doc.setFontSize(18);
    doc.text("SOMPROPERTY", 150, 54);
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(title, 150, 74, { maxWidth: pageWidth - 190 });
    doc.setTextColor(0);

    // KPI strip
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(40, 92, pageWidth - 80, 44, 8, 8, "F");
    doc.setFontSize(10);
    doc.text(`Total spent: $${Number(kpis.totalSpent).toLocaleString()}`, 56, 118);
    doc.text(`Rows: ${kpis.count}`, 240, 118);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 320, 118);

    let startY = 152;

    if (reportType === "monthly_financial") {
      autoTable(doc, {
        startY,
        head: [["Date", "Project", "Category", "Amount", "Description"]],
        headStyles: { fillColor: [31, 41, 55], textColor: 255 },
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
      startY,
      head: [["Field", "Value"]],
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      body: Object.entries(project).map(([k, v]) => [k, String(v ?? "")]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [["Expenses", "Category", "Amount", "Description"]],
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      body: (expenses as any[]).map((e) => [e.date, e.category, `$${Number(e.amount).toLocaleString()}`, e.description ?? ""]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [["Documents", "Type", "Size", "Uploaded"]],
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      body: (docsRows as any[]).map((d) => [d.name, d.file_type, `${Math.round((d.file_size || 0) / 1024)} KB`, d.uploaded_at]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [["Materials", "Category", "Qty", "Unit Cost"]],
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      body: (mats as any[]).map((m) => [m.name, m.category, m.quantity, `$${Number(m.unit_cost).toFixed(2)}`]),
    });

    doc.save(`project_${projectId || "report"}.pdf`);
  };

  return (
    <div className="p-8 space-y-6 page-enter">
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

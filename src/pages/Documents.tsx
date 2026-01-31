import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Trash2, Eye, Folder } from "lucide-react";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Documents = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("__all__");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, []);

  const fetchDocuments = async () => {
    const { data } = await supabase.from("documents").select("*, projects(name)").order("uploaded_at", { ascending: false });
    setDocuments(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id,name").order("name", { ascending: true });
    setProjects((data as any) || []);
  };

  const handleDownload = async (doc: any) => {
    try {
      toast({ title: "Downloading…" });

      // Force a real file download via Storage download()
      const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
      if (error) throw error;

      const blob = data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = String(doc.name || "document.pdf");
      a.download = name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openPreview = async (doc: any) => {
    try {
      setPreviewDoc(doc);
      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewUrl("");

      const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60 * 5);
      if (error) throw error;

      if (!data?.signedUrl) throw new Error("Unable to generate preview link.");
      setPreviewUrl(data.signedUrl);
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
      setPreviewOpen(false);
      setPreviewDoc(null);
      setPreviewUrl("");
    } finally {
      setPreviewLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return documents.filter((d) => {
      if (projectFilter !== "__all__") {
        const pid = d.project_id ?? "__none__";
        if (pid !== projectFilter) return false;
      }

      if (typeFilter !== "__all__") {
        if (String(d.file_type || "").toLowerCase() !== typeFilter) return false;
      }

      if (q) {
        const hay = `${d.name ?? ""} ${d.projects?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const tsRaw = d.uploaded_at ?? d.created_at;
      if ((from || to) && tsRaw) {
        const ts = new Date(tsRaw).getTime();
        if (from && ts < from) return false;
        if (to && ts > to) return false;
      }

      return true;
    });
  }, [documents, fromDate, projectFilter, search, toDate, typeFilter]);

  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of filtered) {
      const key = d.project_id ?? "__none__";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [filtered]);

  const handleDelete = async (doc: any) => {
    try {
      const { error: storageError } = await supabase.storage.from("documents").remove([doc.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("documents").delete().eq("id", doc.id);
      if (dbError) throw dbError;

      toast({ title: "Document deleted successfully" });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-foreground">Documents</h1>
        <p className="text-muted-foreground">Upload, preview, and organize project PDFs.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUpload onSuccess={fetchDocuments} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Project folders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Folder className="h-4 w-4" /> Project folders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              type="button"
              variant={projectFilter === "__all__" ? "secondary" : "ghost"}
              className="w-full justify-between"
              onClick={() => setProjectFilter("__all__")}
            >
              <span>All projects</span>
              <span className="text-xs text-muted-foreground">{filtered.length}</span>
            </Button>
            <Button
              type="button"
              variant={projectFilter === "__none__" ? "secondary" : "ghost"}
              className="w-full justify-between"
              onClick={() => setProjectFilter("__none__")}
            >
              <span>Unassigned</span>
              <span className="text-xs text-muted-foreground">{projectCounts.get("__none__") ?? 0}</span>
            </Button>
            {projects.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant={projectFilter === p.id ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => setProjectFilter(p.id)}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground">{projectCounts.get(p.id) ?? 0}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Filters + list */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base">Documents</CardTitle>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents…"
                  className="md:w-[240px]"
                />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="md:w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="__all__">All types</SelectItem>
                    <SelectItem value="application/pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                  <DatePickerInput value={fromDate} onChange={setFromDate} placeholder="From" className="min-w-0" />
                  <DatePickerInput value={toDate} onChange={setToDate} placeholder="To" className="min-w-0" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                      <FileText className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{doc.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {(doc.file_type || "").toLowerCase().includes("pdf") ? "PDF" : doc.file_type} • {(
                          doc.file_size / 1024
                        ).toFixed(2)}
                        KB
                        {doc.projects?.name ? ` • ${doc.projects.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 md:justify-end">
                    <Button size="sm" variant="outline" onClick={() => openPreview(doc)}>
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <p className="text-center py-10 text-sm text-muted-foreground">No documents match your filters.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setPreviewDoc(null);
            setPreviewUrl("");
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogDescription className="truncate">{previewDoc?.name ?? ""}</DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            {previewLoading && <div className="p-6 text-sm text-muted-foreground">Loading preview…</div>}
            {!previewLoading && previewUrl && (
              <iframe
                title="PDF preview"
                src={previewUrl}
                className="h-[70vh] w-full"
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (previewDoc) handleDownload(previewDoc);
              }}
              disabled={!previewDoc}
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
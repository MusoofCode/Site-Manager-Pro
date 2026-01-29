import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Trash2 } from "lucide-react";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Documents = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    const { data } = await supabase.from("documents").select("*, projects(name)").order("uploaded_at", { ascending: false });
    setDocuments(data || []);
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data } = supabase.storage.from("documents").getPublicUrl(doc.file_path);
      window.open(data.publicUrl, "_blank");
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

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
    <div className="p-8 space-y-6 page-enter">
      <h1 className="text-4xl font-bold text-foreground">Documents</h1>
      <p className="text-construction-concrete">Manage project files</p>

      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader>
          <CardTitle className="text-foreground">Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUpload onSuccess={fetchDocuments} />
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader>
          <CardTitle className="text-foreground">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-construction-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-construction-orange" />
                  <div>
                    <p className="text-foreground font-medium">{doc.name}</p>
                    <p className="text-construction-concrete text-sm">
                      {doc.file_type} • {(doc.file_size / 1024).toFixed(2)} KB
                      {doc.projects && ` • ${doc.projects.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc)}
                    className="border-construction-steel text-construction-concrete hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(doc)}
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-construction-concrete text-center py-8">No documents uploaded yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;
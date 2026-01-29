import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DocumentUploadProps {
  projectId?: string;
  onSuccess: () => void;
}

export const DocumentUpload = ({ projectId, onSuccess }: DocumentUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setProgress(20);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setProgress(50);

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(75);

      const { error: dbError } = await supabase.from("documents").insert({
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        project_id: projectId || null,
      });

      if (dbError) throw dbError;

      setProgress(100);
      toast({ title: "File uploaded successfully" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive
            ? "border-construction-orange bg-construction-orange/10"
            : "border-construction-steel/30 hover:border-construction-steel"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <p className="text-construction-concrete">Uploading...</p>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-construction-concrete mx-auto mb-4" />
            <p className="text-white mb-2">Drag and drop files here</p>
            <p className="text-construction-concrete text-sm mb-4">or</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-hero hover:opacity-90"
            >
              Browse Files
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
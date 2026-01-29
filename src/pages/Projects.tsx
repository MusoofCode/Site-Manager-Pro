import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
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
import { Progress } from "@/components/ui/progress";

const Projects = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data || []);
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectToDelete.id);
      if (error) throw error;
      toast({ title: "Project deleted successfully" });
      fetchProjects();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Projects</h1>
          <p className="text-construction-concrete">Manage construction projects</p>
        </div>
        <Button
          onClick={() => {
            setSelectedProject(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-hero hover:opacity-90 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="bg-gradient-card border-construction-steel/30 hover:shadow-construction transition hover-scale">
            <CardHeader>
              <CardTitle className="text-white">{project.name}</CardTitle>
              <p className="text-construction-concrete text-sm">{project.client_name}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between text-construction-concrete">
                <span>Location:</span>
                <span className="text-white">{project.location}</span>
              </div>
              <div className="flex justify-between text-construction-concrete">
                <span>Status:</span>
                <span className="text-construction-orange font-medium">{project.status}</span>
              </div>
              <div className="flex justify-between text-construction-concrete">
                <span>Budget:</span>
                <span className="text-white">${Number(project.budget).toLocaleString()}</span>
              </div>
              <div>
                <div className="flex justify-between text-construction-concrete text-xs mb-1">
                  <span>Progress</span>
                  <span>{project.progress_percentage}%</span>
                </div>
                <Progress value={project.progress_percentage} className="h-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(project)}
                  className="flex-1 border-construction-steel text-construction-concrete hover:text-white"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setProjectToDelete(project);
                    setDeleteDialogOpen(true);
                  }}
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={selectedProject}
        onSuccess={fetchProjects}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-construction-slate border-construction-steel/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-construction-concrete">
              Are you sure you want to delete "{projectToDelete?.name}"? This will also delete all
              associated expenses and documents.
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

export default Projects;
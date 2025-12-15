import { useState, useEffect } from "react";
import { projectService } from "../services/projectService";
import type { Project } from "../types/projects";
import { toast } from "sonner";
import { useAuthContext } from "@/components/common/AuthProvider";

export const useProjects = () => {
  const { profile } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      // Filter projects for employees
      const filterForEmployee = profile?.role === 'employee' ? profile.user_id : undefined;
      const data = await projectService.getAllProjects(filterForEmployee);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await projectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  };

  // Optimistic update for single project
  const updateProject = (updatedProject: Project) => {
    setProjects(prev => 
      prev.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  // Add new project optimistically
  const addProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
  };

  useEffect(() => {
    if (profile) {
      fetchProjects(true); // Show loading only on initial mount
    }
  }, [profile?.user_id]);

  return {
    projects,
    loading,
    refreshProjects: fetchProjects,
    deleteProject,
    updateProject,
    addProject,
  };
};
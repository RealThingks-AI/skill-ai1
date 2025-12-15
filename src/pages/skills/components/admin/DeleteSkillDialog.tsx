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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Skill } from "@/types/database";

interface DeleteSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  onSuccess: () => void;
}

export const DeleteSkillDialog = ({
  open,
  onOpenChange,
  skill,
  onSuccess
}: DeleteSkillDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!skill) return;

    setLoading(true);
    try {
      // First, delete all user skills associated with this skill
      const { error: userSkillsError } = await supabase
        .from('user_skills')
        .delete()
        .eq('skill_id', skill.id);

      if (userSkillsError) throw userSkillsError;

      // Then, delete the skill itself (cascade will handle subskills if properly configured)
      const { error: skillError } = await supabase
        .from('skills')
        .delete()
        .eq('id', skill.id);

      if (skillError) throw skillError;

      toast({
        title: "Success",
        description: `Skill "${skill.name}" deleted successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast({
        title: "Error",
        description: "Failed to delete skill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Skill</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{skill?.name}"? This action cannot be undone.
            All associated subskills and user ratings will also be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
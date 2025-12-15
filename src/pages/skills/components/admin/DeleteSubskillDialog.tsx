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
import { useToast } from "@/hooks/use-toast";
import { SkillsService } from "@/pages/skills/services/skills.service";
import type { Subskill } from "@/types/database";

interface DeleteSubskillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subskill: Subskill | null;
  onSuccess: () => void;
}

export const DeleteSubskillDialog = ({
  open,
  onOpenChange,
  subskill,
  onSuccess
}: DeleteSubskillDialogProps) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!subskill) return;

    try {
      await SkillsService.deleteSubskill(subskill.id);
      
      toast({
        title: "Success",
        description: "Subskill deleted successfully",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting subskill:', error);
      toast({
        title: "Error",
        description: "Failed to delete subskill",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Subskill</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{subskill?.name}"? This will permanently delete the subskill and all associated ratings. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

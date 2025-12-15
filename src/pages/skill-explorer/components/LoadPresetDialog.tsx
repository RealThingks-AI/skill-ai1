import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { dateFormatters } from "@/utils/formatters";
import { Trash2, Calendar, Layers } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
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

interface Preset {
  id: string;
  preset_name: string;
  selections: Array<{
    id: string;
    category: string;
    skill: string;
    subskill: string;
    subskill_id: string;
    skill_id: string;
    rating: "low" | "medium" | "high";
  }>;
  created_at: string;
  updated_at: string;
}

interface LoadPresetDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onLoad: (selections: Preset['selections']) => void;
}

export function LoadPresetDialog({
  open,
  onClose,
  userId,
  onLoad
}: LoadPresetDialogProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const loadPresets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("skill_explorer_presets")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPresets((data || []) as unknown as Preset[]);
    } catch (error: any) {
      console.error("Error loading presets:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load presets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPresets();
    }
  }, [open, userId]);

  const handleLoad = (preset: Preset) => {
    onLoad(preset.selections);
    toast({
      title: "Preset Loaded",
      description: `"${preset.preset_name}" has been loaded`
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("skill_explorer_presets")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Preset Deleted",
        description: "The preset has been deleted successfully"
      });

      setPresets(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
    } catch (error: any) {
      console.error("Error deleting preset:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete preset",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[min(600px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Load Preset</DialogTitle>
            <DialogDescription>
              Select a saved preset to load its skill selections
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No saved presets yet</p>
                <p className="text-xs mt-1">Save a selection to create your first preset</p>
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate">
                          {preset.preset_name}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {preset.selections.length} skill{preset.selections.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dateFormatters.formatDate(preset.updated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleLoad(preset)}
                          className="h-8"
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(preset.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the preset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavePresetDialogProps {
  open: boolean;
  onClose: () => void;
  selections: Array<{
    id: string;
    category: string;
    skill: string;
    subskill: string;
    subskill_id: string;
    skill_id: string;
    rating: "low" | "medium" | "high";
  }>;
  userId: string;
  onSaved: () => void;
}

export function SavePresetDialog({
  open,
  onClose,
  selections,
  userId,
  onSaved
}: SavePresetDialogProps) {
  const [presetName, setPresetName] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your preset",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("skill_explorer_presets")
        .insert({
          user_id: userId,
          preset_name: presetName.trim(),
          selections: selections
        });

      if (error) throw error;

      toast({
        title: "Preset Saved",
        description: `"${presetName}" has been saved successfully`
      });

      setPresetName("");
      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error saving preset:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save preset",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setPresetName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[min(425px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Save Selection as Preset</DialogTitle>
          <DialogDescription>
            Give your selection a name to save it for later use. You have {selections.length} skill{selections.length !== 1 ? 's' : ''} selected.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              placeholder="e.g., Backend Developer Skills"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && presetName.trim()) {
                  handleSave();
                }
              }}
              maxLength={100}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !presetName.trim()}>
            {saving ? "Saving..." : "Save Preset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Subskill } from "@/types/database";

interface EditSubskillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subskill: Subskill | null;
  onSuccess: () => void;
}

export const EditSubskillModal = ({
  open,
  onOpenChange,
  subskill,
  onSuccess
}: EditSubskillModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (subskill) {
      setName(subskill.name);
      setDescription(subskill.description || "");
    }
  }, [subskill]);

  const handleSubmit = async () => {
    if (!subskill || !name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subskills')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', subskill.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subskill updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating subskill:', error);
      toast({
        title: "Error",
        description: "Failed to update subskill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subskill</DialogTitle>
          <DialogDescription>
            Update the subskill name and description below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="editSubskillName">Subskill Name</Label>
            <Input
              id="editSubskillName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React Hooks"
            />
          </div>
          
          <div>
            <Label htmlFor="editSubskillDescription">Description (Optional)</Label>
            <Textarea
              id="editSubskillDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the subskill..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={!name.trim() || loading}
              className="flex-1"
            >
              {loading ? "Updating..." : "Update Subskill"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Skill } from "@/types/database";

interface EditSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  onSuccess: () => void;
}

export const EditSkillModal = ({
  open,
  onOpenChange,
  skill,
  onSuccess
}: EditSkillModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description || "");
    }
  }, [skill]);

  const handleSubmit = async () => {
    if (!skill || !name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('skills')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', skill.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Skill updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating skill:', error);
      toast({
        title: "Error",
        description: "Failed to update skill",
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
          <DialogTitle>Edit Skill</DialogTitle>
          <DialogDescription>
            Update the skill name and description below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="editSkillName">Skill Name</Label>
            <Input
              id="editSkillName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React"
            />
          </div>
          
          <div>
            <Label htmlFor="editSkillDescription">Description (Optional)</Label>
            <Textarea
              id="editSkillDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the skill..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={!name.trim() || loading}
              className="flex-1"
            >
              {loading ? "Updating..." : "Update Skill"}
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
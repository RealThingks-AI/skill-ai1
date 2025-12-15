import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess: () => void;
}

export const AddSkillModal = ({
  open,
  onOpenChange,
  categoryId,
  onSuccess
}: AddSkillModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('skills')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Skill added successfully",
      });

      setName("");
      setDescription("");
      onSuccess();
    } catch (error) {
      console.error('Error adding skill:', error);
      toast({
        title: "Error",
        description: "Failed to add skill",
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
          <DialogTitle>Add New Skill</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="skillName">Skill Name</Label>
            <Input
              id="skillName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React"
            />
          </div>
          
          <div>
            <Label htmlFor="skillDescription">Description (Optional)</Label>
            <Textarea
              id="skillDescription"
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
              {loading ? "Adding..." : "Add Skill"}
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
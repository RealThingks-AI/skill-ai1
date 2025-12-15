import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddSubskillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillId: string;
  onSuccess: () => void;
}

export const AddSubskillModal = ({
  open,
  onOpenChange,
  skillId,
  onSuccess
}: AddSubskillModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subskills' as any)
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          skill_id: skillId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subskill added successfully",
      });

      setName("");
      setDescription("");
      onSuccess();
    } catch (error) {
      console.error('Error adding subskill:', error);
      toast({
        title: "Error",
        description: "Failed to add subskill",
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
          <DialogTitle>Add New Subskill</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="subskillName">Subskill Name</Label>
            <Input
              id="subskillName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React Hooks"
            />
          </div>
          
          <div>
            <Label htmlFor="subskillDescription">Description (Optional)</Label>
            <Textarea
              id="subskillDescription"
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
              {loading ? "Adding..." : "Add Subskill"}
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
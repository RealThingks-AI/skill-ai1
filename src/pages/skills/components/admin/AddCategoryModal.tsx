import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SkillCategory } from "@/types/database";

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  category?: SkillCategory; // Optional for editing existing category
}

export const AddCategoryModal = ({
  open,
  onOpenChange,
  onSuccess,
  category
}: AddCategoryModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Set initial values when editing
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [category, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from('skill_categories')
          .update({
            name: name.trim(),
            description: description.trim() || null,
          })
          .eq('id', category.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('skill_categories')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            color: '#3B82F6'
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category added successfully",
        });
      }

      setName("");
      setDescription("");
      onSuccess();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: `Failed to ${category ? 'update' : 'add'} category`,
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
          <DialogTitle>
            {category ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Frontend Development"
            />
          </div>
          
          <div>
            <Label htmlFor="categoryDescription">Description (Optional)</Label>
            <Textarea
              id="categoryDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the category..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={!name.trim() || loading}
              className="flex-1"
            >
              {loading 
                ? (category ? "Updating..." : "Adding...") 
                : (category ? "Update Category" : "Add Category")
              }
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
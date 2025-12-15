import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Subskill {
  id: string;
  name: string;
  skill_id: string;
}

interface SubskillWithRating {
  subskill: Subskill;
  rating: "low" | "medium" | "high";
}

interface SubskillSelectionModalProps {
  open: boolean;
  onClose: () => void;
  subskills: Subskill[];
  skillName: string;
  onSubmit: (selections: SubskillWithRating[]) => void;
  submitting: boolean;
  selectedSubskillIds?: string[];
}

export function SubskillSelectionModal({
  open,
  onClose,
  subskills,
  skillName,
  onSubmit,
  submitting,
  selectedSubskillIds = [],
}: SubskillSelectionModalProps) {
  const [selections, setSelections] = useState<Map<string, "low" | "medium" | "high">>(new Map());

  const handleRatingSelect = (subskillId: string, rating: "low" | "medium" | "high") => {
    setSelections((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(subskillId) === rating) {
        newMap.delete(subskillId);
      } else {
        newMap.set(subskillId, rating);
      }
      return newMap;
    });
  };

  const handleSubmit = () => {
    const selectedSubskills: SubskillWithRating[] = Array.from(selections.entries()).map(
      ([subskillId, rating]) => ({
        subskill: subskills.find((s) => s.id === subskillId)!,
        rating,
      })
    );
    onSubmit(selectedSubskills);
    setSelections(new Map());
  };

  const getRatingColor = (rating: "low" | "medium" | "high") => {
    switch (rating) {
      case "high":
        return "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white";
      case "medium":
        return "bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--info-foreground))]";
      case "low":
        return "bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-white";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(1152px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Select Subskills and Ratings for{" "}
            <Badge variant="secondary" className="ml-2">
              {skillName}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-6">
          {subskills.map((subskill) => {
            const isAlreadySelected = selectedSubskillIds.includes(subskill.id);
            
            return (
              <Card 
                key={subskill.id} 
                className={`p-4 transition-colors ${
                  isAlreadySelected 
                    ? 'bg-muted/30 opacity-60' 
                    : 'bg-card hover:bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <p className={`font-medium text-base ${isAlreadySelected ? 'line-through text-muted-foreground' : ''}`}>
                      {subskill.name}
                    </p>
                    {isAlreadySelected && (
                      <Badge variant="secondary" className="text-xs">
                        Already Selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selections.get(subskill.id) === "high" ? "default" : "outline"}
                      className={
                        selections.get(subskill.id) === "high"
                          ? getRatingColor("high")
                          : "bg-card hover:bg-muted"
                      }
                      onClick={() => handleRatingSelect(subskill.id, "high")}
                      disabled={isAlreadySelected}
                    >
                      High
                    </Button>
                    <Button
                      size="sm"
                      variant={selections.get(subskill.id) === "medium" ? "default" : "outline"}
                      className={
                        selections.get(subskill.id) === "medium"
                          ? getRatingColor("medium")
                          : "bg-card hover:bg-muted"
                      }
                      onClick={() => handleRatingSelect(subskill.id, "medium")}
                      disabled={isAlreadySelected}
                    >
                      Medium
                    </Button>
                    <Button
                      size="sm"
                      variant={selections.get(subskill.id) === "low" ? "default" : "outline"}
                      className={
                        selections.get(subskill.id) === "low"
                          ? getRatingColor("low")
                          : "bg-card hover:bg-muted"
                      }
                      onClick={() => handleRatingSelect(subskill.id, "low")}
                      disabled={isAlreadySelected}
                    >
                      Low
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selections.size === 0 || submitting}
          >
            {submitting ? "Submitting..." : `Submit ${selections.size} Selection${selections.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

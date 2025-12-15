import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Selection {
  id: string;
  subskill: string;
  rating: "low" | "medium" | "high";
}

interface SelectedSkillsPillsProps {
  selections: Selection[];
  onRemove: (id: string) => void;
  onUpdateRating: (id: string, rating: "low" | "medium" | "high") => void;
}

export function SelectedSkillsPills({ selections, onRemove, onUpdateRating }: SelectedSkillsPillsProps) {
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);

  const handleUpdateRating = (id: string, rating: "low" | "medium" | "high") => {
    onUpdateRating(id, rating);
    setEditingRatingId(null);
  };

  return (
    <div className="px-6 py-4 border-b bg-muted/10">
      <div className="flex flex-wrap gap-3">
        {selections.map((selection) => (
          <div
            key={selection.id}
            className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 animate-fade-in"
          >
            <span className="text-sm font-medium">{selection.subskill}</span>
            {editingRatingId === selection.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleUpdateRating(selection.id, "low")}
                  className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                    selection.rating === "low"
                      ? "bg-[hsl(var(--warning))] text-white font-medium scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105"
                  }`}
                >
                  L
                </button>
                <button
                  onClick={() => handleUpdateRating(selection.id, "medium")}
                  className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                    selection.rating === "medium"
                      ? "bg-[hsl(var(--info))] text-white font-medium scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105"
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => handleUpdateRating(selection.id, "high")}
                  className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                    selection.rating === "high"
                      ? "bg-[hsl(var(--success))] text-white font-medium scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105"
                  }`}
                >
                  H
                </button>
              </div>
            ) : (
              <Badge
                onDoubleClick={() => setEditingRatingId(selection.id)}
                className={`cursor-pointer text-xs h-5 px-2 transition-all duration-200 hover:scale-110 ${
                  selection.rating === "high"
                    ? "bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success))]/90"
                    : selection.rating === "medium"
                    ? "bg-[hsl(var(--info))] text-white hover:bg-[hsl(var(--info))]/90"
                    : "bg-[hsl(var(--warning))] text-white hover:bg-[hsl(var(--warning))]/90"
                }`}
              >
                {selection.rating === "high" ? "H" : selection.rating === "medium" ? "M" : "L"}
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 hover:bg-destructive/10 transition-all duration-200 hover:scale-110"
              onClick={() => onRemove(selection.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RatingItem {
  id: string;
  type: 'skill' | 'subskill';
  rating: 'high' | 'medium' | 'low';
  name: string;
  comment?: string;
}

interface RatingSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingRatings: RatingItem[];
  onSubmit: (ratingsWithComments: Array<{id: string, type: 'skill' | 'subskill', rating: 'high' | 'medium' | 'low', comment: string}>) => void;
}

export const RatingSubmissionDialog = ({
  open,
  onOpenChange,
  pendingRatings,
  onSubmit
}: RatingSubmissionDialogProps) => {
  const [comments, setComments] = useState<Record<string, string>>({});
  
  const updateComment = (id: string, comment: string) => {
    setComments(prev => ({ ...prev, [id]: comment }));
  };

  const handleSubmit = () => {
    // Validate all ratings have comments
    const missingComments = pendingRatings.filter(rating => !comments[rating.id]?.trim());
    if (missingComments.length > 0) {
      return; // All comments are required
    }

    const ratingsWithComments = pendingRatings.map(rating => ({
      id: rating.id,
      type: rating.type,
      rating: rating.rating,
      comment: comments[rating.id].trim()
    }));

    onSubmit(ratingsWithComments);
    setComments({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    setComments({});
    onOpenChange(false);
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'high':
        return 'bg-success text-success-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const allCommentsProvided = pendingRatings.every(rating => comments[rating.id]?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Submit Your Ratings</DialogTitle>
          <DialogDescription>
            Please provide comments for all {pendingRatings.length} rating{pendingRatings.length > 1 ? 's' : ''} before submission.
            Comments are mandatory and help reviewers understand your skill level.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6 pr-4">
            {pendingRatings.map((rating, index) => (
              <div key={rating.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{rating.name}</h4>
                    <Badge className={getRatingColor(rating.rating)}>
                      {rating.rating.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`comment-${rating.id}`} className="text-sm font-medium">
                    Comment <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={`comment-${rating.id}`}
                    placeholder="Explain your rating level, provide examples of your experience, projects you've worked on, or areas where you excel/need improvement..."
                    value={comments[rating.id] || ""}
                    onChange={(e) => updateComment(rating.id, e.target.value)}
                    className="mt-2 min-h-[80px]"
                    required
                  />
                  {!comments[rating.id]?.trim() && (
                    <p className="text-xs text-destructive mt-1">
                      Comment is required for this rating.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allCommentsProvided}
          >
            Submit {pendingRatings.length} Rating{pendingRatings.length > 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
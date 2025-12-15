import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RatingPill } from "./RatingPill";

interface RatingCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  subskillName?: string;
  currentRating: 'high' | 'medium' | 'low' | null;
  onRatingSubmit: (rating: 'high' | 'medium' | 'low', comment: string) => void;
}

export const RatingCommentDialog = ({
  open,
  onOpenChange,
  skillName,
  subskillName,
  currentRating,
  onRatingSubmit
}: RatingCommentDialogProps) => {
  const [rating, setRating] = useState<'high' | 'medium' | 'low'>(currentRating || 'medium');
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) {
      return; // Comment is required
    }
    onRatingSubmit(rating, comment.trim());
    setComment("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(448px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Rate Your Skill Level</DialogTitle>
          <DialogDescription>
            Rate your proficiency in <strong>{skillName}</strong>
            {subskillName && <> - <strong>{subskillName}</strong></>}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Rating Selection */}
          <div>
            <Label className="text-sm font-medium">Select Your Rating</Label>
            <div className="mt-2">
              <RatingPill
                rating={rating}
                onRatingChange={setRating}
                className="justify-start"
              />
            </div>
          </div>

          {/* Comment Field */}
          <div>
            <Label htmlFor="comment" className="text-sm font-medium">
              Comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Please explain your rating level and provide details about your experience with this skill..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              A comment is required to submit your rating.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!comment.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              Submit Rating
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
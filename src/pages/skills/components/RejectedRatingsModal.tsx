import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, AlertCircle } from "lucide-react";
import type { EmployeeRating, Skill } from "@/types/database";

interface RejectedRatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  ratings: EmployeeRating[];
  skills: Skill[];
  subskills?: any[];
}

export const RejectedRatingsModal = ({
  open,
  onOpenChange,
  categoryName,
  ratings,
  skills,
  subskills = []
}: RejectedRatingsModalProps) => {
  // Filter ratings to only include those from skills in this specific category
  const categorySkillIds = skills.map(skill => skill.id);
  const categoryRatings = ratings.filter(rating => 
    categorySkillIds.includes(rating.skill_id)
  );

  const rejectedRatings = categoryRatings.filter(rating => rating.status === 'rejected');

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'high':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔴';
      default:
        return null;
    }
  };

  const getSkillName = (skillId: string, subskillId?: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return 'Unknown Skill';
    
    if (subskillId) {
      const subskill = subskills.find(s => s.id === subskillId);
      return subskill ? `${skill.name} - ${subskill.name}` : skill.name;
    }
    
    return skill.name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-4 w-4 text-red-500" />
            {categoryName} - Rejected Skills
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {rejectedRatings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rejected skills found for this category.
              </div>
            ) : (
              rejectedRatings.map((rating) => (
                <div
                  key={rating.id}
                  className="p-4 border border-red-200 rounded-lg bg-red-50/50 dark:bg-red-950/20 dark:border-red-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">
                        {getSkillName(rating.skill_id, rating.subskill_id)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-red-100 text-red-800 border-red-300"
                        >
                          {getRatingIcon(rating.rating)} {rating.rating.charAt(0).toUpperCase() + rating.rating.slice(1)} (Self-Rated)
                        </Badge>
                        <Badge 
                          variant="destructive"
                          className="text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {rating.self_comment && (
                    <div className="mb-3 p-2 bg-background/50 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Your Comment:</p>
                      <p className="text-sm text-foreground">{rating.self_comment}</p>
                    </div>
                  )}

                  {rating.approver?.full_name && (
                    <div className="text-xs text-red-600 mb-2">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Rejected by: {rating.approver.full_name}
                    </div>
                  )}
                  
                  {rating.approver_comment && (
                    <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-md border-l-4 border-red-500">
                      <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
                        Rejection Reason:
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-200">
                        {rating.approver_comment}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
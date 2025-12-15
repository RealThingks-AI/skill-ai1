import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, TrendingUp, Minus, TrendingDown } from "lucide-react";
import type { EmployeeRating, Skill } from "@/types/database";
import { dateFormatters } from "@/utils/formatters";
interface PendingRatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  ratings: EmployeeRating[];
  skills: Skill[];
  subskills?: any[];
}
export const PendingRatingsModal = ({
  open,
  onOpenChange,
  categoryName,
  ratings,
  skills,
  subskills = []
}: PendingRatingsModalProps) => {
  // Filter ratings to only include those from skills in this specific category
  const categorySkillIds = skills.map(skill => skill.id);
  const categoryRatings = ratings.filter(rating => categorySkillIds.includes(rating.skill_id));
  const pendingRatings = categoryRatings.filter(rating => rating.status === 'submitted');
  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'high':
        return;
      case 'medium':
        return;
      case 'low':
        return;
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            {categoryName} - Pending Skills
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {pendingRatings.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                No pending skills found for this category.
              </div> : pendingRatings.map(rating => <div key={rating.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {getSkillName(rating.skill_id, rating.subskill_id)}
                    </div>
                    {rating.self_comment && <div className="text-xs text-muted-foreground mt-1">
                        {rating.self_comment}
                      </div>}
                    <div className="text-xs text-yellow-600 mt-1">
                      Submitted: {dateFormatters.formatDate(rating.submitted_at || rating.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRatingIcon(rating.rating)}
                    <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
                      Pending {rating.rating}
                    </Badge>
                  </div>
                </div>)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>;
};
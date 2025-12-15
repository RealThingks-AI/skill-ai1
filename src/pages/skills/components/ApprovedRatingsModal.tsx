import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";
import type { EmployeeRating, Skill } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
interface ApprovedRatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  ratings: EmployeeRating[];
  skills: Skill[];
  subskills?: any[];
  filterRating?: 'high' | 'medium' | 'low';
}
export const ApprovedRatingsModal = ({
  open,
  onOpenChange,
  categoryName,
  ratings,
  skills,
  subskills = [],
  filterRating
}: ApprovedRatingsModalProps) => {
  const navigate = useNavigate();
  const [ratingsWithUsers, setRatingsWithUsers] = useState<(EmployeeRating & { employee_name?: string })[]>([]);
  
  // Filter ratings to only include those from skills in this specific category
  const categorySkillIds = skills.map(skill => skill.id);
  const categoryRatings = ratings.filter(rating => categorySkillIds.includes(rating.skill_id));
  const filteredRatings = filterRating ? categoryRatings.filter(rating => rating.status === 'approved' && rating.rating === filterRating) : categoryRatings.filter(rating => rating.status === 'approved');

  useEffect(() => {
    const fetchUserNames = async () => {
      if (!open || filteredRatings.length === 0) {
        setRatingsWithUsers([]);
        return;
      }
      
      const userIds = [...new Set(filteredRatings.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const enrichedRatings = filteredRatings.map(rating => ({
        ...rating,
        employee_name: profileMap.get(rating.user_id)
      }));
      
      setRatingsWithUsers(enrichedRatings);
    };
    
    fetchUserNames();
  }, [open, ratings, skills, filterRating]);
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
  const handleRatingClick = (rating: EmployeeRating) => {
    onOpenChange(false);
    // Navigate to skills page and scroll to the specific category
    navigate('/skills', { state: { scrollToCategoryId: skills[0]?.category_id, highlightSkillId: rating.skill_id, highlightSubskillId: rating.subskill_id } });
  };
  
  const title = filterRating ? `${categoryName} - ${filterRating.charAt(0).toUpperCase() + filterRating.slice(1)} Rated Skills` : `${categoryName} - All Approved Skills`;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {filterRating && getRatingIcon(filterRating)}
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {ratingsWithUsers.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                No approved skills found for this category.
               </div> : ratingsWithUsers.map(rating => <div key={rating.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {getSkillName(rating.skill_id, rating.subskill_id)}
                    </div>
                    {rating.employee_name && rating.self_comment && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{rating.employee_name}:</span> {rating.self_comment}
                      </div>
                    )}
                     {rating.approver?.full_name && <div className="text-xs text-blue-600 mt-1">
                         Approver: {rating.approver.full_name}
                       </div>}
                     {rating.approver_comment && <div className="text-xs text-muted-foreground mt-1">
                         Comment: {rating.approver_comment}
                       </div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {getRatingIcon(rating.rating)}
                    <Badge 
                      variant={rating.rating === 'high' ? 'default' : rating.rating === 'medium' ? 'secondary' : 'outline'} 
                      className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleRatingClick(rating)}
                    >
                      {rating.rating.charAt(0).toUpperCase() + rating.rating.slice(1)}
                    </Badge>
                  </div>
                </div>)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>;
};
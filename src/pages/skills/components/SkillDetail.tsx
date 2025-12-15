import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Skill, Subskill, UserSkill } from "@/types/database";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RatingPill } from "@/components/common/RatingPill";
import type { EmployeeRating } from "@/types/database";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SkillDetailProps {
  skill: Skill;
  subskills: Subskill[];
  userSkills: EmployeeRating[];
  pendingRatings: Map<string, { type: 'skill' | 'subskill', id: string, rating: 'high' | 'medium' | 'low' }>;
  isManagerOrAbove: boolean;
  onSkillRate: (skillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onSubskillRate: (subskillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onSaveRatings: (ratingsWithComments: Array<{id: string, type: 'skill' | 'subskill', rating: 'high' | 'medium' | 'low', comment: string}>) => void;
  onRefresh: () => void;
}

export const SkillDetail = ({
  skill,
  subskills,
  userSkills,
  pendingRatings,
  isManagerOrAbove,
  onSkillRate,
  onSubskillRate,
  onSaveRatings,
  onRefresh
}: SkillDetailProps) => {
  const [expandedSubskills, setExpandedSubskills] = useState(true);
  const hasSubskills = subskills.length > 0;
  
  // Get current rating from pending ratings or saved ratings
  const getCurrentSkillRating = () => {
    const pending = pendingRatings.get(skill.id);
    if (pending && pending.type === 'skill') return pending.rating;
    return userSkills.find(us => us.skill_id === skill.id && !us.subskill_id)?.rating as 'high' | 'medium' | 'low' | null;
  };
  
  const getCurrentSubskillRating = (subskillId: string) => {
    const pending = pendingRatings.get(subskillId);
    if (pending && pending.type === 'subskill') return pending.rating;
    return userSkills.find(us => us.subskill_id === subskillId)?.rating as 'high' | 'medium' | 'low' | null;
  };
  
  const userSkillRating = getCurrentSkillRating();
  const userSkillStatus = userSkills.find(us => us.skill_id === skill.id && !us.subskill_id)?.status;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground border-muted';
      case 'submitted':
        return 'bg-slate-500 text-white border-slate-500';
      case 'approved':
        return 'bg-emerald-500 text-white border-emerald-500';
      case 'rejected':
        return 'bg-red-500 text-white border-red-500';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const { toast } = useToast();
  const [comments, setComments] = useState<Record<string, string>>({});
  const updateComment = (id: string, value: string) => setComments(prev => ({ ...prev, [id]: value }));
  
  const handleSaveRatings = async () => {
    // Save ONLY ratings related to this skill and its subskills that have comments
    const subskillIds = new Set(subskills.map(s => s.id));
    const items = Array.from(pendingRatings.entries())
      .filter(([id, r]) => (r.type === 'skill' && id === skill.id) || (r.type === 'subskill' && subskillIds.has(id)))
      .map(([id, r]) => ({
        id,
        type: r.type,
        rating: r.rating,
        comment: (comments[id] || "").trim(),
      }))
      .filter(i => i.comment); // Only include items with comments

    if (items.length === 0) {
      toast({ title: "No ratings to save", description: "Please add ratings with comments first.", variant: "destructive" });
      return;
    }

    try {
      const ret = onSaveRatings(items) as unknown as Promise<void> | void;
      if (ret && typeof (ret as any).then === "function") {
        await (ret as Promise<void>);
      }
      // Do not refresh or close modal; UI will update optimistically
    } catch (e) {
      toast({ title: "Failed to submit ratings", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    }
  };

  return (
     <ScrollArea className="h-[calc(95vh-120px)] max-h-[800px]">
      <div className="p-6 space-y-6">
        {/* Skill Header */}

        {/* Direct Skill Rating (if no subskills) */}
        {!hasSubskills && (
          <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Rate this skill</h4>
                    <p className="text-sm text-muted-foreground">
                      How would you rate your proficiency in {skill.name}?
                    </p>
                  </div>
                  <RatingPill 
                    rating={userSkillRating} 
                    onRatingChange={rating => onSkillRate(skill.id, rating)} 
                    disabled={userSkillStatus === 'submitted' || userSkillStatus === 'approved'} 
                  />
                </div>
                <div>
                  <Input
                    placeholder="Add your comment..."
                    value={comments[skill.id] || ""}
                    onChange={(e) => updateComment(skill.id, e.target.value)}
                    disabled={userSkillStatus === 'submitted' || userSkillStatus === 'approved'}
                  />
                </div>
              </CardContent>
          </Card>
        )}

        {/* Subskills Accordion */}
        {hasSubskills && (
          <Collapsible open={expandedSubskills} onOpenChange={setExpandedSubskills}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-left">
                <span>Subskills ({subskills.length})</span>
                <motion.div 
                  animate={{ rotate: expandedSubskills ? 90 : 0 }} 
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <motion.div 
                initial={false} 
                animate={{
                  height: expandedSubskills ? "auto" : 0,
                  opacity: expandedSubskills ? 1 : 0
                }} 
                transition={{ duration: 0.2 }} 
                className="space-y-3 mt-4"
              >
                {subskills.map((subskill, index) => {
                  const userSubskillRating = getCurrentSubskillRating(subskill.id);
                  const userSubskillStatus = userSkills.find(us => us.subskill_id === subskill.id)?.status;
                  
                  return (
                    <motion.div 
                      key={subskill.id} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-foreground">
                                    {subskill.name}
                                  </h5>
                                  {userSubskillStatus && (
                                    <Badge variant="secondary" className={`text-xs ${getStatusColor(userSubskillStatus)}`}>
                                      {userSubskillStatus}
                                    </Badge>
                                  )}
                                </div>
                                {subskill.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {subskill.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <RatingPill 
                                  rating={userSubskillRating} 
                                  onRatingChange={rating => onSubskillRate(subskill.id, rating)} 
                                  disabled={userSubskillStatus === 'submitted' || userSubskillStatus === 'approved'} 
                                />
                                <Input
                                  placeholder="Add your comment..."
                                  value={comments[subskill.id] || ""}
                                  onChange={(e) => updateComment(subskill.id, e.target.value)}
                                  disabled={userSubskillStatus === 'submitted' || userSubskillStatus === 'approved'}
                                  className="w-56"
                                />
                              </div>
                            </div>
                          </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Save Ratings Button */}
        {!isManagerOrAbove && (() => {
          const subskillIds = new Set(subskills.map(s => s.id));
          const countWithComments = Array.from(pendingRatings.entries())
            .filter(([id, r]) => (r.type === 'skill' && id === skill.id) || (r.type === 'subskill' && subskillIds.has(id)))
            .filter(([id]) => (comments[id] || "").trim().length > 0)
            .length;
          return countWithComments > 0 ? (
            <Button onClick={handleSaveRatings}>
              Save Ratings ({countWithComments})
            </Button>
          ) : null;
        })()}
      </div>

    </ScrollArea>
  );
};
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Edit, Trash2 } from "lucide-react";
import { SkillRow } from "./SkillRow";
import { AddSkillModal } from "./admin/AddSkillModal";
import type { SkillCategory, Skill, Subskill, UserSkill } from "@/types/database";

interface SkillCategoryCardProps {
  category: SkillCategory;
  skills: Skill[];
  subskills: Subskill[];
  userSkills: UserSkill[];
  pendingRatings: Map<string, { type: 'skill' | 'subskill', id: string, rating: 'high' | 'medium' | 'low' }>;
  isManagerOrAbove: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSkillRate: (skillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onSubskillRate: (subskillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onRefresh: () => void;
  onEditCategory?: () => void;
  onDeleteCategory?: () => void;
}

export const SkillCategoryCard = ({
  category,
  skills,
  subskills,
  userSkills,
  pendingRatings,
  isManagerOrAbove,
  isExpanded,
  onToggle,
  onSkillRate,
  onSubskillRate,
  onRefresh,
  onEditCategory,
  onDeleteCategory
}: SkillCategoryCardProps) => {
  const [showAddSkill, setShowAddSkill] = useState(false);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                )}
                <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {skills.length}
                </Badge>
                {isManagerOrAbove && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={onEditCategory}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDeleteCategory}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {category.description}
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isManagerOrAbove && (
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSkill(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Skill
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No skills in this category yet.
                </p>
              ) : (
                skills.map((skill) => {
                  const skillSubskills = subskills.filter(s => s.skill_id === skill.id);
                  
                  return (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      subskills={skillSubskills}
                      userSkills={userSkills}
                      pendingRatings={pendingRatings}
                      isManagerOrAbove={isManagerOrAbove}
                      onSkillRate={onSkillRate}
                      onSubskillRate={onSubskillRate}
                      onRefresh={onRefresh}
                    />
                  );
                })
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <AddSkillModal
        open={showAddSkill}
        onOpenChange={setShowAddSkill}
        categoryId={category.id}
        onSuccess={() => {
          setShowAddSkill(false);
          onRefresh();
        }}
      />
    </Card>
  );
};
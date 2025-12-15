import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { SkillDetailModal } from "./SkillDetailModal";
interface UserSkillDetail {
  skillId: string;
  skillName: string;
  classification: 'expert' | 'intermediate' | 'beginner';
  totalPoints: number;
  maxPoints: number;
  subskills: {
    subskillId: string;
    subskillName: string;
    rating: 'high' | 'medium' | 'low';
  }[];
}
interface UserDetailModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  categoryName: string;
  skills: UserSkillDetail[];
}
export const UserDetailModal = ({
  open,
  onClose,
  userName,
  userEmail,
  categoryName,
  skills
}: UserDetailModalProps) => {
  const [selectedSkill, setSelectedSkill] = useState<UserSkillDetail | null>(null);
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'expert':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'beginner':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getClassificationPriority = (classification: string) => {
    switch (classification) {
      case 'expert': return 3;
      case 'intermediate': return 2;
      case 'beginner': return 1;
      default: return 0;
    }
  };

  return <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {userName} - {categoryName}
            </DialogTitle>
            
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Skills in this category</h3>
            {[...skills].sort((a, b) => getClassificationPriority(b.classification) - getClassificationPriority(a.classification)).map(skill => <Card key={skill.skillId} className="p-4 hover:shadow-md transition-all cursor-pointer border-border/50" onClick={() => setSelectedSkill(skill)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{skill.skillName}</h4>
                    
                  </div>
                  <Badge variant="outline" className={getClassificationColor(skill.classification)}>
                    {skill.classification}
                  </Badge>
                </div>
              </Card>)}
          </div>
        </DialogContent>
      </Dialog>

      {selectedSkill && <SkillDetailModal open={!!selectedSkill} onClose={() => setSelectedSkill(null)} skillName={selectedSkill.skillName} subskills={selectedSkill.subskills} />}
    </>;
};
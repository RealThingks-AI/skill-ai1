import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
type UserClassification = 'expert' | 'intermediate' | 'beginner';
interface CategorySkillsData {
  categoryName: string;
  categoryColor: string;
  userName: string;
  userEmail: string;
  percentage: number;
  classification: UserClassification;
  skills: {
    skillId: string;
    skillName: string;
    classification: UserClassification;
    subskills: {
      subskillId: string;
      subskillName: string;
      rating: 'high' | 'medium' | 'low';
    }[];
  }[];
}
interface CategorySkillsModalProps {
  open: boolean;
  onClose: () => void;
  data: CategorySkillsData | null;
}
export const CategorySkillsModal = ({
  open,
  onClose,
  data
}: CategorySkillsModalProps) => {
  if (!data) return null;
  const getClassificationColor = (classification: UserClassification) => {
    if (classification === 'expert') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (classification === 'intermediate') return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  };
  const getRatingColor = (rating: 'high' | 'medium' | 'low') => {
    if (rating === 'high') return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (rating === 'medium') return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
  };
  const getRatingLabel = (rating: 'high' | 'medium' | 'low') => {
    return rating.charAt(0).toUpperCase() + rating.slice(1);
  };
  const getClassificationLabel = (classification: UserClassification) => {
    return classification.charAt(0).toUpperCase() + classification.slice(1);
  };
  const getClassificationPriority = (classification: UserClassification) => {
    switch (classification) {
      case 'expert':
        return 3;
      case 'intermediate':
        return 2;
      case 'beginner':
        return 1;
      default:
        return 0;
    }
  };

  // Sort skills by classification (Expert → Intermediate → Beginner)
  const sortedSkills = [...data.skills].sort((a, b) => {
    return getClassificationPriority(b.classification) - getClassificationPriority(a.classification);
  });
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{
            backgroundColor: data.categoryColor
          }} />
            <DialogTitle className="text-xl">{data.categoryName}</DialogTitle>
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <p className="text-sm font-medium text-foreground">{data.userName}</p>
            
          </div>
        </DialogHeader>

        <Separator />

        {/* Category Summary */}
        <Card className="p-4 bg-muted/30 border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-foreground">Category Proficiency</h3>
              <Badge className={getClassificationColor(data.classification)}>
                {getClassificationLabel(data.classification)}
              </Badge>
            </div>
            <div className="text-right">
              
              
            </div>
          </div>
          <Progress value={data.percentage} className="h-2" />
        </Card>

        <Separator />

        {/* Skills List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Skills Breakdown</h3>
          
          {sortedSkills.map(skill => {
          return <Card key={skill.skillId} className="p-4 border-border/50">
                <div className="space-y-3">
                  {/* Skill Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{skill.skillName}</h4>
                        <Badge className={getClassificationColor(skill.classification)} variant="outline">
                          {getClassificationLabel(skill.classification)}
                        </Badge>
                      </div>
                      
                    </div>
                  </div>

                  {/* Subskills */}
                  {skill.subskills.length > 0 && <div className="mt-3 pt-3 border-t border-border/50">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {skill.subskills.map(subskill => <div key={subskill.subskillId} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                            <span className="text-sm text-foreground truncate flex-1">
                              {subskill.subskillName}
                            </span>
                            <Badge className={getRatingColor(subskill.rating)} variant="outline">
                              {getRatingLabel(subskill.rating)}
                            </Badge>
                          </div>)}
                      </div>
                    </div>}
                </div>
              </Card>;
        })}
        </div>
      </DialogContent>
    </Dialog>;
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Skill {
  id: string;
  name: string;
  category_id: string;
}

interface SkillSelectionModalProps {
  open: boolean;
  onClose: () => void;
  skills: Skill[];
  categoryName: string;
  onSelectSkill: (skill: Skill) => void;
}

export function SkillSelectionModal({
  open,
  onClose,
  skills,
  categoryName,
  onSelectSkill,
}: SkillSelectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(1152px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Select Skill from{" "}
            <Badge variant="secondary" className="ml-2">
              {categoryName}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {skills.map((skill) => (
            <Card
              key={skill.id}
              className="p-6 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all hover:scale-[1.02] bg-card"
              onClick={() => onSelectSkill(skill)}
            >
              <div className="text-center">
                <p className="font-medium text-base">{skill.name}</p>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

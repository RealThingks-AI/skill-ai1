import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface SkillDetailModalProps {
  open: boolean;
  onClose: () => void;
  skillName: string;
  subskills: {
    subskillId: string;
    subskillName: string;
    rating: 'high' | 'medium' | 'low';
  }[];
}

export const SkillDetailModal = ({ 
  open, 
  onClose, 
  skillName, 
  subskills 
}: SkillDetailModalProps) => {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'high': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{skillName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Approved subskill ratings</p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {subskills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No subskills for this skill
            </p>
          ) : (
            subskills.map((subskill) => (
              <Card 
                key={subskill.subskillId}
                className="p-4 border-border/50"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground flex-1">
                    {subskill.subskillName}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={getRatingColor(subskill.rating)}
                  >
                    {subskill.rating}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

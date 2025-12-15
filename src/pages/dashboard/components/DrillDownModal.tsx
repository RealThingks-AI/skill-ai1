import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "lucide-react";

interface DrillDownUser {
  userId: string;
  fullName: string;
  email: string;
  classification?: string;
  skillName?: string;
  rating?: string;
  percentage?: number;
}

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: DrillDownUser[];
}

export const DrillDownModal = ({ isOpen, onClose, title, users }: DrillDownModalProps) => {
  const getBadgeVariant = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'expert':
      case 'high':
        return 'default';
      case 'intermediate':
      case 'medium':
        return 'secondary';
      case 'beginner':
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {users.length === 1 ? 'person' : 'people'} found
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No data available
              </div>
            ) : (
              users.map((user, idx) => (
                <div
                  key={`${user.userId}-${idx}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{user.fullName}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.skillName && (
                        <p className="text-xs text-muted-foreground mt-1">{user.skillName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.percentage !== undefined && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {user.percentage.toFixed(0)}%
                      </span>
                    )}
                    {(user.classification || user.rating) && (
                      <Badge variant={getBadgeVariant(user.classification || user.rating || '')}>
                        {user.classification || user.rating}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

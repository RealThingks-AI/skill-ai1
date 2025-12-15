import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, User } from "lucide-react";
import type { RecentAction } from "../hooks/useApprovals";

interface ApprovedActionsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvedActions: RecentAction[];
}

export const ApprovedActionsList = ({ 
  open, 
  onOpenChange, 
  approvedActions 
}: ApprovedActionsListProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(768px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approved Today ({approvedActions.length})
          </DialogTitle>
          <DialogDescription>
            Skill assessments approved today by you and other tech leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {approvedActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approvals made today.
            </div>
          ) : (
            approvedActions.map((action) => (
              <Card key={action.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{action.title}</h4>
                    <Badge className="bg-green-100 text-green-800">
                      Approved
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Approved by: {action.approver}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {action.date}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
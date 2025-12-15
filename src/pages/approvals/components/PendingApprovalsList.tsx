import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Clock } from "lucide-react";
import type { ApprovalRequest } from "../hooks/useApprovals";

interface PendingApprovalsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvals: ApprovalRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const PendingApprovalsList = ({ 
  open, 
  onOpenChange, 
  approvals, 
  onApprove, 
  onReject 
}: PendingApprovalsListProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-orange-100 text-orange-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(896px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pending Approvals ({approvals.length})</DialogTitle>
          <DialogDescription>
            All skill assessments awaiting your review and approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending approvals at this time.
            </div>
          ) : (
            approvals.map((approval) => (
              <Card key={approval.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{approval.title}</h4>
                        <Badge className={getPriorityColor(approval.priority)}>
                          {approval.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{approval.description}</p>
                      
                      {approval.self_comment && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Employee comment:</strong> {approval.self_comment}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {approval.requester}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {approval.submitDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {approval.dueDate}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="success" onClick={() => onApprove(approval.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onReject(approval.id)}>
                      Reject
                    </Button>
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
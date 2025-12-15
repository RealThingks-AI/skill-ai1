import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Calendar } from "lucide-react";
import type { ApprovalRequest } from "../types/approvals";
import { getPriorityColor } from "../utils/approvalHelpers";

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const ApprovalCard = ({ approval, onApprove, onReject }: ApprovalCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{approval.title}</CardTitle>
          <Badge className={getPriorityColor(approval.priority)}>
            {approval.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{approval.description}</p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
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
          <Button size="sm" variant="success" onClick={() => onApprove?.(approval.id)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject?.(approval.id)}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
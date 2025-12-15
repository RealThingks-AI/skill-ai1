import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
interface PendingApprovalsStatsProps {
  count: number;
  highPriorityCount: number;
  onClick: () => void;
}
export const PendingApprovalsStats = ({
  count,
  highPriorityCount,
  onClick
}: PendingApprovalsStatsProps) => {
  return <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
        <div className="flex items-center gap-2">
          {count > 0 && <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {count}
            </Badge>}
          <Clock className="h-4 w-4 text-orange-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        
      </CardContent>
    </Card>;
};
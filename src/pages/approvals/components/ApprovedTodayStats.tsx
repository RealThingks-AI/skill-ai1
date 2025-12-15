import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface ApprovedTodayStatsProps {
  count: number;
  onClick: () => void;
}

export const ApprovedTodayStats = ({ count, onClick }: ApprovedTodayStatsProps) => {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors" 
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {count}
            </Badge>
          )}
          <CheckCircle className="h-4 w-4 text-green-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">
          Today's approved requests • Click to view
        </p>
      </CardContent>
    </Card>
  );
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle } from "lucide-react";

interface RejectedTodayStatsProps {
  count: number;
  onClick: () => void;
}

export const RejectedTodayStats = ({ count, onClick }: RejectedTodayStatsProps) => {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors" 
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {count}
            </Badge>
          )}
          <XCircle className="h-4 w-4 text-red-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">
          Today's rejected requests • Click to view
        </p>
      </CardContent>
    </Card>
  );
};
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';
import { MonthlyManpower } from '../../types/projects';
import { dateFormatters } from "@/utils/formatters";

interface MonthlyManpowerCardProps {
  monthlyLimits: MonthlyManpower[];
  totalAllocation: number;
}

export default function MonthlyManpowerCard({ monthlyLimits, totalAllocation }: MonthlyManpowerCardProps) {
  const totalManpower = totalAllocation / 100;
  
  if (!monthlyLimits || monthlyLimits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        Monthly Manpower Breakdown
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {monthlyLimits.map((month) => {
          const utilizationPercent = month.limit > 0 ? (totalManpower / month.limit) * 100 : 0;
          const isOverLimit = totalManpower > month.limit;
          
          return (
            <Card key={month.month} className={`p-3 space-y-2 ${isOverLimit ? 'border-destructive' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {dateFormatters.formatMonthYear(month.month + '-01')}
                </span>
                <span className={`text-xs font-semibold ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {totalManpower.toFixed(2)} / {month.limit.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(utilizationPercent, 100)} 
                className={`h-2 ${isOverLimit ? '[&>*]:bg-destructive' : ''}`}
              />
              <p className="text-xs text-muted-foreground">
                {utilizationPercent.toFixed(0)}% utilized
              </p>
            </Card>
          );
        })}
      </div>
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <div className="flex-1">
          <p className="text-sm font-medium">Total Project Manpower</p>
          <p className="text-xs text-muted-foreground">Across all months</p>
        </div>
        <span className="text-lg font-bold text-primary">{totalManpower.toFixed(2)}</span>
      </div>
    </div>
  );
}

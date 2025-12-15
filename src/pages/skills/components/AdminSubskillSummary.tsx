import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Subskill } from "@/types/database";

interface AdminSubskillSummaryProps {
  subskill: Subskill;
}

interface RatingSummary {
  low: number;
  medium: number;
  high: number;
  total: number;
}

export const AdminSubskillSummary = ({ subskill }: AdminSubskillSummaryProps) => {
  const [summary, setSummary] = useState<RatingSummary>({
    low: 0,
    medium: 0,
    high: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      
      // Fetch all approved ratings for this subskill
      const { data: ratings, error } = await supabase
        .from('employee_ratings')
        .select('rating')
        .eq('subskill_id', subskill.id)
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching rating summary:', error);
        setLoading(false);
        return;
      }

      const summary: RatingSummary = {
        low: 0,
        medium: 0,
        high: 0,
        total: 0
      };

      ratings?.forEach(r => {
        if (r.rating === 'low') summary.low++;
        else if (r.rating === 'medium') summary.medium++;
        else if (r.rating === 'high') summary.high++;
      });

      summary.total = summary.low + summary.medium + summary.high;
      setSummary(summary);
      setLoading(false);
    };

    fetchSummary();
  }, [subskill.id]);

  const getRatingColor = (rating: string) => {
    if (rating === 'high') return 'bg-success text-success-foreground';
    if (rating === 'medium') return 'bg-info text-info-foreground';
    return 'bg-warning text-warning-foreground';
  };

  const getRatingLabel = (rating: string) => {
    if (rating === 'high') return 'H';
    if (rating === 'medium') return 'M';
    return 'L';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-4 items-center gap-4 p-3 border rounded-lg bg-card/50">
        <div className="col-span-1">
          <h5 className="text-sm font-medium text-foreground">{subskill.name}</h5>
          {subskill.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {subskill.description}
            </p>
          )}
        </div>
        <div className="col-span-3 flex justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 items-center gap-4 p-3 border rounded-lg bg-card/50 hover:bg-card transition-colors">
      {/* Col 1: Subskill Name and Description */}
      <div className="col-span-1 min-w-0">
        <h5 className="text-sm font-medium text-foreground">{subskill.name}</h5>
        {subskill.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {subskill.description}
          </p>
        )}
      </div>

      {/* Col 2-4: Rating Summary */}
      <div className="col-span-3 flex items-center justify-center gap-3">
        {summary.total === 0 ? (
          <span className="text-sm text-muted-foreground">No approved ratings</span>
        ) : (
          <>
            <span className="text-sm font-medium text-muted-foreground">
              ({summary.total} {summary.total === 1 ? 'employee' : 'employees'})
            </span>
            <div className="flex items-center gap-2">
              {summary.low > 0 && (
                <Badge className={`${getRatingColor('low')} text-xs h-6 px-3`}>
                  {summary.low} {getRatingLabel('low')}
                </Badge>
              )}
              {summary.medium > 0 && (
                <Badge className={`${getRatingColor('medium')} text-xs h-6 px-3`}>
                  {summary.medium} {getRatingLabel('medium')}
                </Badge>
              )}
              {summary.high > 0 && (
                <Badge className={`${getRatingColor('high')} text-xs h-6 px-3`}>
                  {summary.high} {getRatingLabel('high')}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

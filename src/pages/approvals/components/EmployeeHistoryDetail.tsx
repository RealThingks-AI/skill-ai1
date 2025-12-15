import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Trash2 } from "lucide-react";
import { dateFormatters } from "@/utils/formatters";
import type { GroupedHistoricalApproval } from "../hooks/useApprovalHistory";

interface EmployeeHistoryDetailProps {
  employee: GroupedHistoricalApproval;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: (ratingId: string) => void;
  isAdmin?: boolean;
}

export const EmployeeHistoryDetail = ({ employee, isExpanded, onToggle, onDelete, isAdmin }: EmployeeHistoryDetailProps) => {

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "high":
        return "bg-emerald-500 text-white";
      case "medium":
        return "bg-blue-500 text-white";
      case "low":
        return "bg-amber-500 text-white";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "approved" 
      ? "bg-green-100 text-green-800" 
      : "bg-red-100 text-red-800";
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer group">
            <div className="grid grid-cols-5 gap-4 items-center flex-1">
              <div className="font-medium text-sm">{employee.employeeName}</div>
              <Badge variant="secondary" className="bg-slate-500 text-white text-xs whitespace-nowrap justify-self-center">
                {employee.totalCount} Rating{employee.totalCount > 1 ? "s" : ""}
              </Badge>
              <div className="text-sm text-muted-foreground">{employee.employeeEmail}</div>
              <div className="text-xs text-muted-foreground">
                {employee.ratings[0]?.approved_at 
                  ? dateFormatters.formatDate(employee.ratings[0].approved_at)
                  : "N/A"}
              </div>
              <div className="justify-self-end">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {isExpanded ? "Hide" : "View"}
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t bg-muted/20">
          <div className="p-4 space-y-3">
            {/* Group ratings by category */}
            {(() => {
              const ratingsByCategory = employee.ratings.reduce((acc, rating) => {
                const categoryName = (rating.skill as any)?.skill_categories?.name || 'Uncategorized';
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(rating);
                return acc;
              }, {} as Record<string, typeof employee.ratings>);

              const categoryEntries = Object.entries(ratingsByCategory).sort((a, b) => a[0].localeCompare(b[0]));

              return categoryEntries.map(([categoryName, ratings]) => (
                <Collapsible key={categoryName} className="border rounded-lg">
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm">{categoryName}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {ratings.length} subskill{ratings.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="space-y-3 p-4 pt-0 border-t">
                      {ratings.map(rating => {
                        const skillName = rating.skill?.name || '';
                        const subskillName = rating.subskill?.name || skillName;
                        const displayName = rating.subskill ? `${skillName} - ${subskillName}` : skillName;

                        return (
                          <div key={rating.id} className="border rounded-lg p-4 bg-background">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-medium text-sm">{displayName}</h4>
                                <Badge className={getRatingColor(rating.rating)}>
                                  {rating.rating.toUpperCase()}
                                </Badge>
                                <Badge className={getStatusColor(rating.status)}>
                                  {rating.status.toUpperCase()}
                                </Badge>
                              </div>
                            </div>

                            {rating.self_comment && (
                              <div className="mb-2 p-2 bg-muted rounded text-sm">
                                <strong>Employee comment:</strong> {rating.self_comment}
                              </div>
                            )}

                            {rating.approver_comment && (
                              <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                                <strong>Approver comment:</strong> {rating.approver_comment}
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground mt-2">
                              {rating.approved_at && (
                                <>
                                  {rating.status === "approved" ? "Approved" : "Rejected"} by{" "}
                                  {rating.approver?.full_name || "Unknown"} on{" "}
                                  {dateFormatters.formatDateTime(rating.approved_at)}
                                </>
                              )}
                            </div>

                            {isAdmin && onDelete && (
                              <div className="mt-3 pt-3 border-t">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => onDelete(rating.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete Record
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ));
            })()}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

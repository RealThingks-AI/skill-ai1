import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { dateFormatters } from "@/utils/formatters";
import type { TechLeadStats, TechLeadRating } from "../hooks/useTechLeadStats";
import { RatingDetailModal } from "./RatingDetailModal";
interface TechLeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  techLead: TechLeadStats;
}
export const TechLeadDetailModal = ({
  open,
  onOpenChange,
  techLead
}: TechLeadDetailModalProps) => {
  const [selectedRating, setSelectedRating] = useState<TechLeadRating | null>(null);
  const [ratingDetailOpen, setRatingDetailOpen] = useState(false);

  // Group ratings by employee
  const ratingsByEmployee = techLead.ratings.reduce((acc, rating) => {
    const employeeId = rating.user_id;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employeeId,
        employeeName: rating.employee?.full_name || 'Unknown',
        employeeEmail: rating.employee?.email || '',
        ratings: [],
        approvedCount: 0,
        rejectedCount: 0
      };
    }
    acc[employeeId].ratings.push(rating);
    if (rating.status === 'approved') {
      acc[employeeId].approvedCount++;
    } else {
      acc[employeeId].rejectedCount++;
    }
    return acc;
  }, {} as Record<string, {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    ratings: TechLeadRating[];
    approvedCount: number;
    rejectedCount: number;
  }>);
  const employees = Object.values(ratingsByEmployee).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
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
    return status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };
  const handleRatingClick = (rating: TechLeadRating) => {
    setSelectedRating(rating);
    setRatingDetailOpen(true);
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[min(1024px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {techLead.techLeadName}'s Reviews
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {techLead.approvedCount} approved, {techLead.rejectedCount} rejected
            </p>
          </DialogHeader>

          <ScrollArea className="h-[calc(85vh-120px)]">
            <div className="space-y-3 pr-4">
              {employees.map(employee => <Collapsible key={employee.employeeId} className="border rounded-lg">
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-sm text-left">{employee.employeeName}</h3>
                        
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {employee.approvedCount} approved
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                        {employee.rejectedCount} rejected
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-3 space-y-2">
                      {employee.ratings.map(rating => {
                    const skillName = rating.skill?.name || '';
                    const subskillName = rating.subskill?.name || skillName;
                    const displayName = rating.subskill ? `${skillName} - ${subskillName}` : skillName;
                    return <div key={rating.id} className="p-3 bg-background border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleRatingClick(rating)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{displayName}</span>
                                <Badge className={getRatingColor(rating.rating)}>
                                  {rating.rating.toUpperCase()}
                                </Badge>
                                <Badge className={getStatusColor(rating.status)}>
                                  {rating.status.toUpperCase()}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {dateFormatters.formatDate(rating.approved_at)}
                              </span>
                            </div>
                          </div>;
                  })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedRating && <RatingDetailModal open={ratingDetailOpen} onOpenChange={setRatingDetailOpen} rating={selectedRating} techLeadName={techLead.techLeadName} />}
    </>;
};
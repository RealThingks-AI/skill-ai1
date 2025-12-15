import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { dateFormatters } from "@/utils/formatters";
import type { TechLeadRating } from "../hooks/useTechLeadStats";
interface RatingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rating: TechLeadRating;
  techLeadName: string;
}
export const RatingDetailModal = ({
  open,
  onOpenChange,
  rating,
  techLeadName
}: RatingDetailModalProps) => {
  const skillName = rating.skill?.name || '';
  const subskillName = rating.subskill?.name || skillName;
  const displayName = rating.subskill ? `${skillName} - ${subskillName}` : skillName;
  const categoryName = rating.skill?.skill_categories?.name || 'Uncategorized';
  const getRatingColor = (ratingValue: string) => {
    switch (ratingValue) {
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Rating Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Employee</h3>
            <div>
              <p className="font-semibold">{rating.employee?.full_name || 'Unknown'}</p>
              
            </div>
          </div>

          {/* Skill Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Skill</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{displayName}</span>
              <Badge className={getRatingColor(rating.rating)}>
                {rating.rating.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(rating.status)}>
                {rating.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Category: {categoryName}</p>
          </div>

          {/* Comments */}
          {rating.self_comment && <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Employee Comment</h3>
              <p className="text-sm">{rating.self_comment}</p>
            </div>}

          {rating.approver_comment && <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Approver Comment</h3>
              <p className="text-sm text-blue-800">{rating.approver_comment}</p>
            </div>}

          {/* Approval Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Review Information</h3>
            <p className="text-sm">
              <span className="font-medium">{rating.status === "approved" ? "Approved" : "Rejected"}</span> by{" "}
              <span className="font-medium">{techLeadName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {dateFormatters.formatDateTime(rating.approved_at)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
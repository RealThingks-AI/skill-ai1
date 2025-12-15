import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { dateFormatters } from "@/utils/formatters";

interface RatingHistoryEntry {
  id: string;
  rating: 'high' | 'medium' | 'low';
  self_comment?: string;
  approver_comment?: string;
  approved_by?: string;
  approved_at?: string;
  status: string;
  archived_at: string;
  approver?: {
    full_name: string;
  };
}

interface RatingHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subskillName: string;
  history: RatingHistoryEntry[];
}

export const RatingHistoryModal = ({
  open,
  onOpenChange,
  subskillName,
  history
}: RatingHistoryModalProps) => {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'high': return 'bg-emerald-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-orange-500 text-white';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500 text-white';
      case 'submitted': return 'bg-slate-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Rating History - {subskillName}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No rating history available
              </p>
            ) : (
              history.map((entry, index) => (
                <div 
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  {/* Header with date and badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className={getRatingColor(entry.rating)}>
                        {entry.rating.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status === 'approved' ? 'Approved' : 
                         entry.status === 'submitted' ? 'Pending' :
                         entry.status === 'rejected' ? 'Rejected' : 'Draft'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dateFormatters.formatDateTime(entry.archived_at)}
                    </span>
                  </div>

                  {/* Show User Comment (self_comment) */}
                  {entry.self_comment && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Employee Comment:
                      </p>
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {entry.self_comment}
                      </p>
                    </div>
                  )}

                  {/* Show Tech Lead Comment (approver_comment) */}
                  {entry.approver_comment && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Tech Lead Comment:
                      </p>
                      <p className="text-sm bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                        {entry.approver_comment}
                      </p>
                      {entry.approved_at && entry.approver?.full_name && (
                        <p className="text-xs text-muted-foreground">
                          By {entry.approver.full_name} • {dateFormatters.formatDate(entry.approved_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

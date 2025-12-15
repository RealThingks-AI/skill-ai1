import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { dateFormatters } from "@/utils/formatters";
import { Search } from "lucide-react";

interface RatingRecord {
  id: string;
  user_id: string;
  skill_id: string;
  subskill_id?: string;
  rating: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  submitted_at?: string;
  created_at: string;
  // Joined data
  employee_name?: string;
  skill_name?: string;
  subskill_name?: string;
  category_name?: string;
  approver_name?: string;
}

interface RatingsDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  ratingType: 'high' | 'medium' | 'low' | 'pending';
  records: RatingRecord[];
}

export const RatingsDrilldownModal = ({
  open,
  onOpenChange,
  categoryName,
  ratingType,
  records
}: RatingsDrilldownModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    
    const query = searchQuery.toLowerCase();
    return records.filter(record => 
      record.employee_name?.toLowerCase().includes(query) ||
      record.skill_name?.toLowerCase().includes(query) ||
      record.subskill_name?.toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  const getRatingBadgeColor = (rating: string) => {
    switch (rating) {
      case 'high':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'low':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const title = ratingType === 'pending' 
    ? `Pending Ratings - ${categoryName}`
    : `${ratingType.charAt(0).toUpperCase() + ratingType.slice(1)} Ratings - ${categoryName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee, skill, or subskill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Records List */}
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No records found
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Employee Name */}
                        <div className="font-semibold text-foreground">
                          {record.employee_name || 'Unknown Employee'}
                        </div>

                        {/* Skill -> Subskill */}
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{record.skill_name}</span>
                          {record.subskill_name && (
                            <>
                              <span className="mx-2">→</span>
                              <span>{record.subskill_name}</span>
                            </>
                          )}
                        </div>

                        {/* Category */}
                        <div className="text-xs text-muted-foreground">
                          Category: <span className="font-medium">{record.category_name}</span>
                        </div>

                        {/* Date & Approver */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {record.status === 'approved' && record.approved_at && (
                            <div>
                              Approved: {dateFormatters.formatDate(record.approved_at)}
                            </div>
                          )}
                          {record.status === 'submitted' && record.submitted_at && (
                            <div>
                              Submitted: {dateFormatters.formatDate(record.submitted_at)}
                            </div>
                          )}
                          {record.approver_name && (
                            <div>
                              By: <span className="font-medium">{record.approver_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rating & Status Badges */}
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={getRatingBadgeColor(record.rating)}>
                          {record.rating.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusBadgeColor(record.status)}>
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { GroupedApproval } from "../hooks/useApprovals";
interface EmployeeApprovalDetailProps {
  employee: GroupedApproval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (approvalId: string, comment?: string) => void;
  onReject: (approvalId: string, comment: string) => void;
}
export const EmployeeApprovalDetail = ({
  employee,
  open,
  onOpenChange,
  onApprove,
  onReject
}: EmployeeApprovalDetailProps) => {
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  
  if (!employee) return null;

  // Debug: Log the entire employee object first
  console.log('🚀 EmployeeApprovalDetail opened for:', employee.employeeName);
  console.log('📦 Total ratings:', employee.ratings.length);
  console.log('🔎 First rating sample:', employee.ratings[0]);

  // Group ratings by their actual database category
  const ratingsByCategory = employee.ratings.reduce((acc, rating) => {
    // Debug: Log the rating structure to see what we have
    console.log('🔍 Rating structure:', {
      title: rating.title,
      skill: rating.skill,
      hasSkillCategories: !!(rating.skill as any)?.skill_categories
    });
    
    // Get the actual category name from the skill's category relationship
    const categoryName = (rating.skill as any)?.skill_categories?.name || 'Uncategorized';
    
    console.log('📁 Category for', rating.title, ':', categoryName);
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(rating);
    return acc;
  }, {} as Record<string, typeof employee.ratings>);

  console.log('📊 Final grouped categories:', Object.keys(ratingsByCategory), ratingsByCategory);

  const categoryEntries = Object.entries(ratingsByCategory).sort((a, b) => 
    a[0].localeCompare(b[0])
  );

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const handleBulkApprove = () => {
    employee.ratings.forEach(rating => {
      onApprove(rating.id);
    });
    onOpenChange(false);
  };
  const handleApprove = (ratingId: string) => {
    onApprove(ratingId, approveComment);
    setApproveComment("");
    setShowApproveDialog(null);
  };
  const handleReject = (ratingId: string) => {
    if (rejectComment.trim()) {
      onReject(ratingId, rejectComment);
      setRejectComment("");
      setShowRejectDialog(null);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(896px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Skills - {employee.employeeName}</DialogTitle>
          <DialogDescription>
            Review and approve {employee.pendingCount} pending skill rating{employee.pendingCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bulk Actions */}
          <div className="flex gap-2 p-4 bg-muted rounded-lg">
            <Button onClick={handleBulkApprove} variant="success" className="flex-1">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve All ({employee.pendingCount})
            </Button>
          </div>

          {/* Categories with Ratings */}
          <div className="space-y-3">
            {categoryEntries.map(([categoryName, ratings]) => (
              <div key={categoryName} className="border rounded-lg">
                <Collapsible
                  open={openCategories[categoryName] === true}
                  onOpenChange={() => toggleCategory(categoryName)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronDown 
                          className={`h-5 w-5 transition-transform ${
                            openCategories[categoryName] ? 'rotate-180' : ''
                          }`}
                        />
                        <h3 className="font-semibold text-lg">{categoryName}</h3>
                        <Badge variant="secondary">{ratings.length} subskill{ratings.length > 1 ? 's' : ''}</Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="space-y-3 p-4 pt-0">
                      {ratings.map(rating => {
                        // Use actual skill and subskill names from the database
                        const skillName = rating.skill?.name || '';
                        const subskillName = rating.subskill?.name || skillName;
                        const displayName = rating.subskill ? `${skillName} - ${subskillName}` : skillName;
                        
                        return (
                        <div key={rating.id} className="border rounded-lg p-4 bg-background">
                          <div className="flex items-start justify-between mb-3">
                            <div className="space-y-1 flex-1">
                              <h4 className="font-medium">{displayName}</h4>
                            </div>
                            <Badge className={getRatingColor(rating.rating)}>
                              {rating.rating.toUpperCase()}
                            </Badge>
                          </div>

                          {rating.self_comment && (
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex-1 p-2 bg-muted rounded text-sm">
                                <strong>Employee comment:</strong> {rating.self_comment}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" variant="success" onClick={() => setShowApproveDialog(rating.id)} className="px-4 py-2">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(rating.id)} className="px-4 py-2">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}

                          {!rating.self_comment && (
                            <div className="flex gap-2 mb-3">
                              <Button size="sm" variant="success" onClick={() => setShowApproveDialog(rating.id)} className="px-4 py-2">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(rating.id)} className="px-4 py-2">
                                <XCircle className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          )}

                          {/* Approve Comment Section */}
                          {showApproveDialog === rating.id && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <Label className="text-sm font-medium text-green-800">Approve Rating - Optional Comment</Label>
                              </div>
                              <div className="flex items-start gap-2">
                                <Textarea 
                                  placeholder="Add an optional comment for this approval..." 
                                  value={approveComment} 
                                  onChange={(e) => {
                                    setApproveComment(e.target.value);
                                    e.currentTarget.style.height = 'auto';
                                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                  }}
                                  rows={1}
                                  className="flex-1 text-sm min-h-[40px] resize-none overflow-hidden" 
                                />
                                 <div className="flex gap-2 shrink-0">
                                  <Button size="sm" variant="success" onClick={() => handleApprove(rating.id)}>
                                    Confirm Approval
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setShowApproveDialog(null);
                                    setApproveComment("");
                                  }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reject Dialog */}
                          {showRejectDialog === rating.id && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <Label className="text-sm font-medium text-red-800">Reject Rating - Comment Required</Label>
                              </div>
                              <div className="flex items-start gap-2">
                                <Textarea 
                                  placeholder="Please provide a detailed explanation for rejecting this rating..." 
                                  value={rejectComment} 
                                  onChange={(e) => {
                                    setRejectComment(e.target.value);
                                    e.currentTarget.style.height = 'auto';
                                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                  }}
                                  rows={1}
                                  className="flex-1 text-sm min-h-[40px] resize-none overflow-hidden" 
                                  required 
                                />
                                <div className="flex gap-2 shrink-0">
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(rating.id)} disabled={!rejectComment.trim()}>
                                    Confirm Rejection
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setShowRejectDialog(null);
                                    setRejectComment("");
                                  }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
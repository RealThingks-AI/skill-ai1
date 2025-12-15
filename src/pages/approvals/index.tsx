import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, Clock, CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useApprovals, type GroupedApproval } from "./hooks/useApprovals";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { CriteriaModal } from "@/pages/skills/components/CriteriaModal";
import { useApprovalHistory } from "./hooks/useApprovalHistory";
import { EmployeeHistoryDetail } from "./components/EmployeeHistoryDetail";
import { TechLeadStatsModal } from "./components/TechLeadStatsModal";
const Approvals = () => {
  const {
    searchTerm,
    setSearchTerm,
    pendingApprovals,
    groupedApprovals,
    loading,
    handleApproveRating,
    handleRejectRating,
    handleDeleteRating,
    refetch
  } = useApprovals();
  const {
    profile
  } = useAuth();
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [showApproveFor, setShowApproveFor] = useState<string | null>(null);
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const {
    groupedHistory,
    loading: historyLoading,
    handleDeleteHistoricalRating
  } = useApprovalHistory();
  const [techLeadStatsOpen, setTechLeadStatsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const confirmDelete = async () => {
    if (ratingToDelete) {
      if (activeTab === "pending") {
        await handleDeleteRating(ratingToDelete);
      } else {
        const success = await handleDeleteHistoricalRating(ratingToDelete);
        if (success) {
          toast.success('Rating deleted successfully');
        } else {
          toast.error('Failed to delete rating');
        }
      }
      setRatingToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Filter grouped approvals based on search term
  const filteredGroupedApprovals = groupedApprovals.filter(group => group.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || group.email.toLowerCase().includes(searchTerm.toLowerCase()));

  // Filter history based on search term and sort alphabetically
  const filteredHistory = groupedHistory.filter(group => group.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || group.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
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
  return <Tabs value={activeTab} onValueChange={setActiveTab} className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="history">Approval History</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <Users className="h-4 w-4" />
            <span className="font-medium">
              {activeTab === "pending" ? groupedApprovals.length : groupedHistory.length}
            </span>
            <span>users</span>
            <div className="h-4 w-px bg-border mx-1" />
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              {activeTab === "pending" 
                ? pendingApprovals.length 
                : groupedHistory.reduce((total, group) => total + group.totalCount, 0)}{" "}
              {activeTab === "pending" ? "ratings pending" : "ratings reviewed"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "history" && (
            <Button onClick={() => setTechLeadStatsOpen(true)}>
              Tech Lead Actions
            </Button>
          )}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setCriteriaModalOpen(true)} className="gap-2">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Content */}

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="flex-1 overflow-hidden mt-0 p-6">
          <ScrollArea className="h-full">
            {loading ? <div className="flex items-center justify-center min-h-[calc(100vh-64px-48px)]">
                <LoadingSpinner />
              </div> : filteredGroupedApprovals.length === 0 ? <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No employees match your search." : "All caught up! No pending approvals."}
                </p>
              </div> : <div className="space-y-2">
                {filteredGroupedApprovals.map(employee => <Collapsible key={employee.employeeId} open={expandedEmployeeId === employee.employeeId} onOpenChange={open => {
              setExpandedEmployeeId(open ? employee.employeeId : null);
              setShowApproveFor(null);
              setShowRejectFor(null);
              setApproveComment("");
              setRejectComment("");
            }}>
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer group">
                          <div className="grid grid-cols-5 gap-4 items-center flex-1">
                            <div className="font-medium text-sm">{employee.employeeName}</div>
                            <Badge variant="secondary" className="bg-slate-500 text-white text-xs whitespace-nowrap justify-self-center">
                              {employee.pendingCount} Rating{employee.pendingCount > 1 ? "s" : ""}
                            </Badge>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              Submitted: {employee.submitDate}
                            </div>
                            <div className="justify-self-end">
                              <Button size="sm" className="whitespace-nowrap" onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedEmployeeId(expandedEmployeeId === employee.employeeId ? null : employee.employeeId);
                        }}>
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="border-t bg-muted/20">
                        <div className="p-4 space-y-3">
                          {/* Group ratings by category */}
                          {(() => {
                      // Group ratings by their skill's category
                      const ratingsByCategory = employee.ratings.reduce((acc, rating) => {
                        const categoryName = (rating.skill as any)?.skill_categories?.name || 'Uncategorized';
                        if (!acc[categoryName]) {
                          acc[categoryName] = [];
                        }
                        acc[categoryName].push(rating);
                        return acc;
                      }, {} as Record<string, typeof employee.ratings>);
                      const categoryEntries = Object.entries(ratingsByCategory).sort((a, b) => a[0].localeCompare(b[0]));
                      return categoryEntries.map(([categoryName, ratings]) => <Collapsible key={categoryName} className="border rounded-lg">
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
                              return <div key={rating.id} className="border rounded-lg p-4 bg-background">
                                          <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2 flex-1">
                                              <h4 className="font-medium text-sm">{displayName}</h4>
                                              <Badge className={getRatingColor(rating.rating)}>
                                                {rating.rating.toUpperCase()}
                                              </Badge>
                                            </div>
                                          </div>

                                          {rating.self_comment && <div className="flex items-center gap-3 mb-3">
                                              <div className="flex-1 p-2 bg-muted rounded text-sm">
                                                <strong>Employee comment:</strong> {rating.self_comment}
                                              </div>
                                              <div className="flex gap-2 shrink-0">
                                                <Button size="sm" variant="success" onClick={() => {
                                      setShowRejectFor(null);
                                      setShowApproveFor(showApproveFor === rating.id ? null : rating.id);
                                    }} className="px-4 py-2">
                                                  <CheckCircle className="mr-1 h-3 w-3" />
                                                  Approve
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => {
                                      setShowApproveFor(null);
                                      setShowRejectFor(showRejectFor === rating.id ? null : rating.id);
                                    }} className="px-4 py-2">
                                                  <XCircle className="mr-1 h-3 w-3" />
                                                  Reject
                                                </Button>
                                                {isAdmin && (
                                                  <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => {
                                                      setRatingToDelete(rating.id);
                                                      setDeleteDialogOpen(true);
                                                    }} 
                                                    className="px-4 py-2"
                                                  >
                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                    Delete
                                                  </Button>
                                                )}
                                              </div>
                                            </div>}

                                          {!rating.self_comment && <div className="flex gap-2 mb-3">
                                              <Button size="sm" variant="success" onClick={() => {
                                    setShowRejectFor(null);
                                    setShowApproveFor(showApproveFor === rating.id ? null : rating.id);
                                  }} className="px-4 py-2">
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                Approve
                                              </Button>
                                              <Button size="sm" variant="destructive" onClick={() => {
                                    setShowApproveFor(null);
                                    setShowRejectFor(showRejectFor === rating.id ? null : rating.id);
                                  }} className="px-4 py-2">
                                                <XCircle className="mr-1 h-3 w-3" />
                                                Reject
                                              </Button>
                                              {isAdmin && (
                                                <Button 
                                                  size="sm" 
                                                  variant="outline" 
                                                  onClick={() => {
                                                    setRatingToDelete(rating.id);
                                                    setDeleteDialogOpen(true);
                                                  }} 
                                                  className="px-4 py-2"
                                                >
                                                  <Trash2 className="mr-1 h-3 w-3" />
                                                  Delete
                                                </Button>
                                              )}
                                            </div>}

                                          {/* Approve Comment Section */}
                                          {showApproveFor === rating.id && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                              <div className="flex items-center gap-2 mb-3">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <Label className="text-sm font-medium text-green-800">
                                                  Approve Rating - Optional Comment
                                                </Label>
                                              </div>
                                              <div className="flex items-start gap-2">
                                                <Textarea placeholder="Add an optional comment for this approval..." value={approveComment} onChange={e => {
                                      setApproveComment(e.target.value);
                                      e.currentTarget.style.height = "auto";
                                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                    }} rows={1} className="flex-1 text-sm min-h-[40px] resize-none overflow-hidden" />
                                                <div className="flex gap-2 shrink-0">
                                                  <Button size="sm" onClick={async () => {
                                        await handleApproveRating(rating.id, approveComment);
                                        setApproveComment("");
                                        setShowApproveFor(null);
                                      }} variant="success">
                                                    Confirm Approval
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => {
                                        setShowApproveFor(null);
                                        setApproveComment("");
                                      }}>
                                                    Cancel
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>}

                                          {/* Reject Comment Section */}
                                          {showRejectFor === rating.id && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                                              <div className="flex items-center gap-2 mb-3">
                                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                                <Label className="text-sm font-medium text-red-800">
                                                  Reject Rating - Comment Required
                                                </Label>
                                              </div>
                                              <div className="flex items-start gap-2">
                                                <Textarea placeholder="Please provide a detailed explanation for rejecting this rating..." value={rejectComment} onChange={e => {
                                      setRejectComment(e.target.value);
                                      e.currentTarget.style.height = "auto";
                                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                    }} rows={1} className="flex-1 text-sm min-h-[40px] resize-none overflow-hidden" required />
                                                <div className="flex gap-2 shrink-0">
                                                  <Button size="sm" variant="destructive" onClick={async () => {
                                        if (!rejectComment.trim()) return;
                                        await handleRejectRating(rating.id, rejectComment);
                                        setRejectComment("");
                                        setShowRejectFor(null);
                                      }} disabled={!rejectComment.trim()}>
                                                    Confirm Rejection
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => {
                                        setShowRejectFor(null);
                                        setRejectComment("");
                                      }}>
                                                    Cancel
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>}
                                        </div>;
                            })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>);
                    })()}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>)}
              </div>}
          </ScrollArea>
        </TabsContent>

        {/* Approval History Tab */}
        <TabsContent value="history" className="flex-1 overflow-hidden mt-0 p-6">
          <ScrollArea className="h-full">
            {historyLoading ? <div className="flex items-center justify-center min-h-[calc(100vh-64px-48px)]">
                <LoadingSpinner />
              </div> : filteredHistory.length === 0 ? <div className="text-center py-12">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No history matches your search." : "No approval history yet."}
                </p>
              </div> : <div className="space-y-2">
                {filteredHistory.map(employee => <EmployeeHistoryDetail key={employee.userId} employee={employee} isExpanded={expandedHistoryId === employee.userId} onToggle={() => setExpandedHistoryId(prev => prev === employee.userId ? null : employee.userId)} isAdmin={isAdmin} onDelete={(ratingId) => {
                    setRatingToDelete(ratingId);
                    setDeleteDialogOpen(true);
                  }} />)}
              </div>}
          </ScrollArea>
        </TabsContent>

      {/* Skill Rating Criteria Modal */}
      <CriteriaModal open={criteriaModalOpen} onOpenChange={setCriteriaModalOpen} />
      
      {/* Tech Lead Stats Modal */}
      <TechLeadStatsModal open={techLeadStatsOpen} onOpenChange={setTechLeadStatsOpen} />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rating</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRatingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>;
};
export default Approvals;
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";
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
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useTechLeadStats, type TechLeadStats } from "../hooks/useTechLeadStats";
import { TechLeadDetailModal } from "./TechLeadDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
interface TechLeadStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const TechLeadStatsModal = ({
  open,
  onOpenChange
}: TechLeadStatsModalProps) => {
  const {
    techLeadStats,
    loading,
    refetch
  } = useTechLeadStats();
  const { profile } = useAuth();
  const [selectedTechLead, setSelectedTechLead] = useState<TechLeadStats | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techLeadToDelete, setTechLeadToDelete] = useState<TechLeadStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const handleTechLeadClick = (techLead: TechLeadStats) => {
    setSelectedTechLead(techLead);
    setDetailModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, techLead: TechLeadStats) => {
    e.stopPropagation();
    setTechLeadToDelete(techLead);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!techLeadToDelete) return;

    try {
      setDeleting(true);
      
      // Delete all ratings approved/rejected by this tech lead
      const { error } = await supabase
        .from('employee_ratings')
        .delete()
        .eq('approved_by', techLeadToDelete.techLeadId);

      if (error) {
        console.error('Error deleting tech lead ratings:', error);
        toast.error('Failed to delete ratings');
        return;
      }

      toast.success(`Deleted ${techLeadToDelete.totalReviews} ratings by ${techLeadToDelete.techLeadName}`);
      
      // Refresh the data silently in background
      refetch(false);
      
      setDeleteDialogOpen(false);
      setTechLeadToDelete(null);
    } catch (error) {
      console.error('Error deleting ratings:', error);
      toast.error('Failed to delete ratings');
    } finally {
      setDeleting(false);
    }
  };
  return <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tech Lead Ratings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {techLeadToDelete?.totalReviews} ratings reviewed by{" "}
              <span className="font-semibold">{techLeadToDelete?.techLeadName}</span>?
              <br />
              <br />
              This will permanently remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{techLeadToDelete?.approvedCount} approved ratings</li>
                <li>{techLeadToDelete?.rejectedCount} rejected ratings</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete All Ratings'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[min(768px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Tech Lead Actions</DialogTitle>
          </DialogHeader>

          {loading ? <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div> : techLeadStats.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              No tech lead actions found
            </div> : <ScrollArea className="h-[calc(85vh-120px)]">
              <div className="space-y-3 pr-4">
                {techLeadStats.map(techLead => <div key={techLead.techLeadId} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleTechLeadClick(techLead)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-base">{techLead.techLeadName}</h3>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {techLead.totalReviews} Total Reviews
                          </Badge>
                        </div>
                        
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">{techLead.approvedCount} Approved</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">{techLead.rejectedCount} Rejected</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleTechLeadClick(techLead);
                        }}>
                          View Details
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => handleDeleteClick(e, techLead)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>)}
              </div>
            </ScrollArea>}
        </DialogContent>
      </Dialog>

      {selectedTechLead && <TechLeadDetailModal open={detailModalOpen} onOpenChange={setDetailModalOpen} techLead={selectedTechLead} />}
    </>;
};
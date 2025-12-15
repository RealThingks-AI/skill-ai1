import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, User, Filter, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { dateFormatters } from "@/utils/formatters";

interface ApprovedRating {
  id: string;
  skill_name: string;
  subskill_name?: string;
  rating: 'high' | 'medium' | 'low';
  approved_at: string;
  approver_comment?: string;
  approved_by?: string;
  approver_name?: string;
}

interface ApprovedRatingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
}

export const ApprovedRatingsModal = ({ isOpen, onClose, categoryId, categoryName }: ApprovedRatingsModalProps) => {
  const [ratings, setRatings] = useState<ApprovedRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const { profile } = useAuth();
  const { toast } = useToast();

  const getRatingColor = (rating: 'high' | 'medium' | 'low') => {
    switch (rating) {
      case 'high': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRatingIcon = (rating: 'high' | 'medium' | 'low') => {
    switch (rating) {
      case 'high': return <TrendingUp className="h-3 w-3 text-emerald-600" />;
      case 'medium': return <Minus className="h-3 w-3 text-amber-600" />;
      case 'low': return <TrendingDown className="h-3 w-3 text-slate-600" />;
    }
  };

  const fetchApprovedRatings = async () => {
    if (!profile?.user_id || !categoryId) return;

    try {
      setLoading(true);

      // Fetch approved ratings for this category
      const { data: ratingsData, error } = await supabase
        .from('employee_ratings')
        .select(`
          id,
          rating,
          approved_at,
          approver_comment,
          approved_by,
          skill_id,
          subskill_id,
          skills!inner(name, category_id),
          subskills(name)
        `)
        .eq('user_id', profile.user_id)
        .eq('status', 'approved')
        .eq('skills.category_id', categoryId)
        .order('approved_at', { ascending: false });

      if (error) throw error;

      // Fetch approver names separately if needed
      const approverIds = [...new Set(ratingsData?.map(r => r.approved_by).filter(Boolean))];
      const { data: approversData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', approverIds);

      const formattedRatings: ApprovedRating[] = ratingsData?.map(rating => ({
        id: rating.id,
        skill_name: rating.skills?.name || '',
        subskill_name: rating.subskills?.name,
        rating: rating.rating as 'high' | 'medium' | 'low',
        approved_at: rating.approved_at,
        approver_comment: rating.approver_comment,
        approved_by: rating.approved_by,
        approver_name: approversData?.find(a => a.user_id === rating.approved_by)?.full_name
      })) || [];

      setRatings(formattedRatings);
    } catch (error) {
      console.error('Error fetching approved ratings:', error);
      toast({
        title: "Error",
        description: "Failed to load approved ratings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && categoryId) {
      fetchApprovedRatings();
    }
  }, [isOpen, categoryId]);

  const filteredRatings = activeFilter === 'all' 
    ? ratings 
    : ratings.filter(rating => rating.rating === activeFilter);

  const ratingCounts = {
    all: ratings.length,
    high: ratings.filter(r => r.rating === 'high').length,
    medium: ratings.filter(r => r.rating === 'medium').length,
    low: ratings.filter(r => r.rating === 'low').length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(896px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            {categoryName} - Approved Ratings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter Tabs */}
          <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                All ({ratingCounts.all})
              </TabsTrigger>
              <TabsTrigger value="high" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> High ({ratingCounts.high})
              </TabsTrigger>
              <TabsTrigger value="medium" className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-amber-600" /> Medium ({ratingCounts.medium})
              </TabsTrigger>
              <TabsTrigger value="low" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-slate-600" /> Low ({ratingCounts.low})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading ratings...</p>
                  </div>
                ) : filteredRatings.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {activeFilter === 'all' 
                        ? 'No approved ratings found for this category' 
                        : `No ${activeFilter} ratings found`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRatings.map((rating) => (
                      <div key={rating.id} className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">
                              {rating.skill_name}
                              {rating.subskill_name && (
                                <span className="text-muted-foreground font-normal">
                                  {' → '}{rating.subskill_name}
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge 
                                variant="outline" 
                                className={`${getRatingColor(rating.rating)} font-medium`}
                              >
                                {getRatingIcon(rating.rating)} {rating.rating.charAt(0).toUpperCase() + rating.rating.slice(1)}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {dateFormatters.formatDate(rating.approved_at)}
                              </div>
                              {rating.approver_name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  Approved by {rating.approver_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {rating.approver_comment && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              <strong>Approver note:</strong> {rating.approver_comment}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
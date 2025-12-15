import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { RatingPill } from "@/components/common/RatingPill";
import { canUpgradeRating, getAvailableRatingOptions } from "@/pages/skills/utils/skillHelpers";
import { RatingHistoryModal } from "./RatingHistoryModal";
import { supabase } from "@/integrations/supabase/client";
import type { Subskill, EmployeeRating } from "@/types/database";

interface Profile {
  full_name: string;
}

interface InlineSubskillRatingProps {
  subskill: Subskill;
  userSkills: EmployeeRating[];
  pendingRatings: Map<string, { type: 'skill' | 'subskill', id: string, rating: 'high' | 'medium' | 'low' }>;
  onSubskillRate: (subskillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onCommentChange: (subskillId: string, comment: string) => void;
  comment: string;
}

export const InlineSubskillRating = ({
  subskill,
  userSkills,
  pendingRatings,
  onSubskillRate,
  onCommentChange,
  comment
}: InlineSubskillRatingProps) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [approverName, setApproverName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // Check if history should be shown based on current rating having both comments
  useEffect(() => {
    const checkHistoryAndFetchNames = async () => {
      const userSkillEntry = userSkills.find(us => us.subskill_id === subskill.id);
      
      console.log('🔍 History check starting for subskill:', subskill.name, {
        subskillId: subskill.id,
        userSkillEntry: !!userSkillEntry,
        userId: userSkillEntry?.user_id,
        hasSelfComment: !!userSkillEntry?.self_comment,
        hasApproverComment: !!userSkillEntry?.approver_comment
      });
      
      if (!userSkillEntry?.user_id) {
        console.log('⚠️ No user skill entry found for:', subskill.name);
        return;
      }

      // Show history icon ONLY if BOTH self_comment AND approver_comment exist
      // This means there's a conversation between user and tech lead
      const hasBothComments = !!(userSkillEntry.self_comment && userSkillEntry.approver_comment);
      setHasHistory(hasBothComments);
      console.log('📌 History visibility decision for', subskill.name, {
        selfComment: userSkillEntry.self_comment,
        approverComment: userSkillEntry.approver_comment,
        shouldShow: hasBothComments
      });

      // Fetch user name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userSkillEntry.user_id)
        .single();
      
      if (userProfile) {
        setUserName(userProfile.full_name);
      }

      // Fetch approver name if exists
      if (userSkillEntry.approved_by) {
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', userSkillEntry.approved_by)
          .single();
        
        if (approverProfile) {
          setApproverName(approverProfile.full_name);
        }
      }
    };

    checkHistoryAndFetchNames();
  }, [subskill.id, userSkills]);

  // Fetch history when modal opens - fetch ALL historical entries
  const fetchHistory = async () => {
    const userSkillEntry = userSkills.find(us => us.subskill_id === subskill.id);
    if (!userSkillEntry?.user_id) return;

    // Fetch ALL archived history from subskill_rating_history table (without join)
    const { data: archivedHistory, error } = await supabase
      .from('subskill_rating_history')
      .select('*')
      .eq('user_id', userSkillEntry.user_id)
      .eq('subskill_id', subskill.id)
      .order('archived_at', { ascending: false });

    if (error) {
      console.error('Error fetching rating history:', error);
      return;
    }

    console.log('📜 Fetched archived history for', subskill.name, ':', archivedHistory?.length || 0, 'entries');

    const historyEntries = [];

    // Add all archived history entries and fetch approver names
    if (archivedHistory && archivedHistory.length > 0) {
      // Fetch all unique approver names
      const approverIds = [...new Set(archivedHistory.map(e => e.approved_by).filter(Boolean))];
      const approverMap = new Map();
      
      if (approverIds.length > 0) {
        const { data: approvers } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', approverIds);
        
        if (approvers) {
          approvers.forEach(a => approverMap.set(a.user_id, a.full_name));
        }
      }

      historyEntries.push(...archivedHistory.map(entry => ({
        id: entry.id,
        rating: entry.rating,
        self_comment: entry.self_comment,
        approver_comment: entry.approver_comment,
        approved_by: entry.approved_by,
        approved_at: entry.approved_at,
        status: entry.status,
        archived_at: entry.archived_at,
        approver: entry.approved_by ? { full_name: approverMap.get(entry.approved_by) || 'Unknown' } : null
      })));
    }

    // Also add current rating if it has comments (as the most recent entry)
    const currentHasComments = userSkillEntry.self_comment || userSkillEntry.approver_comment;
    if (currentHasComments) {
      // Add current rating as a single consolidated entry (not split into user/approver)
      historyEntries.unshift({
        id: `${userSkillEntry.id}-current`,
        rating: userSkillEntry.rating,
        self_comment: userSkillEntry.self_comment,
        approver_comment: userSkillEntry.approver_comment,
        approved_by: userSkillEntry.approved_by,
        approved_at: userSkillEntry.approved_at,
        status: userSkillEntry.status,
        archived_at: userSkillEntry.approved_at || userSkillEntry.submitted_at || userSkillEntry.updated_at,
        approver: userSkillEntry.approved_by ? { full_name: approverName } : null
      });
    }

    console.log('📜 Complete rating history for', subskill.name, ':', historyEntries.length, 'entries');
    setHistory(historyEntries);
  };

  const handleHistoryClick = () => {
    fetchHistory();
    setHistoryOpen(true);
  };

  // Get current rating from pending ratings or saved ratings
  const getCurrentRating = () => {
    const pending = pendingRatings.get(subskill.id);
    if (pending && pending.type === 'subskill') return pending.rating;
    return userSkills.find(us => us.subskill_id === subskill.id)?.rating as 'high' | 'medium' | 'low' | null;
  };
  
  const userSkillRating = getCurrentRating();
  const userSkillEntry = userSkills.find(us => us.subskill_id === subskill.id);
  const userSkillStatus = userSkillEntry?.status;
  const approvedComment = userSkillEntry?.approver_comment;
  const nextUpgradeDate = userSkillEntry?.next_upgrade_date;
  
  // Check progression rules
  const upgradeCheck = canUpgradeRating(userSkillRating, 'high', userSkillStatus || 'draft', nextUpgradeDate);
  const availableRatings = getAvailableRatingOptions(userSkillRating, userSkillStatus || 'draft', nextUpgradeDate);
  
  // Allow editing for all statuses including pending (users can update their submissions)
  // Only approved ratings are locked (handled by progression rules)
  const isDisabled = false;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500 text-white border-emerald-500';
      case 'submitted':
        return 'bg-slate-500 text-white border-slate-500';
      case 'rejected':
        return 'bg-red-500 text-white border-red-500';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'submitted':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Draft';
    }
  };

  // Determine which comment to display
  const getDisplayComment = () => {
    const approvedAtTs = userSkillEntry?.approved_at ? new Date(userSkillEntry.approved_at as any).getTime() : 0;
    const submittedAtTs = userSkillEntry?.submitted_at ? new Date(userSkillEntry.submitted_at as any).getTime() : 0;
    const latestIsApprover = approvedAtTs >= submittedAtTs && !!approvedComment;

    if (latestIsApprover && approverName && approvedComment) {
      return `Tech Lead (${approverName}): ${approvedComment}`;
    }
    if ((userSkillEntry?.self_comment || comment) && userName) {
      return `${userName}: ${userSkillEntry?.self_comment || comment}`;
    }
    return comment || userSkillEntry?.self_comment || '';
  };

  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4 p-3 border rounded-lg bg-card/50">
        {/* Col 1: Subskill Name and Description */}
        <div className="col-span-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {subskill.name}
            </h5>
            {userSkillStatus && (
              <Badge variant="secondary" className={`text-xs ${getStatusColor(userSkillStatus)}`}>
                {getStatusLabel(userSkillStatus)}
              </Badge>
            )}
          </div>
          {subskill.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {subskill.description}
            </p>
          )}
        </div>

        {/* Col 2: Rating Pills aligned beneath subskills count */}
        <div className="col-span-1 flex items-center justify-center">
          <RatingPill
            rating={userSkillRating}
            onRatingChange={(rating) => {
              // Allow deselecting (rating = null)
              if (rating === null) {
                onSubskillRate(subskill.id, null);
                return;
              }
              
              const upgradeCheck = canUpgradeRating(userSkillRating, rating, userSkillStatus || 'draft', nextUpgradeDate);
              if (upgradeCheck.canUpgrade) {
                onSubskillRate(subskill.id, rating);
              }
            }}
            disabled={isDisabled}
            availableRatings={availableRatings}
            className="justify-center gap-2"
          />
        </div>

        {/* Col 3-4: Comment textarea with auto-grow and history icon */}
        <div className="col-span-2 relative">
          <Textarea
            placeholder={getDisplayComment() || "Add your comment..."}
            value={comment}
            onChange={(e) => {
              onCommentChange(subskill.id, e.target.value);
              // Auto-grow
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
            }}
            disabled={false}
            rows={1}
            className="w-full text-sm min-h-[36px] resize-y overflow-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 pr-10"
          />
          {hasHistory && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleHistoryClick}
              className="absolute right-2 top-2 h-6 w-6 p-0 z-20"
              title="View rating history"
            >
              <History className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
      </div>

      <RatingHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        subskillName={subskill.name}
        history={history}
      />
    </>
  );
};
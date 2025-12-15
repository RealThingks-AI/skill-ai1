import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/utils/supabasePagination";
import { useToast } from "@/hooks/use-toast";
import { meetsRatingCriteria } from "../utils/skillExplorerHelpers";

interface UserResult {
  user_id: string;
  full_name: string;
  role: string;
  matching_count: number;
  total_skills: number;
  approved_skills: {
    skill: string;
    subskill: string;
    rating: string;
  }[];
  last_updated: string;
  available_capacity: number;
  current_total_allocation: number;
}

export const useSkillExplorerResults = (
  hasAccess: boolean,
  pendingSelections: Array<{
    id: string;
    subskill_id: string;
    skill_id: string;
    rating: "low" | "medium" | "high";
  }>
) => {
  const { toast } = useToast();
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  const loadResults = async () => {
    if (pendingSelections.length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const selectedSubskillIds = pendingSelections.map((sel) => sel.subskill_id);
      const selectedSkillIds = pendingSelections.map((sel) => sel.skill_id);

      // Fetch ratings in batches to avoid 1000 row limit
      let ratingsData: any[] = [];
      let hasMore = true;
      let offset = 0;
      const batchSize = 1000;

      while (hasMore) {
        const { data: batch, error: ratingsError } = await supabase
          .from("employee_ratings")
          .select(
            `
            user_id,
            rating,
            approved_at,
            subskill_id,
            skill_id,
            skills!inner(name),
            subskills(name)
          `
          )
          .eq("status", "approved")
          .or(
            `subskill_id.in.(${selectedSubskillIds.join(",")}),and(subskill_id.is.null,skill_id.in.(${selectedSkillIds.join(",")}))`
          )
          .range(offset, offset + batchSize - 1);

        if (ratingsError) throw ratingsError;

        if (batch && batch.length > 0) {
          ratingsData = [...ratingsData, ...batch];
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      if (!ratingsData || ratingsData.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(ratingsData.map((r: any) => r.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .in("user_id", userIds);
      
      if (profilesError) throw profilesError;

      // Fetch project allocations for these users
      const { data: allocationsData, error: allocationsError } = await supabase
        .from("project_assignments")
        .select("user_id, allocation_percentage")
        .in("user_id", userIds);
      
      if (allocationsError) throw allocationsError;

      // Calculate total allocation per user
      const allocationMap = new Map<string, number>();
      (allocationsData || []).forEach((allocation) => {
        const current = allocationMap.get(allocation.user_id) || 0;
        allocationMap.set(allocation.user_id, current + allocation.allocation_percentage);
      });
      
      const profileMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
      const userMap = new Map<string, UserResult>();

      ratingsData.forEach((rating: any) => {
        const userId = rating.user_id;
        const profile = profileMap.get(userId);
        if (!profile) return;

        const matchingSelection = pendingSelections.find((sel) => {
          if (rating.subskill_id) {
            return sel.subskill_id === rating.subskill_id && meetsRatingCriteria(rating.rating, sel.rating);
          }
          return sel.skill_id === rating.skill_id && meetsRatingCriteria(rating.rating, sel.rating);
        });

        if (!matchingSelection) return;

        if (!userMap.has(userId)) {
          const totalAllocation = allocationMap.get(userId) || 0;
          const availableCapacity = Math.max(0, 100 - totalAllocation);
          
          userMap.set(userId, {
            user_id: userId,
            full_name: profile.full_name,
            role: profile.role,
            matching_count: 0,
            total_skills: pendingSelections.length,
            approved_skills: [],
            last_updated: rating.approved_at,
            available_capacity: availableCapacity,
            current_total_allocation: totalAllocation,
          });
        }
        
        const user = userMap.get(userId)!;
        user.matching_count++;
        user.approved_skills.push({
          skill: rating.skills.name,
          subskill: rating.subskills?.name || rating.skills.name,
          rating: rating.rating,
        });
        
        if (rating.approved_at > user.last_updated) {
          user.last_updated = rating.approved_at;
        }
      });

      // Sort by available capacity (highest first)
      const sortedResults = Array.from(userMap.values()).sort((a, b) => 
        b.available_capacity - a.available_capacity
      );
      
      setResults(sortedResults);
    } catch (error) {
      console.error("Error loading results:", error);
      toast({
        title: "Error",
        description: "Failed to load results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadResults();
    }
  }, [hasAccess, pendingSelections]);

  return { results, loading, loadResults };
};
